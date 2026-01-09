import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface BatchWithDetails {
  id: string;
  name: string;
  batchSize: number;
  subjects: {
    subject: {
      id: string;
      name: string;
      code: string;
      weeklyClassesRequired: number;
      fixedSlot: any;
      faculties: {
        faculty: {
          id: string;
          name: string;
          maxClassesPerDay: number;
          weeklyLoadLimit: number;
          availability: {
            dayOfWeek: number;
            startTime: string;
            endTime: string;
          }[];
        };
      }[];
    };
  }[];
}

interface ClassroomWithAvailability {
  id: string;
  roomId: string;
  capacity: number;
  type: string;
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

interface TimetableEntry {
  batchId: string;
  subjectId: string;
  facultyId: string;
  classroomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ConstraintViolation {
  type: string;
  message: string;
  details?: any;
}

export class TimetableGenerator {
  private timeSlots: TimeSlot[] = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:15', endTime: '12:15' },
    { startTime: '12:15', endTime: '13:15' },
    { startTime: '14:00', endTime: '15:00' },
    { startTime: '15:00', endTime: '16:00' },
    { startTime: '16:15', endTime: '17:15' },
  ];

  private workingDays = [0, 1, 2, 3, 4]; // Monday to Friday
  private constraintViolations: ConstraintViolation[] = [];
  private readonly SEMESTER_DURATION_WEEKS = 16; // Standard semester duration
  private readonly MIN_FREE_PERIODS_PER_WEEK = 2; // Minimum free periods per week for students

  getConstraintViolations(): ConstraintViolation[] {
    return this.constraintViolations;
  }

