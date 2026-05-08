import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'CONDO' | 'STUDIO' | 'OTHER';

export interface PropertyAttributes {
  id?: number;
  admin_id: number;
  title: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  postal_code: string;
  country?: string | null;
  property_type?: PropertyType;
  monthly_rent?: number | null;
  photo?: string | null;
  number_of_halls?: number | null;
  number_of_kitchens?: number | null;
  number_of_bathrooms?: number | null;
  number_of_parking_spaces?: number | null;
  number_of_rooms?: number | null;
  number_of_gardens?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PropertyInstance extends Model<PropertyAttributes>, PropertyAttributes {}

export interface PropertyModel extends ModelStatic<PropertyInstance> {
  findByAdminId(adminId: number, options?: Record<string, unknown>): Promise<PropertyInstance[]>;
  findByIdAndAdminId(id: number, adminId: number, options?: Record<string, unknown>): Promise<PropertyInstance | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Define model
// ─────────────────────────────────────────────────────────────────────────────
const Property = sequelize.define<PropertyInstance>('Property', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'admins', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true, len: [3, 255] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 2000] },
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: { notEmpty: true, len: [5, 500] },
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true, len: [2, 100] },
  },
  state: { type: DataTypes.STRING(100), allowNull: true, validate: { len: [2, 100] } },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { notEmpty: true, len: [3, 20] },
  },
  country: { type: DataTypes.STRING(100), allowNull: true, validate: { len: [2, 100] } },
  property_type: {
    type: DataTypes.ENUM('APARTMENT', 'HOUSE', 'CONDO', 'STUDIO', 'OTHER'),
    allowNull: false,
    defaultValue: 'APARTMENT',
    validate: { isIn: [['APARTMENT', 'HOUSE', 'CONDO', 'STUDIO', 'OTHER']] },
  },
  monthly_rent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: { min: 0, max: 1_000_000 },
  },
  photo: { type: DataTypes.STRING(500), allowNull: true },
  number_of_halls: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  number_of_kitchens: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  number_of_bathrooms: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  number_of_parking_spaces: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  number_of_rooms: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  number_of_gardens: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
}, {
  tableName: 'properties',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['admin_id'] },
    { fields: ['property_type'] },
    { fields: ['city', 'country'] },
  ],
}) as unknown as PropertyModel;

// ─────────────────────────────────────────────────────────────────────────────
// Static methods
// ─────────────────────────────────────────────────────────────────────────────
(Property as any).findByAdminId = function (adminId: number, options: Record<string, unknown> = {}) {
  return (Property as any).findAll({ where: { admin_id: adminId }, ...options });
};

(Property as any).findByIdAndAdminId = function (id: number, adminId: number, options: Record<string, unknown> = {}) {
  return (Property as any).findOne({ where: { id, admin_id: adminId }, ...options });
};

export default Property;
