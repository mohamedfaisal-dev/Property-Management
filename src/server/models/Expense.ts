import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface ExpenseAttributes {
  id?: number;
  property_id?: number | null;
  admin_id: number;
  month: string; // YYYY-MM
  category: string;
  amount: number;
  notes?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ExpenseInstance extends Model<ExpenseAttributes>, ExpenseAttributes {}

const Expense = sequelize.define<ExpenseInstance>('Expense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  property_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for general expenses not tied to specific property
    references: { model: 'properties', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'admins', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  month: {
    type: DataTypes.STRING(7),
    allowNull: false,
    validate: { is: /^\d{4}-\d{2}$/ },
  },
  category: { type: DataTypes.STRING(100), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['property_id'] },
    { fields: ['admin_id'] },
    { fields: ['month'] },
    { fields: ['category'] },
  ],
});

export default Expense;
