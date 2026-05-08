import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import session from 'express-session';
import compression from 'compression';
import path from 'path';
import 'dotenv/config';

import { testConnection, syncDatabase } from './models';
import Admin from './models/Admin';
import Bill from './models/Bill';
import Tenant from './models/Tenant';
import Property from './models/Property';
import billScheduler from './services/billScheduler';
import cronService from './services/cronService';
import PDFService from './services/pdfService';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admins';
import propertyRoutes from './routes/properties';
import tenantRoutes from './routes/tenants';
import billRoutes from './routes/bills';
import analyticsRoutes from './routes/analytics';
import expensesRoutes from './routes/expenses';

const app = express();
const PORT = process.env.PORT || 4002;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// CORS configuration (allow Next.js front-end on port 3000)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Cache-Control']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000', 10),
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many auth attempts',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// --- UNIQUE LOGIC: Ultra-Fast Media Caching ---
const STATIC_DR = path.join(process.cwd(), 'uploads');
app.use(['/api/uploads', '/uploads'], (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'public, max-age=2592000, immutable');
  next();
}, express.static(STATIC_DR));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

app.get('/api/cron/status', (req: Request, res: Response) => {
  try {
    const status = cronService.getJobStatuses();
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/generate-bills', async (req: Request, res: Response) => {
    try {
      const result = await cronService.triggerMonthlyBillGeneration(req.body.month);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/test/download-pdf/:billId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { billId } = req.params;

      const bill = await (Bill as any).findOne({
        where: { id: billId },
        include: [
          { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'email', 'phone'] },
          { model: Property, as: 'property', attributes: ['id', 'title', 'address', 'city', 'monthly_rent'] },
          { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }
        ]
      });

      if (!bill) {
        res.status(404).json({ success: false, message: 'Bill not found' });
        return;
      }

      if (bill.pdf_path) {
        const fsLocal = await import('fs');
        try {
          const stat = fsLocal.statSync(bill.pdf_path);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="facture-${bill.id}-${bill.month}.pdf"`);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Length', stat.size);
          fsLocal.createReadStream(bill.pdf_path).pipe(res);
        } catch {
          (PDFService as any).streamBillPDF(res, bill);
        }
      } else {
        (PDFService as any).streamBillPDF(res, bill);
      }
    } catch (error: any) {
      console.error('Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expenses', expensesRoutes);

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Global error handler:`, error.message);
  if (error.name === 'SequelizeValidationError') {
    res.status(400).json({ success: false, error: 'Validation error' });
    return;
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    res.status(400).json({ success: false, error: 'Duplicate entry' });
    return;
  }
  if (error.name === 'SequelizeConnectionError') {
    res.status(503).json({ success: false, error: 'Database connection error' });
    return;
  }
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
});

export default app;
