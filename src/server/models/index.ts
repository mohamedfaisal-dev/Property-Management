import Admin from './Admin';
import Property from './Property';
import Tenant from './Tenant';
import Bill from './Bill';
import Receipt from './Receipt';
import Profit from './Profit';
import Budget from './Budget';
import Expense from './Expense';
import { sequelize } from '../config/database';

// ─────────────────────────────────────────────────────────────────────────────
// Define Associations
// ─────────────────────────────────────────────────────────────────────────────

// Admin -> Property (1:M)
Admin.hasMany(Property, { foreignKey: 'admin_id', as: 'properties' });
Property.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// Admin -> Tenant (1:M)
Admin.hasMany(Tenant, { foreignKey: 'admin_id', as: 'tenants' });
Tenant.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// Admin -> Bill (1:M)
Admin.hasMany(Bill, { foreignKey: 'admin_id', as: 'bills' });
Bill.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// Admin -> Receipt (1:M)
Admin.hasMany(Receipt, { foreignKey: 'admin_id', as: 'receipts' });
Receipt.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// Admin -> Profit (1:1)
Admin.hasOne(Profit, { foreignKey: 'admin_id', as: 'profit' });
Profit.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

// Property -> Tenant (1:M)
Property.hasMany(Tenant, { foreignKey: 'property_id', as: 'tenants' });
Tenant.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

// Property -> Bill (1:M)
Property.hasMany(Bill, { foreignKey: 'property_id', as: 'bills' });
Bill.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

// Tenant -> Bill (1:M)
Tenant.hasMany(Bill, { foreignKey: 'tenant_id', as: 'bills' });
Bill.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Bill -> Receipt (1:M)
Bill.hasMany(Receipt, { foreignKey: 'bill_id', as: 'receipts' });
Receipt.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

// Property -> Budget (1:M)
Property.hasMany(Budget, { foreignKey: 'property_id', as: 'budgets' });
Budget.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

// ─────────────────────────────────────────────────────────────────────────────
// Database Helpers
// ─────────────────────────────────────────────────────────────────────────────

const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

const syncDatabase = async (): Promise<void> => {
  try {
    // Only alter in development. In production, use migrations!
    const isDev = process.env.NODE_ENV === 'development';
    await sequelize.sync({ alter: isDev });
    console.log(`✅ Database models synchronized ${isDev ? '(with alter)' : ''}.`);
  } catch (error) {
    console.error('❌ Failed to synchronize database models:', error);
    process.exit(1);
  }
};

export {
  Admin,
  Property,
  Tenant,
  Bill,
  Receipt,
  Profit,
  Budget,
  Expense,
  sequelize,
  testConnection,
  syncDatabase,
};
