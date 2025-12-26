import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createDepartment = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, code } = req.body;

    const department = await prisma.department.create({
      data: { name, code },
    });

    res.status(201).json({ department });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Department already exists' });
    }
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            faculties: true,
            subjects: true,
            batches: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        faculties: true,
        subjects: true,
        batches: true,
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ department });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
      },
    });

    res.json({ department });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Department not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Department name/code already exists' });
    }
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id },
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Department not found' });
    }
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
