-- INDEXES FOR PROPERTY MANAGEMENT SYSTEM ON SUPABASE (POSTGRESQL)
-- Copy and paste these statements into your Supabase SQL Editor.
-- These indexes optimize query performance, foreign key joins, sorting, and aggregations,
-- thereby dramatically reducing DB CPU/RAM usage and cost.

-- Admins Table Indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- Properties Table Indexes
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- Tenants Table Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_admin_id ON tenants(admin_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Bills Table Indexes
CREATE INDEX IF NOT EXISTS idx_bills_admin_id ON bills(admin_id);
CREATE INDEX IF NOT EXISTS idx_bills_tenant_id ON bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bills_property_id ON bills(property_id);
CREATE INDEX IF NOT EXISTS idx_bills_month ON bills(month);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);

-- Expenses Table Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_admin_id ON expenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Budgets Table Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_property_id ON budgets(property_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);

-- Receipts Table Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_bill_id ON receipts(bill_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_admin_id ON receipts(admin_id);
