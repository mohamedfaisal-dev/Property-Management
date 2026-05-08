import { DataTypes, Model, ModelStatic, Op } from 'sequelize';
import { sequelize } from '../config/database';

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'RECEIPT_SENT';
export type BillLanguage = 'en' | 'fr';

export interface BillAttributes {
  id?: number;
  tenant_id: number;
  property_id: number;
  admin_id: number;
  amount: number;
  rent_amount?: number | null;
  charges?: number | null;
  total_amount?: number | null;
  month: string;        // YYYY-MM
  due_date: string;
  status: BillStatus;
  payment_date?: string | null;
  description?: string | null;
  bill_date: string;
  language: BillLanguage;
  pdf_path?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface BillInstance extends Model<BillAttributes>, BillAttributes {
  markAsReceiptSent(): Promise<BillInstance>;
  markAsPaid(): Promise<BillInstance>;
  markAsOverdue(): Promise<BillInstance>;
}

export interface BillModel extends ModelStatic<BillInstance> {
  findByAdminId(adminId: number, options?: Record<string, unknown>): Promise<BillInstance[]>;
  findByTenantId(tenantId: number, options?: Record<string, unknown>): Promise<BillInstance[]>;
  findByPropertyId(propertyId: number, options?: Record<string, unknown>): Promise<BillInstance[]>;
  findPendingBills(adminId: number, options?: Record<string, unknown>): Promise<BillInstance[]>;
  findOverdueBills(adminId: number, options?: Record<string, unknown>): Promise<BillInstance[]>;
}

const Bill = sequelize.define<BillInstance>('Bill', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
  },
  property_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
  },
  admin_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'admins', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
  },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0, max: 1_000_000 } },
  rent_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0, max: 1_000_000 } },
  charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0, validate: { min: 0, max: 1_000_000 } },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0, max: 1_000_000 } },
  month: { type: DataTypes.STRING(7), allowNull: false, validate: { is: /^\d{4}-\d{2}$/ } },
  due_date: { type: DataTypes.DATEONLY, allowNull: false, validate: { isDate: true } },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'OVERDUE', 'RECEIPT_SENT'),
    allowNull: false, defaultValue: 'PENDING',
    validate: { isIn: [['PENDING', 'PAID', 'OVERDUE', 'RECEIPT_SENT']] },
  },
  payment_date: { type: DataTypes.DATEONLY, allowNull: true, validate: { isDate: true } },
  description: { type: DataTypes.TEXT, allowNull: true, defaultValue: 'Monthly rent payment' },
  bill_date: { type: DataTypes.DATEONLY, allowNull: false, validate: { isDate: true } },
  language: {
    type: DataTypes.ENUM('en', 'fr'),
    allowNull: false, defaultValue: 'fr',
    validate: { isIn: [['en', 'fr']] },
  },
  pdf_path: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'bills',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['tenant_id'] }, { fields: ['property_id'] }, { fields: ['admin_id'] },
    { fields: ['status'] }, { fields: ['due_date'] }, { fields: ['month'] },
    { unique: true, fields: ['tenant_id', 'month'] },
  ],
}) as unknown as BillModel;

// ─── Instance methods ────────────────────────────────────────────────────────
(Bill as any).prototype.markAsReceiptSent = function (this: BillInstance) {
  this.status = 'RECEIPT_SENT';
  return (this as any).save();
};
(Bill as any).prototype.markAsPaid = function (this: BillInstance) {
  this.status = 'PAID';
  return (this as any).save();
};
(Bill as any).prototype.markAsOverdue = function (this: BillInstance) {
  this.status = 'OVERDUE';
  return (this as any).save();
};

// ─── Static methods ──────────────────────────────────────────────────────────
(Bill as any).findByAdminId = (adminId: number, options: Record<string, unknown> = {}) =>
  (Bill as any).findAll({ where: { admin_id: adminId }, ...options });

(Bill as any).findByTenantId = (tenantId: number, options: Record<string, unknown> = {}) =>
  (Bill as any).findAll({ where: { tenant_id: tenantId }, ...options });

(Bill as any).findByPropertyId = (propertyId: number, options: Record<string, unknown> = {}) =>
  (Bill as any).findAll({ where: { property_id: propertyId }, ...options });

(Bill as any).findPendingBills = (adminId: number, options: Record<string, unknown> = {}) =>
  (Bill as any).findAll({ where: { admin_id: adminId, status: 'PENDING' }, ...options });

(Bill as any).findOverdueBills = (adminId: number, options: Record<string, unknown> = {}) => {
  const today = new Date().toISOString().split('T')[0];
  return (Bill as any).findAll({
    where: { admin_id: adminId, status: 'OVERDUE', due_date: { [Op.lt]: today } },
    ...options,
  });
};

export default Bill;
