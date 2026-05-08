import { Router } from 'express';
import { register, login, getProfile, updateProfile, logout } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { validateLogin, validateAdmin } from '../middleware/validation';

const router = Router();

// Public routes
router.post('/register', ...validateAdmin, register);
router.post('/login', ...validateLogin, login);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/logout', verifyToken, logout);

export default router;
