import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createBatch = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, departmentId, semester, batchSize } = req.body;

    const batch = await prisma.batch.create({
      data: {
        name,
        departmentId,
        semester,
        batchSize,
      },
      include: {
        department: true,
      },
    });

    res.status(201).json({ batch });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBatches = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId, semester } = req.query;

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = parseInt(semester as string);

    const batches = await prisma.batch.findMany({
      where,
      include: {
        department: true,
        subjects: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ batches });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        department: true,
        subjects: {
          include: {
            subject: {
              include: {
                faculties: {
                  include: {
                    faculty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({ batch });
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, departmentId, semester, batchSize } = req.body;

    const batch = await prisma.batch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(departmentId && { departmentId }),
        ...(semester && { semester }),
        ...(batchSize && { batchSize }),
      },
      include: {
        department: true,
      },
    });

    res.json({ batch });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Batch not found' });
    }
    console.error('Update batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.batch.delete({
      where: { id },
    });

    res.json({ message: 'Batch deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Batch not found' });
    }
    console.error('Delete batch error:', error);
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

    const batchSubject = await prisma.batchSubject.create({
      data: {
        batchId: id,
        subjectId,
      },
      include: {
        subject: true,
      },
    });

    res.status(201).json({ batchSubject });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Subject already assigned to batch' });
    }
    console.error('Add subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id, subjectId } = req.params;

    await prisma.batchSubject.deleteMany({
      where: {
        batchId: id,
        subjectId,
      },
    });

    res.json({ message: 'Subject removed from batch successfully' });
  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
