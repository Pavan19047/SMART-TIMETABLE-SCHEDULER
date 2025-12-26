import { Router } from 'express';
import { body } from 'express-validator';
import {
  generateTimetables,
  getTimetables,
  getTimetable,
  approveTimetable,
  exportTimetable,
} from '../controllers/timetable.controller';
import {
  authenticateToken,
  authorizeRoles,
} from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/generate',
  authorizeRoles('ADMIN', 'SCHEDULER'),
  [
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Invalid semester'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  generateTimetables
);

router.get('/', getTimetables);
router.get('/:id', getTimetable);

router.post('/:id/approve', authorizeRoles('ADMIN'), approveTimetable);

router.get('/:id/export/:format', exportTimetable);

export default router;
