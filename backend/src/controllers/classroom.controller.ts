import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createClassroom = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { roomId, capacity, type, departmentId } = req.body;

    const classroom = await prisma.classroom.create({
      data: {
        roomId,
        capacity,
        type,
        departmentId: departmentId || null,
      },
    });

    res.status(201).json({ classroom });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Room ID already exists' });
    }
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClassrooms = async (req: AuthRequest, res: Response) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        availability: true,
      },
      orderBy: { roomId: 'asc' },
    });

    res.json({ classrooms });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClassroom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        availability: true,
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    res.json({ classroom });
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateClassroom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { roomId, capacity, type, departmentId } = req.body;

    const classroom = await prisma.classroom.update({
      where: { id },
      data: {
        ...(roomId && { roomId }),
        ...(capacity && { capacity }),
        ...(type && { type }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
      },
    });

    res.json({ classroom });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    console.error('Update classroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClassroom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.classroom.delete({
      where: { id },
    });

    res.json({ message: 'Classroom deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    console.error('Delete classroom error:', error);
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

    const availability = await prisma.classroomAvailability.create({
      data: {
        classroomId: id,
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

    await prisma.classroomAvailability.delete({
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
