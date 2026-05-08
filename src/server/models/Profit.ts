import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProfitAttributes {
  id?: number;
  admin_id: number;
  total_profit: number;
  last_updated: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProfitInstance extends Model<ProfitAttributes>, ProfitAttributes {}

export interface ProfitModel extends ModelStatic<ProfitInstance> {
  findByAdminId(adminId: number): Promise<ProfitInstance | null>;
  incrementProfit(adminId: number, amount: number): Promise<ProfitInstance>;
  getTotalProfit(adminId: number): Promise<number>;
}

const Profit = sequelize.define<ProfitInstance>('Profit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'admins', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  total_profit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'profits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['admin_id'] },
    { unique: true, fields: ['admin_id'] },
  ],
}) as unknown as ProfitModel;

(Profit as any).findByAdminId = (adminId: number) =>
  (Profit as any).findOne({ where: { admin_id: adminId } });

(Profit as any).incrementProfit = async (adminId: number, amount: number): Promise<ProfitInstance> => {
  const profit: ProfitInstance | null = await (Profit as any).findByAdminId(adminId);

  if (profit) {
    profit.total_profit = parseFloat(String(profit.total_profit)) + parseFloat(String(amount));
    profit.last_updated = new Date();
    await (profit as any).save();
    return profit;
  }

  return (Profit as any).create({
    admin_id: adminId,
    total_profit: parseFloat(String(amount)),
    last_updated: new Date(),
  });
};

(Profit as any).getTotalProfit = async (adminId: number): Promise<number> => {
  const profit: ProfitInstance | null = await (Profit as any).findByAdminId(adminId);
  return profit ? parseFloat(String(profit.total_profit)) : 0;
};

export default Profit;
