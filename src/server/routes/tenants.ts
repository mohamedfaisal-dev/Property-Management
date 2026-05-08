import { Router } from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantStats,
} from '../controllers/tenantController';
import { verifyToken, isAdmin } from '../middleware/auth';
import {
  validateTenant,
  validateId,
  validatePagination,
} from '../middleware/validation';

const router = Router();

// All routes require authentication and admin privileges
router.use(verifyToken, isAdmin);

// Tenant management routes
router.get('/', ...validatePagination, getAllTenants);
router.get('/stats', getTenantStats);
router.get('/:id', ...validateId, getTenantById);
router.post('/', ...validateTenant, createTenant);
router.put('/:id', ...validateId, ...validateTenant, updateTenant);
router.delete('/:id', ...validateId, deleteTenant);

export default router;
