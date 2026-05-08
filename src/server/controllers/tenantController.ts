import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Tenant, Property, Admin } from '../models';

export const getAllTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const propertyId = (req.query.property_id as string) || '';

    const offset = (page - 1) * limit;

    const whereClause: any = { admin_id: (req.admin as any).id };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (propertyId) {
      whereClause.property_id = propertyId;
    }

    const { count, rows: tenants } = await (Tenant as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'property_type'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        tenants,
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
    console.error('Get all tenants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getTenantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await (Tenant as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
      include: [
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'property_type', 'monthly_rent'],
        },
      ],
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        tenant,
      },
    });
  } catch (error) {
    console.error('Get tenant by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      property_id,
      lease_start,
      lease_end,
      rent_amount,
      status = 'ACTIVE',
    } = req.body;

    const property = await (Property as any).findByPk(property_id);
    if (!property) {
      res.status(404).json({
        success: false,
        error: 'Property not found',
      });
      return;
    }

    if ((req.admin as any).role === 'ADMIN' && property.admin_id !== (req.admin as any).id) {
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only add tenants to your own properties.',
      });
      return;
    }

    const tenant = await (Tenant as any).create({
      admin_id: (req.admin as any).id,
      property_id,
      name,
      email,
      phone,
      lease_start,
      lease_end,
      rent_amount,
      status,
    });

    const tenantWithDetails = await (Tenant as any).findByPk(tenant.id, {
      include: [
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'property_type'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant: tenantWithDetails,
      },
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      property_id,
      lease_start,
      lease_end,
      rent_amount,
      status,
    } = req.body;

    const tenant = await (Tenant as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
    });
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    if (property_id && property_id !== tenant.property_id) {
      const property = await (Property as any).findByPk(property_id);
      if (!property) {
        res.status(404).json({
          success: false,
          error: 'Property not found',
        });
        return;
      }

      if ((req.admin as any).role === 'ADMIN' && property.admin_id !== (req.admin as any).id) {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only assign tenants to your own properties.',
        });
        return;
      }
    }

    await tenant.update({
      name,
      email,
      phone,
      property_id: property_id || tenant.property_id,
      lease_start,
      lease_end,
      rent_amount,
      status,
    });

    const updatedTenant = await (Tenant as any).findByPk(id, {
      include: [
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'property_type'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        tenant: updatedTenant,
      },
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await (Tenant as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
    });
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    await tenant.destroy();

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getTenantStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const whereClause = { admin_id: (req.admin as any).id };

    const totalTenants = await (Tenant as any).count({ where: whereClause });
    const activeTenants = await (Tenant as any).count({
      where: { ...whereClause, status: 'ACTIVE' },
    });
    const inactiveTenants = await (Tenant as any).count({
      where: { ...whereClause, status: 'INACTIVE' },
    });
    const expiredTenants = await (Tenant as any).count({
      where: { ...whereClause, status: 'EXPIRED' },
    });

    const tenantsByProperty = await (Tenant as any).findAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
        },
      ],
      attributes: [
        'property_id',
        [(Tenant as any).sequelize.fn('COUNT', (Tenant as any).sequelize.col('Tenant.id')), 'count'],
      ],
      group: ['property_id', 'property.id', 'property.title'],
      order: [[(Tenant as any).sequelize.fn('COUNT', (Tenant as any).sequelize.col('Tenant.id')), 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        inactiveTenants,
        expiredTenants,
        tenantsByProperty,
      },
    });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
