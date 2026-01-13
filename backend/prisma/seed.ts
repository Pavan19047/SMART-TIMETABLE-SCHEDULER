import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const schedulerPassword = await bcrypt.hash('scheduler123', 10);
  const scheduler = await prisma.user.upsert({
    where: { email: 'scheduler@college.edu' },
    update: {},
    create: {
      email: 'scheduler@college.edu',
      password: schedulerPassword,
      name: 'Scheduler User',
      role: 'SCHEDULER',
    },
  });

  console.log('Created users');

  // Create departments
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
    },
  });

  const eceDept = await prisma.department.upsert({
    where: { code: 'ECE' },
    update: {},
    create: {
      name: 'Electronics and Communication Engineering',
      code: 'ECE',
    },
  });

  console.log('Created departments');

  // Create classrooms
  const classrooms = [
    { roomId: 'A101', capacity: 60, type: 'CLASSROOM' },
    { roomId: 'A102', capacity: 60, type: 'CLASSROOM' },
    { roomId: 'A201', capacity: 80, type: 'CLASSROOM' },
    { roomId: 'B101', capacity: 40, type: 'LAB' },
    { roomId: 'B102', capacity: 40, type: 'LAB' },
    { roomId: 'C301', capacity: 100, type: 'CLASSROOM' },
  ];

  for (const room of classrooms) {
    await prisma.classroom.upsert({
      where: { roomId: room.roomId },
      update: {},
      create: {
        roomId: room.roomId,
        capacity: room.capacity,
        type: room.type as any,
      },
    });

    // Add availability (Monday to Friday, 9 AM to 5 PM)
    const classroom = await prisma.classroom.findUnique({
      where: { roomId: room.roomId },
    });

    if (classroom) {
      for (let day = 0; day < 5; day++) {
        await prisma.classroomAvailability.upsert({
          where: { id: `${classroom.id}-${day}` },
          update: {},
          create: {
            id: `${classroom.id}-${day}`,
            classroomId: classroom.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
          },
        });
      }
    }
  }

  console.log('Created classrooms');

  // Create faculties
  const faculties = [
    { name: 'Dr. John Smith', email: 'john@college.edu', dept: cseDept.id },
    { name: 'Dr. Sarah Johnson', email: 'sarah@college.edu', dept: cseDept.id },
    { name: 'Dr. Michael Brown', email: 'michael@college.edu', dept: cseDept.id },
    { name: 'Dr. Emily Davis', email: 'emily@college.edu', dept: eceDept.id },
    { name: 'Dr. Robert Wilson', email: 'robert@college.edu', dept: eceDept.id },
  ];

  for (const fac of faculties) {
    await prisma.faculty.upsert({
      where: { email: fac.email },
      update: {},
      create: {
        name: fac.name,
        email: fac.email,
        departmentId: fac.dept,
        maxClassesPerDay: 4,
        weeklyLoadLimit: 20,
        averageLeavesPerMonth: 2,
      },
    });

    // Add availability (Monday to Friday, 9 AM to 5 PM)
    const faculty = await prisma.faculty.findUnique({
      where: { email: fac.email },
    });

    if (faculty) {
      for (let day = 0; day < 5; day++) {
        await prisma.facultyAvailability.upsert({
          where: { id: `${faculty.id}-${day}` },
          update: {},
          create: {
            id: `${faculty.id}-${day}`,
            facultyId: faculty.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
          },
        });
      }
    }
  }

  console.log('Created faculties');

  // Create subjects
  const cseSubjects = [
    { 
      name: 'Data Structures', 
      code: 'CSE201', 
      semester: 3, 
      type: 'THEORY',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'Arrays and Linked Lists', estimatedHours: 12 },
        { topic: 'Stacks and Queues', estimatedHours: 10 },
        { topic: 'Trees and Graphs', estimatedHours: 20 },
        { topic: 'Sorting and Searching', estimatedHours: 12 },
        { topic: 'Advanced Data Structures', estimatedHours: 10 }
      ]
    },
    { 
      name: 'Algorithms', 
      code: 'CSE202', 
      semester: 3, 
      type: 'THEORY',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: 'Algorithm Analysis', estimatedHours: 10 },
        { topic: 'Divide and Conquer', estimatedHours: 12 },
        { topic: 'Dynamic Programming', estimatedHours: 14 },
        { topic: 'Greedy Algorithms', estimatedHours: 12 }
      ]
    },
    { 
      name: 'Database Management', 
      code: 'CSE203', 
      semester: 3, 
      type: 'THEORY_CUM_PRACTICAL',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'ER Modeling', estimatedHours: 12 },
        { topic: 'SQL and Relational Algebra', estimatedHours: 18 },
        { topic: 'Normalization', estimatedHours: 10 },
        { topic: 'Transactions and Concurrency', estimatedHours: 14 },
        { topic: 'NoSQL Databases', estimatedHours: 10 }
      ]
    },
    { 
      name: 'Software Engineering', 
      code: 'CSE204', 
      semester: 4, 
      type: 'THEORY',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'SDLC Models', estimatedHours: 14 },
        { topic: 'Requirements Engineering', estimatedHours: 12 },
        { topic: 'Design Patterns', estimatedHours: 16 },
        { topic: 'Testing and Quality Assurance', estimatedHours: 14 },
        { topic: 'Agile Methodologies', estimatedHours: 8 }
      ]
    },
    { 
      name: 'Computer Architecture', 
      code: 'CSE205', 
      semester: 4, 
      type: 'THEORY',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: 'CPU Organization', estimatedHours: 12 },
        { topic: 'Memory Hierarchy', estimatedHours: 12 },
        { topic: 'Pipelining', estimatedHours: 12 },
        { topic: 'I/O Organization', estimatedHours: 12 }
      ]
    },
    { 
      name: 'Web Technologies', 
      code: 'CSE206', 
      semester: 4, 
      type: 'PRACTICAL',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: 'HTML and CSS', estimatedHours: 10 },
        { topic: 'JavaScript and DOM', estimatedHours: 14 },
        { topic: 'Backend Development', estimatedHours: 12 },
        { topic: 'Web Security', estimatedHours: 12 }
      ]
    },
    { 
      name: 'Operating Systems', 
      code: 'CSE301', 
      semester: 5, 
      type: 'THEORY',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'Process Management', estimatedHours: 14 },
        { topic: 'Memory Management', estimatedHours: 14 },
        { topic: 'File Systems', estimatedHours: 12 },
        { topic: 'I/O Systems', estimatedHours: 10 },
        { topic: 'Security and Protection', estimatedHours: 14 }
      ]
    },
    { 
      name: 'Computer Networks', 
      code: 'CSE302', 
      semester: 5, 
      type: 'THEORY_CUM_PRACTICAL',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: 'Network Layers', estimatedHours: 12 },
        { topic: 'TCP/IP Protocol Suite', estimatedHours: 14 },
        { topic: 'Routing Algorithms', estimatedHours: 10 },
        { topic: 'Network Security', estimatedHours: 12 }
      ]
    },
  ];

  const createdCseSubjects = [];
  for (const sub of cseSubjects) {
    const subject = await prisma.subject.upsert({
      where: { code: sub.code },
      update: {
        conceptsCovered: sub.concepts,
        totalHoursRequired: sub.totalHours,
        courseDurationWeeks: sub.duration,
        weeklyClassesRequired: sub.weekly,
        type: (sub as any).type || 'THEORY',
        hoursPerSession: ((sub as any).type === 'PRACTICAL' || (sub as any).type === 'THEORY_CUM_PRACTICAL') ? 2 : 1,
      },
      create: {
        name: sub.name,
        code: sub.code,
        departmentId: cseDept.id,
        semester: sub.semester,
        type: (sub as any).type || 'THEORY',
        weeklyClassesRequired: sub.weekly,
        courseDurationWeeks: sub.duration,
        totalHoursRequired: sub.totalHours,
        hoursPerSession: ((sub as any).type === 'PRACTICAL' || (sub as any).type === 'THEORY_CUM_PRACTICAL') ? 2 : 1,
        conceptsCovered: sub.concepts,
      },
    });
    createdCseSubjects.push(subject);
  }

  console.log('Created CSE subjects');

  // Create ECE subjects
  const eceSubjects = [
    { 
      name: 'Digital Electronics', 
      code: 'ECE201', 
      semester: 1, 
      type: 'THEORY_CUM_PRACTICAL',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'Number Systems and Logic Gates', estimatedHours: 14 },
        { topic: 'Combinational Circuits', estimatedHours: 16 },
        { topic: 'Sequential Circuits', estimatedHours: 18 },
        { topic: 'Memory and PLDs', estimatedHours: 16 }
      ]
    },
    { 
      name: 'Signals and Systems', 
      code: 'ECE202', 
      semester: 1, 
      type: 'THEORY',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: 'Signal Classification', estimatedHours: 10 },
        { topic: 'Fourier Series and Transform', estimatedHours: 14 },
        { topic: 'Laplace Transform', estimatedHours: 12 },
        { topic: 'Z-Transform', estimatedHours: 12 }
      ]
    },
    { 
      name: 'Electronic Circuits', 
      code: 'ECE203', 
      semester: 1, 
      type: 'PRACTICAL',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'Diodes and Rectifiers', estimatedHours: 12 },
        { topic: 'BJT Amplifiers', estimatedHours: 16 },
        { topic: 'FET and MOSFET', estimatedHours: 16 },
        { topic: 'Operational Amplifiers', estimatedHours: 20 }
      ]
    },
    { 
      name: 'Communication Systems', 
      code: 'ECE301', 
      semester: 3, 
      type: 'THEORY',
      weekly: 4,
      duration: 16,
      totalHours: 64,
      concepts: [
        { topic: 'Amplitude Modulation', estimatedHours: 14 },
        { topic: 'Frequency Modulation', estimatedHours: 14 },
        { topic: 'Digital Modulation', estimatedHours: 18 },
        { topic: 'Communication Systems', estimatedHours: 18 }
      ]
    },
    { 
      name: 'Microprocessors', 
      code: 'ECE302', 
      semester: 3, 
      type: 'PRACTICAL',
      weekly: 3,
      duration: 16,
      totalHours: 48,
      concepts: [
        { topic: '8086 Architecture', estimatedHours: 12 },
        { topic: 'Assembly Language', estimatedHours: 14 },
        { topic: 'Interfacing', estimatedHours: 12 },
        { topic: 'Microcontrollers', estimatedHours: 10 }
      ]
    },
  ];

  const createdEceSubjects = [];
  for (const sub of eceSubjects) {
    const subject = await prisma.subject.upsert({
      where: { code: sub.code },
      update: {
        conceptsCovered: sub.concepts,
        totalHoursRequired: sub.totalHours,
        courseDurationWeeks: sub.duration,
        weeklyClassesRequired: sub.weekly,
        type: (sub as any).type || 'THEORY',
        hoursPerSession: ((sub as any).type === 'PRACTICAL' || (sub as any).type === 'THEORY_CUM_PRACTICAL') ? 2 : 1,
      },
      create: {
        name: sub.name,
        code: sub.code,
        departmentId: eceDept.id,
        semester: sub.semester,
        type: (sub as any).type || 'THEORY',
        weeklyClassesRequired: sub.weekly,
        courseDurationWeeks: sub.duration,
        totalHoursRequired: sub.totalHours,
        hoursPerSession: ((sub as any).type === 'PRACTICAL' || (sub as any).type === 'THEORY_CUM_PRACTICAL') ? 2 : 1,
        conceptsCovered: sub.concepts,
      },
    });
    createdEceSubjects.push(subject);
  }

  console.log('Created ECE subjects');

  // Assign subjects to faculties
  const cseFaculties = await prisma.faculty.findMany({
    where: { departmentId: cseDept.id },
  });

  for (let i = 0; i < createdCseSubjects.length; i++) {
    const faculty = cseFaculties[i % cseFaculties.length];
    await prisma.facultySubject.upsert({
      where: {
        facultyId_subjectId: {
          facultyId: faculty.id,
          subjectId: createdCseSubjects[i].id,
        },
      },
      update: {},
      create: {
        facultyId: faculty.id,
        subjectId: createdCseSubjects[i].id,
      },
    });
  }

  const eceFaculties = await prisma.faculty.findMany({
    where: { departmentId: eceDept.id },
  });

  for (let i = 0; i < createdEceSubjects.length; i++) {
    const faculty = eceFaculties[i % eceFaculties.length];
    await prisma.facultySubject.upsert({
      where: {
        facultyId_subjectId: {
          facultyId: faculty.id,
          subjectId: createdEceSubjects[i].id,
        },
      },
      update: {},
      create: {
        facultyId: faculty.id,
        subjectId: createdEceSubjects[i].id,
      },
    });
  }

  console.log('Assigned subjects to faculties');

  // Create batches
  const batch3A = await prisma.batch.upsert({
    where: { id: 'batch-cse-3a' },
    update: {},
    create: {
      id: 'batch-cse-3a',
      name: 'CSE 3rd Semester - Section A',
      departmentId: cseDept.id,
      semester: 3,
      batchSize: 60,
    },
  });

  const batch4A = await prisma.batch.upsert({
    where: { id: 'batch-cse-4a' },
    update: {},
    create: {
      id: 'batch-cse-4a',
      name: 'CSE 4th Semester - Section A',
      departmentId: cseDept.id,
      semester: 4,
      batchSize: 58,
    },
  });

  const batch5A = await prisma.batch.upsert({
    where: { id: 'batch-cse-5a' },
    update: {},
    create: {
      id: 'batch-cse-5a',
      name: 'CSE 5th Semester - Section A',
      departmentId: cseDept.id,
      semester: 5,
      batchSize: 55,
    },
  });

  // Create ECE batches
  const batchECE1A = await prisma.batch.upsert({
    where: { id: 'batch-ece-1a' },
    update: {},
    create: {
      id: 'batch-ece-1a',
      name: 'ECE 1st Semester - Section A',
      departmentId: eceDept.id,
      semester: 1,
      batchSize: 50,
    },
  });

  const batchECE3A = await prisma.batch.upsert({
    where: { id: 'batch-ece-3a' },
    update: {},
    create: {
      id: 'batch-ece-3a',
      name: 'ECE 3rd Semester - Section A',
      departmentId: eceDept.id,
      semester: 3,
      batchSize: 48,
    },
  });

  console.log('Created batches');

  // Assign subjects to batches
  const cseSem3Subjects = createdCseSubjects.filter((s) => s.semester === 3);
  const cseSem4Subjects = createdCseSubjects.filter((s) => s.semester === 4);
  const cseSem5Subjects = createdCseSubjects.filter((s) => s.semester === 5);

  for (const subject of cseSem3Subjects) {
    await prisma.batchSubject.upsert({
      where: {
        batchId_subjectId: {
          batchId: batch3A.id,
          subjectId: subject.id,
        },
      },
      update: {},
      create: {
        batchId: batch3A.id,
        subjectId: subject.id,
      },
    });
  }

  for (const subject of cseSem4Subjects) {
    await prisma.batchSubject.upsert({
      where: {
        batchId_subjectId: {
          batchId: batch4A.id,
          subjectId: subject.id,
        },
      },
      update: {},
      create: {
        batchId: batch4A.id,
        subjectId: subject.id,
      },
    });
  }

  for (const subject of cseSem5Subjects) {
    await prisma.batchSubject.upsert({
      where: {
        batchId_subjectId: {
          batchId: batch5A.id,
          subjectId: subject.id,
        },
      },
      update: {},
      create: {
        batchId: batch5A.id,
        subjectId: subject.id,
      },
    });
  }

  const eceSem1Subjects = createdEceSubjects.filter((s) => s.semester === 1);
  const eceSem3Subjects = createdEceSubjects.filter((s) => s.semester === 3);

  for (const subject of eceSem1Subjects) {
    await prisma.batchSubject.upsert({
      where: {
        batchId_subjectId: {
          batchId: batchECE1A.id,
          subjectId: subject.id,
        },
      },
      update: {},
      create: {
        batchId: batchECE1A.id,
        subjectId: subject.id,
      },
    });
  }

  for (const subject of eceSem3Subjects) {
    await prisma.batchSubject.upsert({
      where: {
        batchId_subjectId: {
          batchId: batchECE3A.id,
          subjectId: subject.id,
        },
      },
      update: {},
      create: {
        batchId: batchECE3A.id,
        subjectId: subject.id,
      },
    });
  }

  console.log('Assigned subjects to batches');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
