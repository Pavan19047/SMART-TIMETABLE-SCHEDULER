import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createSubject = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name,
      code,
      departmentId,
      semester,
      weeklyClassesRequired,
      courseDurationWeeks,
      totalHoursRequired,
      conceptsCovered,
      fixedSlot,
    } = req.body;

    // Auto-calculate total hours if not provided
    const calculatedTotalHours = totalHoursRequired || (weeklyClassesRequired * (courseDurationWeeks || 16));

    // Generate basic concepts if not provided
    const defaultConcepts = conceptsCovered || [
      { topic: 'Introduction and Fundamentals', estimatedHours: Math.ceil(calculatedTotalHours * 0.2) },
      { topic: 'Core Concepts', estimatedHours: Math.ceil(calculatedTotalHours * 0.4) },
      { topic: 'Advanced Topics', estimatedHours: Math.ceil(calculatedTotalHours * 0.25) },
      { topic: 'Practical Applications & Review', estimatedHours: Math.ceil(calculatedTotalHours * 0.15) },
    ];

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        departmentId,
        semester,
        weeklyClassesRequired,
        courseDurationWeeks: courseDurationWeeks || 16,
        totalHoursRequired: calculatedTotalHours,
        conceptsCovered: defaultConcepts,
        fixedSlot: fixedSlot || null,
      },
      include: {
        department: true,
      },
    });

    res.status(201).json({ subject });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId, semester } = req.query;

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = parseInt(semester as string);

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        department: true,
        faculties: {
          include: {
            faculty: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
        faculties: {
          include: {
            faculty: true,
          },
        },
        batches: {
          include: {
            batch: true,
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      departmentId,
      semester,
      weeklyClassesRequired,
      fixedSlot,
    } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(departmentId && { departmentId }),
        ...(semester && { semester }),
        ...(weeklyClassesRequired && { weeklyClassesRequired }),
        ...(fixedSlot !== undefined && { fixedSlot: fixedSlot || null }),
      },
      include: {
        department: true,
      },
    });

    res.json({ subject });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subject not found' });
    }
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.subject.delete({
      where: { id },
    });

    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subject not found' });
    }
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
