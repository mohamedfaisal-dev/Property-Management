import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';

export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PENDING';

export interface TenantAttributes {
  id?: number;
  admin_id: number;
  property_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  rent_amount?: number | null;
  join_date?: string;
  status: TenantStatus;
  created_at?: Date;
  updated_at?: Date;
}

export interface TenantInstance extends Model<TenantAttributes>, TenantAttributes {}

export interface TenantModel extends ModelStatic<TenantInstance> {
  findByAdminId(adminId: number, options?: Record<string, unknown>): Promise<TenantInstance[]>;
  findByIdAndAdminId(id: number, adminId: number, options?: Record<string, unknown>): Promise<TenantInstance | null>;
  findByPropertyId(propertyId: number, options?: Record<string, unknown>): Promise<TenantInstance[]>;
}

const Tenant = sequelize.define<TenantInstance>('Tenant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  admin_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'admins', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
  },
  property_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING(255), allowNull: false,
    validate: { notEmpty: true, len: [2, 255] },
  },
  email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(50), allowNull: true, validate: { len: [10, 50] } },
  lease_start: { type: DataTypes.DATEONLY, allowNull: true, validate: { isDate: true } },
  lease_end: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
      isAfterStartDate(this: TenantInstance, value: string) {
        if (this.lease_start && value && new Date(value) <= new Date(this.lease_start as string)) {
          throw new Error('Lease end date must be after lease start date');
        }
      },
    },
  },
  rent_amount: {
    type: DataTypes.DECIMAL(10, 2), allowNull: true,
    validate: { min: 0, max: 1_000_000 },
  },
  join_date: {
    type: DataTypes.DATEONLY, allowNull: false,
    defaultValue: DataTypes.NOW, validate: { isDate: true },
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING'),
    allowNull: false, defaultValue: 'ACTIVE',
    validate: { isIn: [['ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING']] },
  },
}, {
  tableName: 'tenants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['admin_id'] }, { fields: ['property_id'] },
    { fields: ['status'] }, { fields: ['lease_start', 'lease_end'] },
  ],
}) as unknown as TenantModel;

(Tenant as any).findByAdminId = (adminId: number, options: Record<string, unknown> = {}) =>
  (Tenant as any).findAll({ where: { admin_id: adminId }, ...options });

(Tenant as any).findByIdAndAdminId = (id: number, adminId: number, options: Record<string, unknown> = {}) =>
  (Tenant as any).findOne({ where: { id, admin_id: adminId }, ...options });

(Tenant as any).findByPropertyId = (propertyId: number, options: Record<string, unknown> = {}) =>
  (Tenant as any).findAll({ where: { property_id: propertyId }, ...options });

export default Tenant;
