import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Property, Admin, Tenant } from '../models';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
type PropertyType = 'APARTMENT' | 'HOUSE' | 'CONDO' | 'STUDIO' | 'OTHER';

interface CreatePropertyBody {
  title: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postal_code: string;
  country?: string;
  property_type?: PropertyType;
  monthly_rent?: number;
  number_of_halls?: string | number;
  number_of_kitchens?: string | number;
  number_of_bathrooms?: string | number;
  number_of_parking_spaces?: string | number;
  number_of_rooms?: string | number;
  number_of_gardens?: string | number;
}

interface WhereClause {
  admin_id: number;
  [key: string]: unknown;
}

// -----------------------------------------------------------------
// Helper: parse numeric field, return undefined if invalid
// -----------------------------------------------------------------
const toIntOrUndef = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
};

// -----------------------------------------------------------------
// Helper: parse numeric field, keep previous value if invalid
// -----------------------------------------------------------------
const toIntOrKeep = (v: unknown, prev: number | undefined): number | undefined => {
  if (v === undefined || v === null || v === '') return prev;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : prev;
};

// -----------------------------------------------------------------
// Get all properties with pagination and filters
// -----------------------------------------------------------------
export const getAllProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const propertyType = (req.query.property_type as string) || '';
    const city = (req.query.city as string) || '';
    const offset = (page - 1) * limit;

    // Build where clause — ALWAYS scope to logged-in admin
    const whereClause: WhereClause = { admin_id: req.admin!.id };

    if (search) {
      whereClause[Op.or as unknown as string] = [
        { title: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { country: { [Op.like]: `%${search}%` } },
      ];
    }

    if (propertyType) whereClause.property_type = propertyType;
    if (city) whereClause.city = { [Op.like]: `%${city}%` };

    const { count, rows: properties } = await (Property as any).findAndCountAll({
      where: whereClause,
      include: [
        { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] },
        { model: Tenant, as: 'tenants', attributes: ['id', 'name', 'email', 'status'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        properties,
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
  } catch (error: any) {
    console.error('Get all properties error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// -----------------------------------------------------------------
// Get property by ID
// -----------------------------------------------------------------
export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await (Property as any).findOne({
      where: { id, admin_id: req.admin!.id },
      include: [
        { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] },
        {
          model: Tenant,
          as: 'tenants',
          attributes: ['id', 'name', 'email', 'phone', 'lease_start', 'lease_end', 'rent_amount', 'status'],
          required: false,
        },
      ],
    });

    if (!property) {
      res.status(404).json({ success: false, error: 'Property not found' });
      return;
    }

    res.json({ success: true, data: { property } });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Create new property
// -----------------------------------------------------------------
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title, description, address, city, state, postal_code, country,
      property_type, monthly_rent,
      number_of_halls, number_of_kitchens, number_of_bathrooms,
      number_of_parking_spaces, number_of_rooms, number_of_gardens,
    } = req.body as CreatePropertyBody;

    // Derive photo URL if uploaded
    let photoUrl: string | null = null;
    if (req.file?.filename) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Debug: log incoming numeric fields
    if (process.env.NODE_ENV === 'development') {
      console.log('CreateProperty body numeric fields:', {
        number_of_halls, number_of_kitchens, number_of_bathrooms,
        number_of_parking_spaces, number_of_rooms, number_of_gardens,
      });
    }

    const property = await (Property as any).create({
      admin_id: req.admin!.id,
      title, description, address, city, state, postal_code, country,
      property_type, monthly_rent,
      photo: photoUrl ?? undefined,
      number_of_halls: toIntOrUndef(number_of_halls),
      number_of_kitchens: toIntOrUndef(number_of_kitchens),
      number_of_bathrooms: toIntOrUndef(number_of_bathrooms),
      number_of_parking_spaces: toIntOrUndef(number_of_parking_spaces),
      number_of_rooms: toIntOrUndef(number_of_rooms),
      number_of_gardens: toIntOrUndef(number_of_gardens),
    });

    // Fetch the property with admin details
    const propertyWithAdmin = await (Property as any).findByPk(property.id, {
      include: [{ model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }],
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property: propertyWithAdmin },
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Update property
// -----------------------------------------------------------------
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title, description, address, city, state, postal_code, country,
      property_type, monthly_rent,
      number_of_halls, number_of_kitchens, number_of_bathrooms,
      number_of_parking_spaces, number_of_rooms, number_of_gardens,
    } = req.body as CreatePropertyBody;

    const property = await (Property as any).findOne({
      where: { id, admin_id: req.admin!.id },
    });
    if (!property) {
      res.status(404).json({ success: false, error: 'Property not found' });
      return;
    }

    // Derive photo URL if uploaded (optional update)
    let updatedPhotoUrl: string = property.photo;
    if (req.file?.filename) {
      updatedPhotoUrl = `/uploads/${req.file.filename}`;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('UpdateProperty body numeric fields:', {
        number_of_halls, number_of_kitchens, number_of_bathrooms,
        number_of_parking_spaces, number_of_rooms, number_of_gardens,
      });
    }

    await property.update({
      title, description, address, city, state, postal_code, country,
      property_type, monthly_rent,
      photo: updatedPhotoUrl,
      number_of_halls: toIntOrKeep(number_of_halls, property.number_of_halls),
      number_of_kitchens: toIntOrKeep(number_of_kitchens, property.number_of_kitchens),
      number_of_bathrooms: toIntOrKeep(number_of_bathrooms, property.number_of_bathrooms),
      number_of_parking_spaces: toIntOrKeep(number_of_parking_spaces, property.number_of_parking_spaces),
      number_of_rooms: toIntOrKeep(number_of_rooms, property.number_of_rooms),
      number_of_gardens: toIntOrKeep(number_of_gardens, property.number_of_gardens),
    });

    // Fetch the updated property with admin details
    const updatedProperty = await (Property as any).findByPk(id, {
      include: [{ model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }],
    });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty },
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Delete property
// -----------------------------------------------------------------
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await (Property as any).findOne({
      where: { id, admin_id: req.admin!.id },
    });
    if (!property) {
      res.status(404).json({ success: false, error: 'Property not found' });
      return;
    }

    await property.destroy();

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// -----------------------------------------------------------------
// Get property statistics
// -----------------------------------------------------------------
export const getPropertyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const whereClause = { admin_id: req.admin!.id };

    const totalProperties: number = await (Property as any).count({ where: whereClause });

    const propertiesByType: unknown[] = await (Property as any).findAll({
      where: whereClause,
      attributes: [
        'property_type',
        [(Property as any).sequelize.fn('COUNT', (Property as any).sequelize.col('id')), 'count'],
      ],
      group: ['property_type'],
    });

    const propertiesByCity: unknown[] = await (Property as any).findAll({
      where: whereClause,
      attributes: [
        'city',
        [(Property as any).sequelize.fn('COUNT', (Property as any).sequelize.col('id')), 'count'],
      ],
      group: ['city'],
      order: [[(Property as any).sequelize.fn('COUNT', (Property as any).sequelize.col('id')), 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: { totalProperties, propertiesByType, topCities: propertiesByCity },
    });
  } catch (error) {
    console.error('Get property stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
