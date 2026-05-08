import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { Admin } from '../models';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
interface AdminPayload {
  id: number;
  email: string;
  role: string;
}

interface AdminModel {
  id: number;
  email: string;
  role: string;
  toJSON(): Record<string, unknown>;
  comparePassword(password: string): Promise<boolean>;
  update(data: Partial<AdminModel>): Promise<void>;
}

// -----------------------------------------------------------------
// Generate JWT token
// -----------------------------------------------------------------
const generateToken = (admin: AdminModel): string => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '24h') as jwt.SignOptions['expiresIn'] }
  );
};

// -----------------------------------------------------------------
// Register new admin (SUPER_ADMIN only)
// -----------------------------------------------------------------
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'ADMIN', status = 'ACTIVE' } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: 'ADMIN' | 'SUPER_ADMIN';
      status?: 'ACTIVE' | 'INACTIVE';
    };

    // Check if admin already exists
    const existingAdmin = await (Admin as any).findByEmail(email);
    if (existingAdmin) {
      res.status(400).json({
        success: false,
        error: 'Admin with this email already exists',
      });
      return;
    }

    // Create new admin
    const admin = await (Admin as any).create({ name, email, password, role, status });

    // Generate token
    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: admin.toJSON(), token },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Login admin
// -----------------------------------------------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    // Find admin by email
    const admin: AdminModel | null = await (Admin as any).findActiveByEmail(email);
    if (!admin) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken(admin);

    res.json({
      success: true,
      message: 'Login successful',
      data: { admin: admin.toJSON(), token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Get current admin profile
// -----------------------------------------------------------------
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: { admin: req.admin } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Update admin profile
// -----------------------------------------------------------------
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    const adminId = req.admin?.id;

    const updateData: Partial<{ name: string; email: string; password: string }> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const admin: AdminModel | null = await (Admin as any).findByPk(adminId);
    if (!admin) {
      res.status(404).json({ success: false, error: 'Admin not found' });
      return;
    }

    // Check if email is already taken by another admin
    if (email && email !== (admin as any).email) {
      const existingAdmin = await (Admin as any).findByEmail(email);
      if (existingAdmin) {
        res.status(400).json({ success: false, error: 'Email already taken' });
        return;
      }
    }

    await admin.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Logout (client-side token removal)
// -----------------------------------------------------------------
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
