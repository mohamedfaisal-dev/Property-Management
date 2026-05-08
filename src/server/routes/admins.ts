import { Router } from 'express';
import {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdminStats,
} from '../controllers/adminController';
import { verifyToken, isSuperAdmin } from '../middleware/auth';
import {
  validateAdmin,
  validateAdminUpdate,
  validateId,
  validatePagination,
} from '../middleware/validation';

const router = Router();

// All routes require authentication and super admin privileges
router.use(verifyToken, isSuperAdmin);

// Admin management routes
router.get('/', ...validatePagination, getAllAdmins);
router.get('/stats', getAdminStats);
router.get('/:id', ...validateId, getAdminById);
router.post('/', ...validateAdmin, createAdmin);
router.put('/:id', ...validateId, ...validateAdminUpdate, updateAdmin);
router.delete('/:id', ...validateId, deleteAdmin);

export default router;