  async generate(
    batches: BatchWithDetails[],
    classrooms: ClassroomWithAvailability[],
    semester: number,
    name: string
  ): Promise<any[]> {
    this.constraintViolations = [];
    const timetables: any[] = [];

    // Try to generate 3 different timetable options
    for (let attempt = 0; attempt < 3; attempt++) {
      const entries: TimetableEntry[] = [];
      const schedule = this.initializeSchedule();

      let success = true;

      // Shuffle batches and subjects for variety
      const shuffledBatches = this.shuffle([...batches]);

      for (const batch of shuffledBatches) {
        // Track weekly hours for each subject
        const subjectHoursScheduled = new Map<string, number>();

        for (const batchSubject of batch.subjects) {
          const subject = batchSubject.subject;
          
          // Validate course can be completed within semester duration
          const totalHoursNeeded = subject.totalHoursRequired || (subject.weeklyClassesRequired * this.SEMESTER_DURATION_WEEKS);
          const maxWeeklyHours = subject.weeklyClassesRequired;
          
          if (maxWeeklyHours * this.SEMESTER_DURATION_WEEKS < totalHoursNeeded) {
            this.constraintViolations.push({
              type: 'DURATION_INSUFFICIENT',
              message: `${subject.name} cannot be completed within semester duration`,
              details: {
                subject: subject.name,
                totalHoursNeeded,
                maxPossibleHours: maxWeeklyHours * this.SEMESTER_DURATION_WEEKS,
                semesterWeeks: this.SEMESTER_DURATION_WEEKS,
              },
            });
          }

          const classesScheduled = this.scheduleSubject(
            batch,
            subject,
            classrooms,
            schedule,
            entries
          );

          subjectHoursScheduled.set(subject.id, classesScheduled);

          if (classesScheduled < subject.weeklyClassesRequired) {
            this.constraintViolations.push({
              type: 'INSUFFICIENT_SLOTS',
              message: `Could not schedule all classes for ${subject.name}`,
              details: {
                batch: batch.name,
                subject: subject.name,
                required: subject.weeklyClassesRequired,
                scheduled: classesScheduled,
              },
            });
            success = false;
          }
        }

        // Ensure minimum free periods for students
        const batchWeeklyClasses = entries.filter(e => e.batchId === batch.id).length;
        const maxPossibleSlots = this.timeSlots.length * this.workingDays.length;
        const freePeriods = maxPossibleSlots - batchWeeklyClasses;
        
        if (freePeriods < this.MIN_FREE_PERIODS_PER_WEEK) {
          this.constraintViolations.push({
            type: 'INSUFFICIENT_FREE_PERIODS',
            message: `Batch ${batch.name} has insufficient free periods`,
            details: {
              batch: batch.name,
              freePeriods,
              minimumRequired: this.MIN_FREE_PERIODS_PER_WEEK,
            },
          });
        }
      }

      if (success || entries.length > 0) {
        const score = this.calculateScore(entries, batches, classrooms);

        // Save to database
        const timetable = await prisma.timetable.create({
          data: {
            name: `${name} - Option ${attempt + 1}`,
            semester,
            status: 'DRAFT',
            score,
            metadata: {
              generatedAt: new Date().toISOString(),
              constraintsViolated: this.constraintViolations.length,
              totalEntries: entries.length,
            },
            entries: {
              create: entries,
            },
          },
          include: {
            entries: {
              include: {
                batch: true,
                subject: true,
                faculty: true,
                classroom: true,
              },
            },
          },
        });

        timetables.push(timetable);
      }
    }

    // Sort by score (highest first)
    return timetables.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private scheduleSubject(
    batch: BatchWithDetails,
    subject: any,
    classrooms: ClassroomWithAvailability[],
    schedule: Map<string, Set<string>>,
    entries: TimetableEntry[]
  ): number {
    let classesScheduled = 0;

    // Handle fixed slot first
    if (subject.fixedSlot) {
      const fixed = subject.fixedSlot as any;
      const faculty = this.selectFaculty(subject.faculties, fixed.dayOfWeek, fixed.startTime);
      const classroom = this.findAvailableClassroom(
        classrooms,
        batch.batchSize,
        fixed.dayOfWeek,
        fixed.startTime,
        schedule
      );

      if (faculty && classroom) {
        const entry: TimetableEntry = {
          batchId: batch.id,
          subjectId: subject.id,
          facultyId: faculty.id,
          classroomId: classroom.id,
          dayOfWeek: fixed.dayOfWeek,
          startTime: fixed.startTime,
          endTime: fixed.endTime,
        };

        if (this.isValidEntry(entry, schedule)) {
          entries.push(entry);
          this.updateSchedule(schedule, entry);
          classesScheduled++;
        }
      }
    }

    // Schedule remaining classes
    const remainingClasses = subject.weeklyClassesRequired - classesScheduled;

    for (let i = 0; i < remainingClasses; i++) {
      const scheduled = this.scheduleOneClass(
        batch,
        subject,
        classrooms,
        schedule,
        entries
      );

      if (scheduled) {
        classesScheduled++;
      } else {
        break;
      }
    }

    return classesScheduled;
  }

  private scheduleOneClass(
    batch: BatchWithDetails,
    subject: any,
    classrooms: ClassroomWithAvailability[],
    schedule: Map<string, Set<string>>,
    entries: TimetableEntry[]
  ): boolean {
    const attempts = this.generateAttemptOrder();

    for (const { day, slotIndex } of attempts) {
      const slot = this.timeSlots[slotIndex];
      const faculty = this.selectFaculty(subject.faculties, day, slot.startTime);

      if (!faculty) continue;

      // Check if faculty already has classes on this day
      const facultyDayClasses = entries.filter(
        (e) => e.facultyId === faculty.id && e.dayOfWeek === day
      );

      if (facultyDayClasses.length > 0) {
        // Faculty already scheduled on this day - enforce consecutive classes
        const facultyTimes = facultyDayClasses.map(e => e.startTime).sort();
        const lastTime = facultyTimes[facultyTimes.length - 1];
        const firstTime = facultyTimes[0];
        
        // Only allow scheduling if this slot is consecutive to existing slots
        const isConsecutive = this.isConsecutiveSlot(slot.startTime, firstTime, lastTime);
        if (!isConsecutive) {
          continue; // Skip this slot, faculty must have consecutive classes
        }
      }

      // Check faculty daily limit
      if (facultyDayClasses.length >= faculty.maxClassesPerDay) continue;

      const classroom = this.findAvailableClassroom(
        classrooms,
        batch.batchSize,
        day,
        slot.startTime,
        schedule
      );

      if (!classroom) continue;

      const entry: TimetableEntry = {
        batchId: batch.id,
        subjectId: subject.id,
        facultyId: faculty.id,
        classroomId: classroom.id,
        dayOfWeek: day,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };

      if (this.isValidEntry(entry, schedule)) {
        entries.push(entry);
        this.updateSchedule(schedule, entry);
        return true;
      }
    }

    return false;
  }

  private isConsecutiveSlot(newTime: string, firstExisting: string, lastExisting: string): boolean {
    // Check if new time is immediately before first or after last
    const newSlotIndex = this.timeSlots.findIndex(s => s.startTime === newTime);
    const firstSlotIndex = this.timeSlots.findIndex(s => s.startTime === firstExisting);
    const lastSlotIndex = this.timeSlots.findIndex(s => s.startTime === lastExisting);

    // Allow if it's immediately before the first slot or immediately after the last slot
    return newSlotIndex === firstSlotIndex - 1 || newSlotIndex === lastSlotIndex + 1;
  }

  private selectFaculty(
    facultyList: any[],
    dayOfWeek: number,
    startTime: string
  ): any {
    const available = facultyList.filter((fs) => {
      const faculty = fs.faculty;
      if (faculty.availability.length === 0) return true;

      return faculty.availability.some(
        (av: any) =>
          av.dayOfWeek === dayOfWeek &&
          this.isTimeInRange(startTime, av.startTime, av.endTime)
      );
    });

    if (available.length === 0) return null;

    // Randomly select for variety
    return available[Math.floor(Math.random() * available.length)].faculty;
  }

  private findAvailableClassroom(
    classrooms: ClassroomWithAvailability[],
    requiredCapacity: number,
    dayOfWeek: number,
    startTime: string,
    schedule: Map<string, Set<string>>
  ): ClassroomWithAvailability | null {
    const suitable = classrooms.filter((classroom) => {
      // Check capacity
      if (classroom.capacity < requiredCapacity) return false;

      // Check availability
      if (classroom.availability.length > 0) {
        const available = classroom.availability.some(
          (av) =>
            av.dayOfWeek === dayOfWeek &&
            this.isTimeInRange(startTime, av.startTime, av.endTime)
        );
        if (!available) return false;
      }

      // Check if classroom is free
      const key = this.getScheduleKey('classroom', classroom.id, dayOfWeek, startTime);
      return !schedule.has(key);
    });

    if (suitable.length === 0) return null;

    // Sort by capacity (prefer smaller rooms)
    suitable.sort((a, b) => a.capacity - b.capacity);

    return suitable[0];
  }

  private isValidEntry(
    entry: TimetableEntry,
    schedule: Map<string, Set<string>>
  ): boolean {
    // Check batch conflict
    const batchKey = this.getScheduleKey('batch', entry.batchId, entry.dayOfWeek, entry.startTime);
    if (schedule.has(batchKey)) return false;

    // Check faculty conflict
    const facultyKey = this.getScheduleKey('faculty', entry.facultyId, entry.dayOfWeek, entry.startTime);
    if (schedule.has(facultyKey)) return false;

    // Check classroom conflict
    const classroomKey = this.getScheduleKey('classroom', entry.classroomId, entry.dayOfWeek, entry.startTime);
    if (schedule.has(classroomKey)) return false;

    return true;
  }

  private updateSchedule(schedule: Map<string, Set<string>>, entry: TimetableEntry): void {
    const batchKey = this.getScheduleKey('batch', entry.batchId, entry.dayOfWeek, entry.startTime);
    const facultyKey = this.getScheduleKey('faculty', entry.facultyId, entry.dayOfWeek, entry.startTime);
    const classroomKey = this.getScheduleKey('classroom', entry.classroomId, entry.dayOfWeek, entry.startTime);

    schedule.set(batchKey, new Set([entry.startTime]));
    schedule.set(facultyKey, new Set([entry.startTime]));
    schedule.set(classroomKey, new Set([entry.startTime]));
  }

  private getScheduleKey(
    type: string,
    id: string,
    dayOfWeek: number,
    startTime: string
  ): string {
    return `${type}:${id}:${dayOfWeek}:${startTime}`;
  }

  private initializeSchedule(): Map<string, Set<string>> {
    return new Map();
  }

  private generateAttemptOrder(): { day: number; slotIndex: number }[] {
    const attempts: { day: number; slotIndex: number }[] = [];

    for (const day of this.workingDays) {
      for (let slotIndex = 0; slotIndex < this.timeSlots.length; slotIndex++) {
        attempts.push({ day, slotIndex });
      }
    }

    return this.shuffle(attempts);
  }

  private calculateScore(
    entries: TimetableEntry[],
    batches: BatchWithDetails[],
    classrooms: ClassroomWithAvailability[]
  ): number {
    let score = 100;

    // Penalty for constraint violations
    score -= this.constraintViolations.length * 10;

    // Check workload distribution
    const facultyWorkload = new Map<string, number[]>();
    entries.forEach((entry) => {
      if (!facultyWorkload.has(entry.facultyId)) {
        facultyWorkload.set(entry.facultyId, [0, 0, 0, 0, 0]);
      }
      const workload = facultyWorkload.get(entry.facultyId)!;
      workload[entry.dayOfWeek]++;
    });

    // Penalize uneven distribution
    facultyWorkload.forEach((workload) => {
      const avg = workload.reduce((a, b) => a + b, 0) / workload.length;
      const variance = workload.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / workload.length;
      score -= variance * 2;
    });

    // Reward high classroom utilization
    const classroomUsage = new Map<string, number>();
    entries.forEach((entry) => {
      classroomUsage.set(entry.classroomId, (classroomUsage.get(entry.classroomId) || 0) + 1);
    });

    const utilizationRate = classroomUsage.size / classrooms.length;
    score += utilizationRate * 10;

    // Check for idle time (gaps between classes)
    batches.forEach((batch) => {
      const batchEntries = entries.filter((e) => e.batchId === batch.id);
      const dayGroups = new Map<number, TimetableEntry[]>();

      batchEntries.forEach((entry) => {
        if (!dayGroups.has(entry.dayOfWeek)) {
          dayGroups.set(entry.dayOfWeek, []);
        }
        dayGroups.get(entry.dayOfWeek)!.push(entry);
      });

      dayGroups.forEach((dayEntries) => {
        dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < dayEntries.length - 1; i++) {
          const gap = this.getMinutesBetween(dayEntries[i].endTime, dayEntries[i + 1].startTime);
          if (gap > 60) {
            score -= 2; // Penalize large gaps
          }
        }
      });
    });

    return Math.max(0, score);
  }

  private isTimeInRange(time: string, start: string, end: string): boolean {
    return time >= start && time <= end;
  }

  private getMinutesBetween(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
