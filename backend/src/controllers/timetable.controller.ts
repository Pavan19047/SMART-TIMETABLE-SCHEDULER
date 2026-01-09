import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimetableGenerator } from '../services/timetable.service';
import { exportToPDF, exportToExcel } from '../services/export.service';

const prisma = new PrismaClient();

export const generateTimetables = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { semester, name, departmentId } = req.body;

    // Build where clause for batches
    const whereClause: any = { semester };
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    // Fetch all necessary data
    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        subjects: {
          include: {
            subject: {
              include: {
                faculties: {
                  include: {
                    faculty: {
                      include: {
                        availability: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        department: true,
      },
    });

    if (batches.length === 0) {
      const message = departmentId 
        ? 'No batches found for this branch and semester'
        : 'No batches found for this semester';
      return res.status(404).json({ error: message });
    }

    const classrooms = await prisma.classroom.findMany({
      include: {
        availability: true,
      },
    });

    if (classrooms.length === 0) {
      return res.status(404).json({ error: 'No classrooms available' });
    }

    // Generate multiple timetable options
    const generator = new TimetableGenerator();
    const timetableOptions = await generator.generate(batches, classrooms, semester, name);

    if (timetableOptions.length === 0) {
      return res.status(400).json({
        error: 'Unable to generate timetables',
        reason: 'Constraints could not be satisfied',
        details: generator.getConstraintViolations(),
      });
    }

    res.json({
      message: `Generated ${timetableOptions.length} timetable options`,
      timetables: timetableOptions,
    });
  } catch (error) {
    console.error('Generate timetables error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimetables = async (req: AuthRequest, res: Response) => {
  try {
    const { semester, status } = req.query;

    const where: any = {};
    if (semester) where.semester = parseInt(semester as string);
    if (status) where.status = status;

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format timetables with metadata
    const formattedTimetables = timetables.map(tt => ({
      ...tt,
      metadata: {
        ...((tt.metadata as any) || {}),
        totalEntries: tt._count.entries,
      },
    }));

    res.json({ timetables: formattedTimetables });
  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const timetable = await prisma.timetable.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            batch: true,
            subject: true,
            faculty: true,
            classroom: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    res.json({ timetable });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const timetable = await prisma.timetable.findUnique({
      where: { id },
    });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    if (timetable.status === 'LOCKED') {
      return res.status(400).json({ error: 'Timetable is already locked' });
    }

    const updatedTimetable = await prisma.timetable.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user!.id,
      },
    });

    res.json({
      message: 'Timetable approved successfully',
      timetable: updatedTimetable,
    });
  } catch (error) {
    console.error('Approve timetable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id, format } = req.params;

    const timetable = await prisma.timetable.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            batch: true,
            subject: true,
            faculty: true,
            classroom: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    if (format === 'pdf') {
      const pdfBuffer = await exportToPDF(timetable);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=timetable-${timetable.name}.pdf`
      );
      res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await exportToExcel(timetable);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=timetable-${timetable.name}.xlsx`
      );
      res.send(excelBuffer);
    } else {
      res.status(400).json({ error: 'Invalid format. Use pdf or excel' });
    }
  } catch (error) {
    console.error('Export timetable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const timetable = await prisma.timetable.findUnique({
      where: { id },
    });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    if (timetable.status === 'LOCKED') {
      return res.status(400).json({ error: 'Cannot delete a locked timetable' });
    }

    await prisma.timetable.delete({
      where: { id },
    });

    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
