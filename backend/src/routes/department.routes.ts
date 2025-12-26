import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
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
  ],
  createDepartment
);

router.get('/', getDepartments);
router.get('/:id', getDepartment);

router.put(
  '/:id',
  authorizeRoles('ADMIN'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Code cannot be empty'),
  ],
  updateDepartment
);

router.delete('/:id', authorizeRoles('ADMIN'), deleteDepartment);

export default router;
