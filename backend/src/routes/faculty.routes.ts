import { Router } from 'express';
import { body } from 'express-validator';
import {
  createFaculty,
  getFaculties,
  getFaculty,
  updateFaculty,
  deleteFaculty,
  addSubject,
  removeSubject,
  addAvailability,
  removeAvailability,
} from '../controllers/faculty.controller';
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
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('maxClassesPerDay').optional().isInt({ min: 1 }),
    body('weeklyLoadLimit').optional().isInt({ min: 1 }),
  ],
  createFaculty
);

router.get('/', getFaculties);
router.get('/:id', getFaculty);

router.put('/:id', authorizeRoles('ADMIN'), updateFaculty);
router.delete('/:id', authorizeRoles('ADMIN'), deleteFaculty);

router.post(
  '/:id/subjects',
  authorizeRoles('ADMIN'),
  [body('subjectId').notEmpty().withMessage('Subject ID is required')],
  addSubject
);

router.delete('/:id/subjects/:subjectId', authorizeRoles('ADMIN'), removeSubject);

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
