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
      type: string;
      weeklyClassesRequired: number;
      hoursPerSession: number;
      totalHoursRequired: number;
      fixedSlot: any;
      faculties: {
        faculty: {
          id: string;
          name: string;
          designation: string;
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
  // 50-minute theory slots
  // Structure: 2 slots | SHORT BREAK | 2 slots | LUNCH | 1 slot after lunch | SHORT BREAK | 2 slots
  private timeSlots: TimeSlot[] = [
    { startTime: '09:00', endTime: '09:50' },  // Hour 1
    { startTime: '09:55', endTime: '10:45' },  // Hour 2
    // SHORT BREAK 10:45-11:00
    { startTime: '11:00', endTime: '11:50' },  // Hour 3
    { startTime: '11:55', endTime: '12:45' },  // Hour 4
    // LUNCH BREAK 12:45-13:30
    { startTime: '13:30', endTime: '14:20' },  // Hour 5 (1 slot after lunch)
    // SHORT BREAK 14:20-14:35
    { startTime: '14:35', endTime: '15:25' },  // Hour 6
    { startTime: '15:30', endTime: '16:20' },  // Hour 7
  ];

  // 1h45m (105-minute) lab-only slots (for pure PRACTICAL subjects)
  private practicalSlots: TimeSlot[] = [
    { startTime: '11:00', endTime: '12:45' }, // Hours 3+4 (before lunch)
    { startTime: '14:35', endTime: '16:20' }, // Hours 6+7 (after afternoon break)
  ];

  // THEORY_CUM_PRACTICAL: theory slot + short break + lab slot on the SAME DAY
  // Both sessions are booked together as one combined block.
  private combinedTheoryLabPairs: { theory: TimeSlot; lab: TimeSlot }[] = [
    {
      theory: { startTime: '09:55', endTime: '10:45' }, // Hour 2
      lab:    { startTime: '11:00', endTime: '12:45' }, // Hours 3+4 (after short break)
    },
    {
      theory: { startTime: '13:30', endTime: '14:20' }, // Hour 5
      lab:    { startTime: '14:35', endTime: '16:20' }, // Hours 6+7 (after short break)
    },
  ];

  // Break time ranges — no class should ever start or run during these windows
  private breakRanges = [
    { start: '10:45', end: '11:00' }, // Morning short break
    { start: '12:45', end: '13:30' }, // Lunch break
    { start: '14:20', end: '14:35' }, // Afternoon short break
  ];

  private workingDays = [0, 1, 2, 3, 4]; // Monday to Friday
  private constraintViolations: ConstraintViolation[] = [];
  private readonly SEMESTER_DURATION_WEEKS = 16; // Standard semester duration
  private readonly MIN_FREE_PERIODS_PER_WEEK = 2; // Minimum free periods per week for students
  private readonly MAX_STUDENT_WEEKLY_HOURS = 20; // Maximum teaching hours per week for a batch
  // Designation-based faculty weekly load limits (hours)
  private readonly FACULTY_WEEKLY_LOAD: Record<string, number> = {
    ASSISTANT_PROFESSOR: 16,
    PROFESSOR: 14,
    HOD: 12,
  };

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
      this.constraintViolations = []; // Reset violations for each fresh attempt
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
          const hoursPerSessionVal = subject.hoursPerSession || 1;
          const totalHoursNeeded = subject.totalHoursRequired || (subject.weeklyClassesRequired * hoursPerSessionVal * this.SEMESTER_DURATION_WEEKS);
          const maxPossibleHours = subject.weeklyClassesRequired * hoursPerSessionVal * this.SEMESTER_DURATION_WEEKS;
          
          if (maxPossibleHours < totalHoursNeeded) {
            this.constraintViolations.push({
              type: 'DURATION_INSUFFICIENT',
              message: `${subject.name} cannot be completed within semester duration`,
              details: {
                subject: subject.name,
                totalHoursNeeded,
                maxPossibleHours,
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

        // Ensure minimum free periods and cap at MAX_STUDENT_WEEKLY_HOURS for students
        const batchWeeklyHours = this.calculateWeeklyHours(entries, 'batchId', batch.id);
        const maxPossibleSlots = this.timeSlots.length * this.workingDays.length;
        const freePeriods = maxPossibleSlots - entries.filter(e => e.batchId === batch.id).length;
        
        if (batchWeeklyHours > this.MAX_STUDENT_WEEKLY_HOURS) {
          this.constraintViolations.push({
            type: 'EXCEEDS_STUDENT_WEEKLY_HOURS',
            message: `Batch ${batch.name} exceeds maximum ${this.MAX_STUDENT_WEEKLY_HOURS} teaching hours per week`,
            details: {
              batch: batch.name,
              scheduledHours: batchWeeklyHours,
              maxAllowed: this.MAX_STUDENT_WEEKLY_HOURS,
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
      
      // Pick the first assigned faculty for the subject
      assignedFaculty = subject.faculties[0].faculty;
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

    // For THEORY_CUM_PRACTICAL: schedule each session as a paired same-day block
    // (theory slot → short break → lab slot, both on the same day)
    if (isTheoryCumPractical) {
      for (let i = 0; i < remainingClasses; i++) {
        const scheduled = this.scheduleOneCombinedSession(
          batch,
          subject,
          classrooms,
          schedule,
          entries,
          assignedFaculty
        );
        if (scheduled) {
          classesScheduled++;
        } else {
          console.log(`Failed to schedule combined theory+lab session ${i + 1} for ${subject.name}`);
        }
      }

      if (classesScheduled < subject.weeklyClassesRequired) {
        this.constraintViolations.push({
          type: 'INCOMPLETE_THEORY_CUM_PRACTICAL',
          message: `Could not schedule all combined sessions for ${subject.name}`,
          details: {
            subject: subject.name,
            code: subject.code,
            batch: batch.name,
            required: subject.weeklyClassesRequired,
            scheduled: classesScheduled,
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
    // Enforce 20-hour weekly student schedule limit
    const batchWeeklyHours = this.calculateWeeklyHours(entries, 'batchId', batch.id);
    const sessionHours = isPractical ? 2 : 1;
    if (batchWeeklyHours + sessionHours > this.MAX_STUDENT_WEEKLY_HOURS) {
      return false;
    }

    const attempts = this.generateAttemptOrder();
    const slotsToUse = isPractical ? this.practicalSlots : this.timeSlots;

    for (const { day, slotIndex } of attempts) {
      if (slotIndex >= slotsToUse.length) continue;
      
      const slot = slotsToUse[slotIndex];

      // Hard guard: never schedule during a break window
      if (this.isDuringBreak(slot.startTime) || this.isDuringBreak(slot.endTime)) continue;
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

      // Enforce faculty weekly load limit — use designation-based cap as source of truth
      const facultyWeeklyHours = this.calculateWeeklyHours(entries, 'facultyId', faculty.id);
      const designationCap = this.FACULTY_WEEKLY_LOAD[faculty.designation] ?? faculty.weeklyLoadLimit;
      if (facultyWeeklyHours + sessionHours > designationCap) {
        continue; // Faculty has reached their weekly load limit
      }

      // Check if faculty already has classes on this day
      const facultyDayClasses = entries.filter(
        (e) => e.facultyId === faculty.id && e.dayOfWeek === day
      );

      // Soft preference: avoid large gaps within a faculty's day (but don't hard-block)

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

  /**
   * Schedule a THEORY_CUM_PRACTICAL subject as a combined same-day block:
   * theory slot → short break → lab slot, both on the same day.
   * Uses one of the predefined combinedTheoryLabPairs.
   */
  private scheduleOneCombinedSession(
    batch: BatchWithDetails,
    subject: any,
    classrooms: ClassroomWithAvailability[],
    schedule: Map<string, Set<string>>,
    entries: TimetableEntry[],
    assignedFaculty: any
  ): boolean {
    const days = this.shuffle([...this.workingDays]);
    const pairs = this.shuffle([...this.combinedTheoryLabPairs]);

    for (const day of days) {
      for (const pair of pairs) {
        const { theory, lab } = pair;

        // Check faculty availability for both slots
        if (!this.isFacultyAvailable(assignedFaculty, day, theory.startTime)) continue;
        if (!this.isFacultyAvailable(assignedFaculty, day, lab.startTime)) continue;

        // Check faculty daily class limit (theory + lab = 2 entries)
        const existingFacultyDay = entries.filter(
          (e) => e.facultyId === assignedFaculty.id && e.dayOfWeek === day
        ).length;
        if (existingFacultyDay + 2 > assignedFaculty.maxClassesPerDay) continue;

        // Check faculty weekly load (theory ~0.83h + lab ~1.75h ≈ 2.58h)
        const facultyWeeklyHours = this.calculateWeeklyHours(entries, 'facultyId', assignedFaculty.id);
        const sessionHours = this.getSlotDuration(theory.startTime, theory.endTime)
          + this.getSlotDuration(lab.startTime, lab.endTime);
        const designationCap = this.FACULTY_WEEKLY_LOAD[assignedFaculty.designation] ?? assignedFaculty.weeklyLoadLimit;
        if (facultyWeeklyHours + sessionHours > designationCap) continue;

        // Check student weekly hour cap
        const batchWeeklyHours = this.calculateWeeklyHours(entries, 'batchId', batch.id);
        if (batchWeeklyHours + sessionHours > this.MAX_STUDENT_WEEKLY_HOURS) continue;

        // Find a CLASSROOM for the theory session
        const theoryRoom = this.findAvailableClassroom(
          classrooms, batch.batchSize, day, theory.startTime, schedule, 'CLASSROOM'
        );
        if (!theoryRoom) continue;

        // Find a LAB for the lab session
        const labRoom = this.findAvailableClassroom(
          classrooms, batch.batchSize, day, lab.startTime, schedule, 'LAB'
        );
        if (!labRoom) continue;

        const theoryEntry: TimetableEntry = {
          batchId: batch.id,
          subjectId: subject.id,
          facultyId: assignedFaculty.id,
          classroomId: theoryRoom.id,
          dayOfWeek: day,
          startTime: theory.startTime,
          endTime: theory.endTime,
        };

        const labEntry: TimetableEntry = {
          batchId: batch.id,
          subjectId: subject.id,
          facultyId: assignedFaculty.id,
          classroomId: labRoom.id,
          dayOfWeek: day,
          startTime: lab.startTime,
          endTime: lab.endTime,
        };

        if (this.isValidEntry(theoryEntry, schedule) && this.isValidEntry(labEntry, schedule)) {
          entries.push(theoryEntry);
          this.updateSchedule(schedule, theoryEntry);
          entries.push(labEntry);
          this.updateSchedule(schedule, labEntry);
          return true;
        }
      }
    }

    return false;
  }

  private isDuringBreak(time: string): boolean {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const tMin = toMin(time);
    return this.breakRanges.some(br => tMin > toMin(br.start) && tMin < toMin(br.end));
  }

  private calculateWeeklyHours(
    entries: TimetableEntry[],
    keyField: 'batchId' | 'facultyId',
    id: string
  ): number {
    return entries
      .filter((e) => e[keyField] === id)
      .reduce((total, e) => total + this.getSlotDuration(e.startTime, e.endTime), 0);
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

    // Fallback: Only allow wrong-type fallback for CLASSROOM (theory) sessions, NOT for LAB/practical
    if (suitable.length === 0 && preferredType && preferredType !== 'LAB') {
      suitable = classrooms.filter((classroom) => {
        if (classroom.capacity < requiredCapacity) return false;

        if (classroom.availability.length > 0) {
          const available = classroom.availability.some(
            (av) =>
              av.dayOfWeek === dayOfWeek &&
              this.isTimeInRange(startTime, av.startTime, av.endTime)
          );
          if (!available) return false;
        }

        const key = this.getScheduleKey('classroom', classroom.id, dayOfWeek, startTime);
        return !schedule.has(key);
      });

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
    // For LAB sessions: no fallback — return null to try a different time slot

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
    // --- 1. Coverage score (0–80): % of required weekly classes actually scheduled ---
    let totalRequired = 0;
    batches.forEach((batch) => {
      batch.subjects.forEach((bs) => {
        totalRequired += bs.subject.weeklyClassesRequired;
      });
    });
    const coverageRate = totalRequired > 0 ? Math.min(1, entries.length / totalRequired) : 1;
    const coverageScore = coverageRate * 80;

    // --- 2. Workload distribution score (0–10): even faculty spread across days ---
    let distributionScore = 10;
    const facultyWorkload = new Map<string, number[]>();
    entries.forEach((entry) => {
      if (!facultyWorkload.has(entry.facultyId)) {
        facultyWorkload.set(entry.facultyId, [0, 0, 0, 0, 0]);
      }
      facultyWorkload.get(entry.facultyId)![entry.dayOfWeek]++;
    });
    facultyWorkload.forEach((workload) => {
      const avg = workload.reduce((a, b) => a + b, 0) / workload.length;
      const variance =
        workload.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / workload.length;
      distributionScore -= Math.min(2, variance * 0.4); // Gentle cap per faculty
    });
    distributionScore = Math.max(0, distributionScore);

    // --- 3. Gap score (0–10): penalise idle time in student schedule ---
    let gapScore = 10;
    batches.forEach((batch) => {
      const batchEntries = entries.filter((e) => e.batchId === batch.id);
      const dayGroups = new Map<number, TimetableEntry[]>();
      batchEntries.forEach((entry) => {
        if (!dayGroups.has(entry.dayOfWeek)) dayGroups.set(entry.dayOfWeek, []);
        dayGroups.get(entry.dayOfWeek)!.push(entry);
      });
      dayGroups.forEach((dayEntries) => {
        dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < dayEntries.length - 1; i++) {
          const gap = this.getMinutesBetween(dayEntries[i].endTime, dayEntries[i + 1].startTime);
          if (gap > 60) gapScore -= 0.5;
        }
      });
    });
    gapScore = Math.max(0, gapScore);

    // --- 4. Critical-violation penalty (capped at 5) ---
    const criticalTypes = ['NO_FACULTY_ASSIGNED', 'WRONG_CLASSROOM_TYPE', 'DURATION_INSUFFICIENT'];
    const criticalCount = this.constraintViolations.filter((v) =>
      criticalTypes.includes(v.type)
    ).length;
    const violationPenalty = Math.min(5, criticalCount);

    const total = coverageScore + distributionScore + gapScore - violationPenalty;
    return Math.round(Math.max(0, Math.min(100, total)));
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
