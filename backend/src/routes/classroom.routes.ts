import { Router } from 'express';
import { body } from 'express-validator';
import {
  createClassroom,
  getClassrooms,
  getClassroom,
  updateClassroom,
  deleteClassroom,
  addAvailability,
  removeAvailability,
} from '../controllers/classroom.controller';
import {
  authenticateToken,
  authorizeRoles,
} from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('ADMIN'),
  [
    body('roomId').notEmpty().withMessage('Room ID is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be positive'),
    body('type').isIn(['CLASSROOM', 'LAB']).withMessage('Invalid type'),
  ],
  createClassroom
);

router.get('/', getClassrooms);
router.get('/:id', getClassroom);

router.put('/:id', authorizeRoles('ADMIN'), updateClassroom);
router.delete('/:id', authorizeRoles('ADMIN'), deleteClassroom);

router.post(
  '/:id/availability',
  authorizeRoles('ADMIN'),
  [
    body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Invalid day'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid start time'),
    body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid end time'),
  ],
  addAvailability
);

router.delete('/:id/availability/:availabilityId', authorizeRoles('ADMIN'), removeAvailability);

export default router;
