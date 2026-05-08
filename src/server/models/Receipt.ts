import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';

export type ReceiptStatus = 'SENT' | 'FAILED' | 'PENDING';

export interface ReceiptAttributes {
  id?: number;
  bill_id: number;
  tenant_id: number;
  admin_id: number;
  sent_date?: Date;
  sent_to_tenant: boolean;
  sent_to_admin: boolean;
  sent_to_owner: boolean;
  tenant_email?: string | null;
  admin_email?: string | null;
  owner_email?: string | null;
  pdf_path?: string | null;
  status: ReceiptStatus;
  error_message?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ReceiptInstance extends Model<ReceiptAttributes>, ReceiptAttributes {
  markAsSent(): Promise<ReceiptInstance>;
  markAsFailed(errorMessage: string): Promise<ReceiptInstance>;
}

export interface ReceiptModel extends ModelStatic<ReceiptInstance> {
  findByAdminId(adminId: number, options?: Record<string, unknown>): Promise<ReceiptInstance[]>;
  findByTenantId(tenantId: number, options?: Record<string, unknown>): Promise<ReceiptInstance[]>;
  findByBillId(billId: number, options?: Record<string, unknown>): Promise<ReceiptInstance[]>;
  findSentReceipts(adminId: number, options?: Record<string, unknown>): Promise<ReceiptInstance[]>;
  findFailedReceipts(adminId: number, options?: Record<string, unknown>): Promise<ReceiptInstance[]>;
}

const Receipt = sequelize.define<ReceiptInstance>('Receipt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bill_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'bills', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  admin_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'admins', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  sent_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  sent_to_tenant: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  sent_to_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  sent_to_owner: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  tenant_email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
  admin_email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
  owner_email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
  pdf_path: { type: DataTypes.STRING(500), allowNull: true },
  status: {
    type: DataTypes.ENUM('SENT', 'FAILED', 'PENDING'),
    allowNull: false, defaultValue: 'PENDING',
    validate: { isIn: [['SENT', 'FAILED', 'PENDING']] },
  },
  error_message: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['bill_id'] }, { fields: ['tenant_id'] }, { fields: ['admin_id'] },
    { fields: ['sent_date'] }, { fields: ['status'] },
  ],
}) as unknown as ReceiptModel;

(Receipt as any).prototype.markAsSent = function (this: ReceiptInstance) {
  this.status = 'SENT';
  return (this as any).save();
};

(Receipt as any).prototype.markAsFailed = function (this: ReceiptInstance, errorMessage: string) {
  this.status = 'FAILED';
  this.error_message = errorMessage;
  return (this as any).save();
};

(Receipt as any).findByAdminId = (adminId: number, options: Record<string, unknown> = {}) =>
  (Receipt as any).findAll({ where: { admin_id: adminId }, ...options });

(Receipt as any).findByTenantId = (tenantId: number, options: Record<string, unknown> = {}) =>
  (Receipt as any).findAll({ where: { tenant_id: tenantId }, ...options });

(Receipt as any).findByBillId = (billId: number, options: Record<string, unknown> = {}) =>
  (Receipt as any).findAll({ where: { bill_id: billId }, ...options });

(Receipt as any).findSentReceipts = (adminId: number, options: Record<string, unknown> = {}) =>
  (Receipt as any).findAll({ where: { admin_id: adminId, status: 'SENT' }, ...options });

(Receipt as any).findFailedReceipts = (adminId: number, options: Record<string, unknown> = {}) =>
  (Receipt as any).findAll({ where: { admin_id: adminId, status: 'FAILED' }, ...options });

export default Receipt;
