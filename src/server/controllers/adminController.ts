import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Admin } from '../models';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
interface WhereClause {
  [key: string]: unknown;
}

// -----------------------------------------------------------------
// Get all admins with pagination and filters
// -----------------------------------------------------------------
export const getAllAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const status = (req.query.status as string) || '';

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: WhereClause = {};

    if (search) {
      whereClause[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;

    const { count, rows: admins } = await (Admin as any).findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Get admin by ID
// -----------------------------------------------------------------
export const getAdminById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const admin = await (Admin as any).findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!admin) {
      res.status(404).json({ success: false, error: 'Admin not found' });
      return;
    }

    res.json({ success: true, data: { admin } });
  } catch (error) {
    console.error('Get admin by ID error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Create new admin
// -----------------------------------------------------------------
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({ success: false, error: 'Admin with this email already exists' });
      return;
    }

    // Create new admin
    const admin = await (Admin as any).create({ name, email, password, role, status });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Update admin
// -----------------------------------------------------------------
export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: 'ADMIN' | 'SUPER_ADMIN';
      status?: 'ACTIVE' | 'INACTIVE';
    };

    const admin = await (Admin as any).findByPk(id);
    if (!admin) {
      res.status(404).json({ success: false, error: 'Admin not found' });
      return;
    }

    // Check if email is already taken by another admin
    if (email && email !== admin.email) {
      const existingAdmin = await (Admin as any).findByEmail(email);
      if (existingAdmin) {
        res.status(400).json({ success: false, error: 'Email already taken' });
        return;
      }
    }

    // Update admin
    const updateData: Partial<{ name: string; email: string; password: string; role: string; status: string }> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    await admin.update(updateData);

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Delete admin
// -----------------------------------------------------------------
export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const admin = await (Admin as any).findByPk(id);
    if (!admin) {
      res.status(404).json({ success: false, error: 'Admin not found' });
      return;
    }

    // Prevent deletion of the last SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      const superAdminCount = await (Admin as any).count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdminCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot delete the last super admin' });
        return;
      }
    }

    await admin.destroy();

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Get admin statistics
// -----------------------------------------------------------------
export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalAdmins, activeAdmins, superAdmins, regularAdmins] = await Promise.all([
      (Admin as any).count(),
      (Admin as any).count({ where: { status: 'ACTIVE' } }),
      (Admin as any).count({ where: { role: 'SUPER_ADMIN' } }),
      (Admin as any).count({ where: { role: 'ADMIN' } }),
    ]);

    res.json({
      success: true,
      data: { totalAdmins, activeAdmins, superAdmins, regularAdmins },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
