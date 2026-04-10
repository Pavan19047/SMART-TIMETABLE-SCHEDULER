import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Weekly load limits per designation (hours per week)
const DESIGNATION_WEEKLY_LOAD: Record<string, number> = {
  ASSISTANT_PROFESSOR: 16,
  PROFESSOR: 14,
  HOD: 12,
};

const getWeeklyLoadForDesignation = (designation: string): number => {
  return DESIGNATION_WEEKLY_LOAD[designation] ?? 16;
};

export const createFaculty = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name,
      email,
      departmentId,
      designation,
      maxClassesPerDay,
      weeklyLoadLimit,
      averageLeavesPerMonth,
    } = req.body;

    const resolvedDesignation = designation || 'ASSISTANT_PROFESSOR';
    // Auto-derive weeklyLoadLimit from designation unless explicitly overridden
    const resolvedWeeklyLoad = weeklyLoadLimit ?? getWeeklyLoadForDesignation(resolvedDesignation);

    const faculty = await prisma.faculty.create({
      data: {
        name,
        email,
        departmentId,
        designation: resolvedDesignation as any,
        maxClassesPerDay: maxClassesPerDay || 4,
        weeklyLoadLimit: resolvedWeeklyLoad,
        averageLeavesPerMonth: averageLeavesPerMonth || 2,
      },
      include: {
        department: true,
      },
    });

    res.status(201).json({ faculty });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Faculty email already exists' });
    }
    console.error('Create faculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFaculties = async (req: AuthRequest, res: Response) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        department: true,
        subjects: {
          include: {
            subject: true,
          },
        },
        availability: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ faculties });
  } catch (error) {
    console.error('Get faculties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        department: true,
        subjects: {
          include: {
            subject: true,
          },
        },
        availability: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json({ faculty });
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      departmentId,
      designation,
      maxClassesPerDay,
      weeklyLoadLimit,
      averageLeavesPerMonth,
    } = req.body;

    // If designation changed, auto-update weeklyLoadLimit unless explicitly provided
    let resolvedWeeklyLoad = weeklyLoadLimit;
    if (designation && weeklyLoadLimit === undefined) {
      resolvedWeeklyLoad = getWeeklyLoadForDesignation(designation);
    }

    const faculty = await prisma.faculty.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(departmentId && { departmentId }),
        ...(designation && { designation: designation as any }),
        ...(maxClassesPerDay && { maxClassesPerDay }),
        ...(resolvedWeeklyLoad !== undefined && { weeklyLoadLimit: resolvedWeeklyLoad }),
        ...(averageLeavesPerMonth !== undefined && { averageLeavesPerMonth }),
      },
      include: {
        department: true,
      },
    });

    res.json({ faculty });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    console.error('Update faculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.faculty.delete({
      where: { id },
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    console.error('Delete faculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addSubject = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { subjectId } = req.body;

    const facultySubject = await prisma.facultySubject.create({
      data: {
        facultyId: id,
        subjectId,
      },
      include: {
        subject: true,
      },
    });

    res.status(201).json({ facultySubject });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Subject already assigned to faculty' });
    }
    console.error('Add subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id, subjectId } = req.params;

    await prisma.facultySubject.deleteMany({
      where: {
        facultyId: id,
        subjectId,
      },
    });

    res.json({ message: 'Subject removed from faculty successfully' });
  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addAvailability = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;

    const availability = await prisma.facultyAvailability.create({
      data: {
        facultyId: id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    res.status(201).json({ availability });
  } catch (error) {
    console.error('Add availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { availabilityId } = req.params;

    await prisma.facultyAvailability.delete({
      where: { id: availabilityId },
    });

    res.json({ message: 'Availability removed successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Availability not found' });
    }
    console.error('Remove availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
