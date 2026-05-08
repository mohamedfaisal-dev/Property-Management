import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
} from '../controllers/propertyController';
import { verifyToken, isAdmin } from '../middleware/auth';
import { validateProperty, validateId, validatePagination } from '../middleware/validation';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('Error creating uploads directory:', err);
}

// Configure multer for file uploads (disk storage)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    // Basic image filter
    if (!file.mimetype.startsWith('image/')) return cb(null, false);
    cb(null, true);
  },
});

// All routes require authentication and admin privileges
router.use(verifyToken, isAdmin);

// Property management routes
router.get('/', ...validatePagination, getAllProperties);
router.get('/stats', getPropertyStats);
router.get('/:id', ...validateId, getPropertyById);
router.post('/', upload.single('photo'), ...validateProperty, createProperty);
router.put('/:id', upload.single('photo'), ...validateId, ...validateProperty, updateProperty);
router.delete('/:id', ...validateId, deleteProperty);

export default router;
