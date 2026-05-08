import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Admin } from '../models';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

// -----------------------------------------------------------------
// Verify JWT token
// -----------------------------------------------------------------
export const verifyToken: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const admin = await (Admin as any).findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!admin) {
      res.status(401).json({
        success: false,
        error: 'Invalid token. Admin not found.',
      });
      return;
    }

    if (admin.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: 'Account is inactive.',
      });
      return;
    }

    // Attach admin to both req.admin and req.user for compatibility
    req.admin = admin;
    req.user = { id: admin.id, role: admin.role, email: admin.email };
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, error: 'Invalid token.' });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Token expired.' });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// -----------------------------------------------------------------
// Check if admin has SUPER_ADMIN role
// -----------------------------------------------------------------
export const isSuperAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Super admin privileges required.',
    });
    return;
  }
  next();
};

// -----------------------------------------------------------------
// Check if admin has ADMIN or SUPER_ADMIN role
// -----------------------------------------------------------------
export const isAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.admin?.role ?? '')) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
    });
    return;
  }
  next();
};

// -----------------------------------------------------------------
// Check ownership (role-based; actual ownership enforced in queries)
// -----------------------------------------------------------------
export const checkOwnership = (_resourceType: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.admin?.role ?? '')) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient privileges.',
      });
      return;
    }
    next();
  };
};

// -----------------------------------------------------------------
// Optional auth middleware (doesn't fail if no token)
// -----------------------------------------------------------------
export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      const admin = await (Admin as any).findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
      });

      if (admin && admin.status === 'ACTIVE') {
        req.admin = admin;
      }
    }

    next();
  } catch {
    // Continue without authentication
    next();
  }
};
