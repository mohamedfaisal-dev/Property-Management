// Type declarations for the API module
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    admin: {
      id: number;
      name: string;
      email: string;
      role: string;
      status: string;
    };
    token: string;
  };
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
}

export interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  property_id?: number;
  created_at?: string;
}

export interface Property {
  id: number;
  title: string;
  address: string;
  city: string;
  country: string;
  property_type: string;
  monthly_rent: number;
  description?: string;
  photo?: string;
  created_at?: string;
}

export interface Bill {
  id: number;
  tenant_id: number;
  property_id: number;
  amount: number;
  month: string;
  status: string;
  created_at?: string;
}

export interface Expense {
  id: number;
  admin_id: number;
  property_id?: number;
  type: string;
  amount: number;
  date: string;
  description?: string;
  created_at?: string;
}

// API function declarations
export declare function login(email: string, password: string): Promise<{ data: LoginResponse }>;
export declare function me(): Promise<{ data: ApiResponse<{ admin: Admin }> }>;
export declare function updateProfile(payload: Partial<Admin>): Promise<{ data: ApiResponse }>;
export declare function registerAdmin(payload: Omit<Admin, 'id'>): Promise<{ data: ApiResponse }>;

export declare function listAdmins(): Promise<{ data: ApiResponse<{ admins: Admin[] }> }>;
export declare function createAdmin(payload: Omit<Admin, 'id'>): Promise<{ data: ApiResponse }>;
export declare function deleteAdmin(id: number | string): Promise<{ data: ApiResponse }>;
export declare function updateAdmin(id: number | string, payload: Partial<Admin>): Promise<{ data: ApiResponse }>;
export declare function getAdmins(): Promise<{ data: ApiResponse<{ admins: Admin[] }> }>;
export declare function addAdmin(payload: Omit<Admin, 'id'>): Promise<{ data: ApiResponse }>;

export declare function listTenants(): Promise<{ data: ApiResponse<{ tenants: Tenant[] }> }>;
export declare function createTenant(payload: Omit<Tenant, 'id'>): Promise<{ data: ApiResponse }>;
export declare function updateTenant(id: number | string, payload: Partial<Tenant>): Promise<{ data: ApiResponse }>;
export declare function deleteTenantApi(id: number | string): Promise<{ data: ApiResponse }>;

export declare function listProperties(): Promise<{ data: ApiResponse<{ properties: Property[] }> }>;
export declare function createProperty(payload: FormData | Omit<Property, 'id'>): Promise<{ data: ApiResponse }>;
export declare function updateProperty(id: number | string, payload: FormData | Partial<Property>): Promise<{ data: ApiResponse }>;
export declare function deleteProperty(id: number | string): Promise<{ data: ApiResponse }>;

export declare function listBills(params?: any): Promise<{ data: ApiResponse<{ bills: Bill[] }> }>;
export declare function getBillsStats(): Promise<{ data: ApiResponse }>;
export declare function getBillById(id: number | string): Promise<{ data: ApiResponse<{ bill: Bill }> }>;
export declare function createBill(payload: Omit<Bill, 'id'>): Promise<{ data: ApiResponse }>;
export declare function updateBill(id: number | string, payload: Partial<Bill>): Promise<{ data: ApiResponse }>;
export declare function deleteBill(id: number | string): Promise<{ data: ApiResponse }>;
export declare function getReceiptHistory(id: number | string): Promise<{ data: ApiResponse }>;
export declare function markBillAsPaid(id: number | string): Promise<{ data: ApiResponse }>;
export declare function undoPayment(id: number | string): Promise<{ data: ApiResponse }>;
export declare function getTotalProfit(): Promise<{ data: ApiResponse }>;

export declare function getAnalyticsOverview(params?: any): Promise<{ data: ApiResponse }>;
export declare function getDashboardSummary(): Promise<{ data: ApiResponse<{ totalProperties: number; activeTenants: number; monthlyRevenue: number; pendingBills: number }> }>;

export declare function createExpense(payload: Omit<Expense, 'id'>): Promise<{ data: ApiResponse }>;
export declare function listExpenses(): Promise<{ data: ApiResponse<{ expenses: Expense[] }> }>;
export declare function deleteExpense(id: number | string): Promise<{ data: ApiResponse }>;

// Default export interface
export interface ApiClient {
  login: typeof login;
  me: typeof me;
  updateProfile: typeof updateProfile;
  registerAdmin: typeof registerAdmin;
  listAdmins: typeof listAdmins;
  createAdmin: typeof createAdmin;
  deleteAdmin: typeof deleteAdmin;
  updateAdmin: typeof updateAdmin;
  getAdmins: typeof getAdmins;
  addAdmin: typeof addAdmin;
  listTenants: typeof listTenants;
  createTenant: typeof createTenant;
  updateTenant: typeof updateTenant;
  deleteTenantApi: typeof deleteTenantApi;
  listProperties: typeof listProperties;
  createProperty: typeof createProperty;
  updateProperty: typeof updateProperty;
  deleteProperty: typeof deleteProperty;
  listBills: typeof listBills;
  getBillsStats: typeof getBillsStats;
  getBillById: typeof getBillById;
  createBill: typeof createBill;
  updateBill: typeof updateBill;
  deleteBill: typeof deleteBill;
  getReceiptHistory: typeof getReceiptHistory;
  markBillAsPaid: typeof markBillAsPaid;
  undoPayment: typeof undoPayment;
  getTotalProfit: typeof getTotalProfit;
  getAnalyticsOverview: typeof getAnalyticsOverview;
  getDashboardSummary: typeof getDashboardSummary;
  createExpense: typeof createExpense;
  listExpenses: typeof listExpenses;
  deleteExpense: typeof deleteExpense;
  raw: any;
}

declare const api: ApiClient;
export default api;
