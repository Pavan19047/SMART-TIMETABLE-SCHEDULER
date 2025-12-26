import { Router } from 'express';
import { body } from 'express-validator';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subject.controller';
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
    body('code').notEmpty().withMessage('Code is required'),
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Invalid semester'),
    body('weeklyClassesRequired').isInt({ min: 1 }).withMessage('Weekly classes must be positive'),
  ],
  createSubject
);

router.get('/', getSubjects);
router.get('/:id', getSubject);

router.put('/:id', authorizeRoles('ADMIN'), updateSubject);
router.delete('/:id', authorizeRoles('ADMIN'), deleteSubject);

export default router;
