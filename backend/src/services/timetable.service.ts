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

  // 2-hour slots for practical sessions
  private practicalSlots: TimeSlot[] = [
    { startTime: '09:00', endTime: '11:00' },
    { startTime: '11:15', endTime: '13:15' },
    { startTime: '14:00', endTime: '16:00' },
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
        console.log(`\n=== Processing Batch: ${batch.name} ===`);
        console.log(`Subjects in batch: ${batch.subjects.length}`);
        
        // Track weekly hours for each subject
        const subjectHoursScheduled = new Map<string, number>();

        for (const batchSubject of batch.subjects) {
          const subject = batchSubject.subject;
          
          console.log(`\nProcessing Subject: ${subject.name} (${subject.code})`);
          console.log(`  Type: ${subject.type}`);
          console.log(`  Weekly Classes Required: ${subject.weeklyClassesRequired}`);
          console.log(`  Hours Per Session: ${subject.hoursPerSession}`);
          console.log(`  Faculties Assigned: ${subject.faculties.length}`);
          if (subject.faculties.length > 0) {
            console.log(`  Faculty Names: ${subject.faculties.map((f: any) => f.faculty.name).join(', ')}`);
          }
          
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

          console.log(`  Classes Scheduled: ${classesScheduled} / ${subject.weeklyClassesRequired}`);

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
    const isPractical = subject.type === 'PRACTICAL';
    const isTheoryCumPractical = subject.type === 'THEORY_CUM_PRACTICAL';

    // For THEORY_CUM_PRACTICAL, select a faculty once and use for all sessions
    let assignedFaculty = null;
    if (isTheoryCumPractical) {
      if (subject.faculties.length === 0) {
        // No faculty assigned to this subject
        this.constraintViolations.push({
          type: 'NO_FACULTY_ASSIGNED',
          message: `No faculty assigned to ${subject.name} (${subject.code})`,
          details: {
            subject: subject.name,
            code: subject.code,
            batch: batch.name,
            type: 'THEORY_CUM_PRACTICAL',
          },
        });
        return 0; // Cannot schedule without faculty
      }
      
      // Pick a faculty that has availability
      const facultyWithAvailability = subject.faculties.find((fs: any) => 
        fs.faculty.availability.length === 0 || fs.faculty.availability.length > 0
      );
      
      if (facultyWithAvailability) {
        assignedFaculty = facultyWithAvailability.faculty;
      } else {
        // If no faculty available, log constraint violation
        this.constraintViolations.push({
          type: 'NO_FACULTY_AVAILABLE',
          message: `No faculty available for ${subject.name} (${subject.code})`,
          details: {
            subject: subject.name,
            code: subject.code,
            batch: batch.name,
            type: 'THEORY_CUM_PRACTICAL',
            facultiesChecked: subject.faculties.length,
          },
        });
        return 0; // Cannot schedule without faculty
      }
    }

    // Handle fixed slot first
    if (subject.fixedSlot) {
      const fixed = subject.fixedSlot as any;
      const faculty = isTheoryCumPractical && assignedFaculty 
        ? assignedFaculty 
        : this.selectFaculty(subject.faculties, fixed.dayOfWeek, fixed.startTime);
      const classroom = this.findAvailableClassroom(
        classrooms,
        batch.batchSize,
        fixed.dayOfWeek,
        fixed.startTime,
        schedule,
        (isPractical || isTheoryCumPractical) ? 'LAB' : "CLASSROOM"
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

    // For THEORY_CUM_PRACTICAL, split into theory and practical in 1:2 ratio
    if (isTheoryCumPractical) {
      // Calculate theory and practical sessions (1:2 ratio)
      // For every 3 hours, 1 is theory (1-hour) and 2 are practical (2-hour session)
      const hoursPerSession = subject.hoursPerSession || 1;
      const totalHours = remainingClasses * hoursPerSession;
      const theoryHours = Math.floor(totalHours / 3); // 1 part theory
      const practicalHours = totalHours - theoryHours; // 2 parts practical
      
      console.log(`Scheduling ${subject.name} (${subject.code}): ${totalHours} total hours = ${theoryHours} theory + ${practicalHours} practical`);
      
      // Schedule theory sessions (1-hour slots)
      for (let i = 0; i < theoryHours; i++) {
        const scheduled = this.scheduleOneClass(
          batch,
          subject,
          classrooms,
          schedule,
          entries,
          false, // Use regular slots for theory
          assignedFaculty
        );

        if (scheduled) {
          classesScheduled++;
        } else {
          console.log(`Failed to schedule theory session ${i + 1} for ${subject.name}`);
        }
      }

      // Schedule practical sessions (2-hour slots)
      const practicalSessions = Math.ceil(practicalHours / 2); // Each practical is 2 hours
      for (let i = 0; i < practicalSessions; i++) {
        const scheduled = this.scheduleOneClass(
          batch,
          subject,
          classrooms,
          schedule,
          entries,
          true, // Use practical slots for labs
          assignedFaculty
        );

        if (scheduled) {
          classesScheduled++;
        } else {
          console.log(`Failed to schedule practical session ${i + 1} for ${subject.name}`);
        }
      }

      // Log if we couldn't schedule all classes
      if (classesScheduled < subject.weeklyClassesRequired) {
        this.constraintViolations.push({
          type: 'INCOMPLETE_THEORY_CUM_PRACTICAL',
          message: `Could not schedule all classes for ${subject.name}`,
          details: {
            subject: subject.name,
            code: subject.code,
            batch: batch.name,
            required: subject.weeklyClassesRequired,
            scheduled: classesScheduled,
            theoryHours,
            practicalHours,
            faculty: assignedFaculty?.name,
          },
        });
      }
    } else {
      // Regular scheduling for THEORY and PRACTICAL subjects
      for (let i = 0; i < remainingClasses; i++) {
        const scheduled = this.scheduleOneClass(
          batch,
          subject,
          classrooms,
          schedule,
          entries,
          isPractical,
          assignedFaculty
        );

        if (scheduled) {
          classesScheduled++;
        } else {
          break;
        }
      }
    }

    return classesScheduled;
  }

  private scheduleOneClass(
    batch: BatchWithDetails,
    subject: any,
    classrooms: ClassroomWithAvailability[],
    schedule: Map<string, Set<string>>,
    entries: TimetableEntry[],
    isPractical: boolean = false,
    assignedFaculty: any = null
  ): boolean {
    const attempts = this.generateAttemptOrder();
    const slotsToUse = isPractical ? this.practicalSlots : this.timeSlots;

    for (const { day, slotIndex } of attempts) {
      if (slotIndex >= slotsToUse.length) continue;
      
      const slot = slotsToUse[slotIndex];
      // Use assigned faculty for THEORY_CUM_PRACTICAL, otherwise select dynamically
      let faculty = assignedFaculty;
      
      if (assignedFaculty) {
        // Check if assigned faculty is available at this time
        if (!this.isFacultyAvailable(assignedFaculty, day, slot.startTime)) {
          continue; // Faculty not available at this time
        }
      } else {
        faculty = this.selectFaculty(subject.faculties, day, slot.startTime);
      }

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
        schedule,
        isPractical ? 'LAB' : 'CLASSROOM'
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

  private isFacultyAvailable(faculty: any, dayOfWeek: number, startTime: string): boolean {
    // If faculty has no availability restrictions, they're always available
    if (!faculty.availability || faculty.availability.length === 0) return true;

    // Check if faculty is available at this specific time
    return faculty.availability.some(
      (av: any) =>
        av.dayOfWeek === dayOfWeek &&
        this.isTimeInRange(startTime, av.startTime, av.endTime)
    );
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
    schedule: Map<string, Set<string>>,
    preferredType?: string
  ): ClassroomWithAvailability | null {
    // First: Try to find rooms with correct type and sufficient capacity
    let suitable = classrooms.filter((classroom) => {
      // Check capacity
      if (classroom.capacity < requiredCapacity) return false;

      // Enforce type matching
      if (preferredType && classroom.type !== preferredType) return false;

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

    // Fallback: If no room with correct type found, use any available room
    if (suitable.length === 0 && preferredType) {
      suitable = classrooms.filter((classroom) => {
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

      // Log violation
      if (suitable.length > 0) {
        const room = suitable[0];
        this.constraintViolations.push({
          type: 'WRONG_CLASSROOM_TYPE',
          message: `${preferredType} class using ${room.type} room`,
          details: {
            expectedType: preferredType,
            actualType: room.type,
            classroom: room.roomId,
          },
        });
      }
    }

    if (suitable.length === 0) {
      return null;
    }

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
    // Block the main time slot
    const batchKey = this.getScheduleKey('batch', entry.batchId, entry.dayOfWeek, entry.startTime);
    const facultyKey = this.getScheduleKey('faculty', entry.facultyId, entry.dayOfWeek, entry.startTime);
    const classroomKey = this.getScheduleKey('classroom', entry.classroomId, entry.dayOfWeek, entry.startTime);

    schedule.set(batchKey, new Set([entry.startTime]));
    schedule.set(facultyKey, new Set([entry.startTime]));
    schedule.set(classroomKey, new Set([entry.startTime]));

    // For 2-hour blocks (practical), also block all overlapping 1-hour slots
    const duration = this.getSlotDuration(entry.startTime, entry.endTime);
    if (duration >= 2) {
      // This is a 2-hour slot, block the intermediate time slots
      const overlappingSlots = this.getOverlappingSlots(entry.startTime, entry.endTime);
      for (const slotTime of overlappingSlots) {
        const batchSlotKey = this.getScheduleKey('batch', entry.batchId, entry.dayOfWeek, slotTime);
        const facultySlotKey = this.getScheduleKey('faculty', entry.facultyId, entry.dayOfWeek, slotTime);
        const classroomSlotKey = this.getScheduleKey('classroom', entry.classroomId, entry.dayOfWeek, slotTime);
        
        schedule.set(batchSlotKey, new Set([slotTime]));
        schedule.set(facultySlotKey, new Set([slotTime]));
        schedule.set(classroomSlotKey, new Set([slotTime]));
      }
    }
  }

  private getSlotDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  }

  private getOverlappingSlots(startTime: string, endTime: string): string[] {
    const overlapping: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    // Check all 1-hour slots that fall within this time range
    for (const slot of this.timeSlots) {
      const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMin] = slot.endTime.split(':').map(Number);
      
      const slotStartMinutes = slotStartHour * 60 + slotStartMin;
      const slotEndMinutes = slotEndHour * 60 + slotEndMin;
      const rangeStartMinutes = startHour * 60 + startMin;
      const rangeEndMinutes = endHour * 60 + endMin;
      
      // Check if slot overlaps with the range
      if (slotStartMinutes >= rangeStartMinutes && slotEndMinutes <= rangeEndMinutes && slot.startTime !== startTime) {
        overlapping.push(slot.startTime);
      }
    }
    
    return overlapping;
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
