import { Router } from 'express';
import { body } from 'express-validator';
import {
  createBatch,
  getBatches,
  getBatch,
  updateBatch,
  deleteBatch,
  addSubject,
  removeSubject,
} from '../controllers/batch.controller';
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
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Invalid semester'),
    body('batchSize').isInt({ min: 1 }).withMessage('Batch size must be positive'),
  ],
  createBatch
);

router.get('/', getBatches);
router.get('/:id', getBatch);

router.put('/:id', authorizeRoles('ADMIN'), updateBatch);
router.delete('/:id', authorizeRoles('ADMIN'), deleteBatch);

router.post(
  '/:id/subjects',
  authorizeRoles('ADMIN'),
  [body('subjectId').notEmpty().withMessage('Subject ID is required')],
  addSubject
);

router.delete('/:id/subjects/:subjectId', authorizeRoles('ADMIN'), removeSubject);

export default router;
