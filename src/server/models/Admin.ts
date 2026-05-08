import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────────────────────────────────────
// Attribute interfaces
// ─────────────────────────────────────────────────────────────────────────────
export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';
export type AdminStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminAttributes {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  status: AdminStatus;
  created_at?: Date;
  updated_at?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model instance interface (extends Sequelize Model)
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminInstance extends Model<AdminAttributes>, AdminAttributes {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): Omit<AdminAttributes, 'password'>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static model interface (class-level methods)
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminModel extends ModelStatic<AdminInstance> {
  findByEmail(email: string): Promise<AdminInstance | null>;
  findActiveByEmail(email: string): Promise<AdminInstance | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Define model
// ─────────────────────────────────────────────────────────────────────────────
const Admin = sequelize.define<AdminInstance>('Admin', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true, len: [2, 255] },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true, notEmpty: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true, len: [6, 255] },
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'SUPER_ADMIN'),
    allowNull: false,
    defaultValue: 'ADMIN',
    validate: { isIn: [['ADMIN', 'SUPER_ADMIN']] },
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE',
    validate: { isIn: [['ACTIVE', 'INACTIVE']] },
  },
}, {
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (admin: AdminInstance) => {
      if (admin.password) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    },
    beforeUpdate: async (admin: AdminInstance) => {
      if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    },
  },
}) as unknown as AdminModel;

// ─────────────────────────────────────────────────────────────────────────────
// Instance methods
// ─────────────────────────────────────────────────────────────────────────────
(Admin as any).prototype.comparePassword = async function (
  this: AdminInstance,
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;

  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    if (isMatch) return true;
  } catch {
    // ignore — attempt fallback below
  }

  // Fallback: plaintext legacy password — accept once then rehash
  if (candidatePassword === this.password) {
    this.password = await bcrypt.hash(candidatePassword, 12);
    await (this as any).save();
    return true;
  }

  return false;
};

(Admin as any).prototype.toJSON = function (this: AdminInstance) {
  const values = { ...(this as any).get() } as Record<string, unknown>;
  delete values['password'];
  return values;
};

// ─────────────────────────────────────────────────────────────────────────────
// Static / class methods
// ─────────────────────────────────────────────────────────────────────────────
(Admin as any).findByEmail = function (email: string) {
  return (Admin as any).findOne({ where: { email } });
};

(Admin as any).findActiveByEmail = function (email: string) {
  return (Admin as any).findOne({
    where: {
      email: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('email')),
        email.toLowerCase()
      ),
      status: 'ACTIVE',
    },
  });
};

export default Admin;
