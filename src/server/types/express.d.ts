import { Model } from 'sequelize';

// Augment Express Request to carry our admin & user objects
declare global {
  namespace Express {
    interface Request {
      admin?: AdminInstance;
      user?: {
        id: number;
        role: string;
        email: string;
      };
    }
  }
}

export interface AdminInstance extends Model {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): Omit<AdminInstance, 'password'>;
}

export interface PropertyInstance extends Model {
  id: number;
  admin_id: number;
  title: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postal_code: string;
  country?: string;
  property_type?: 'APARTMENT' | 'HOUSE' | 'CONDO' | 'STUDIO' | 'OTHER';
  monthly_rent?: number;
  photo?: string;
  number_of_halls?: number;
  number_of_kitchens?: number;
  number_of_bathrooms?: number;
  number_of_parking_spaces?: number;
  number_of_rooms?: number;
  number_of_gardens?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TenantInstance extends Model {
  id: number;
  admin_id: number;
  property_id: number;
  name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  rent_amount?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PENDING';
  created_at: Date;
  updated_at: Date;
}

export interface BillInstance extends Model {
  id: number;
  admin_id: number;
  tenant_id: number;
  property_id: number;
  amount: number;
  month: string;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'RECEIPT_SENT';
  description?: string;
  pdf_path?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseInstance extends Model {
  id: number;
  admin_id: number;
  property_id: number;
  amount: number;
  month: string;
  category?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetInstance extends Model {
  id: number;
  property_id: number;
  month: string;
  budgeted_income: number;
  budgeted_expenses: number;
  created_at: Date;
  updated_at: Date;
}
