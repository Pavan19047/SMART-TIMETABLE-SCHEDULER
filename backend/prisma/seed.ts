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
      name: 'Operating Systems', 
      code: 'CSE301', 
      semester: 5, 
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
      update: {},
      create: {
        name: sub.name,
        code: sub.code,
        departmentId: cseDept.id,
        semester: sub.semester,
        weeklyClassesRequired: sub.weekly,
        courseDurationWeeks: sub.duration,
        totalHoursRequired: sub.totalHours,
        conceptsCovered: sub.concepts,
      },
    });
    createdCseSubjects.push(subject);
  }

  console.log('Created subjects');

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

  console.log('Assigned subjects to faculties');

  // Create batches
  const batch3A = await prisma.batch.upsert({
    where: { id: 'batch-cse-3a' },
    update: {},
    create: {
      id: 'batch-cse-3a',
      name: 'CSE 3rd Year - Section A',
      departmentId: cseDept.id,
      semester: 3,
      batchSize: 60,
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

  console.log('Created batches');

  // Assign subjects to batches
  const sem3Subjects = createdCseSubjects.filter((s) => s.semester === 3);
  const sem5Subjects = createdCseSubjects.filter((s) => s.semester === 5);

  for (const subject of sem3Subjects) {
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

  for (const subject of sem5Subjects) {
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
