import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const getApiBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 3000}/api`;
};

const apiBaseURL = getApiBaseURL();

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  decompress: true,
  maxRedirects: 3,
  validateStatus: (status: number) => status < 500,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    (config as any).metadata = { startTime: Date.now() };

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['X-Request-ID'] = `perf_${Math.random().toString(36).substr(2, 9)}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (!error.response) return Promise.reject(error);

    const status = error.response.status;
    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache duration

const getCachedData = (key: string): any => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any): void => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

export const clearCache = (): void => {
  cache.clear();
  console.log('API cache cleared');
};

const evictAnalyticsCache = (): void => {
  cache.delete('dashboard_summary');
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('analytics_overview_')) cache.delete(key);
  });
};

const fetchWithCache = async (key: string, fetchFn: () => Promise<AxiosResponse>): Promise<AxiosResponse> => {
  const cached = getCachedData(key);
  if (cached) return cached;
  const res = await fetchFn();
  setCachedData(key, res);
  return res;
};

export const login = (email: string, password: string): Promise<AxiosResponse> => api.post('/auth/login', { email, password });
export const me = (): Promise<AxiosResponse> => fetchWithCache('user_profile', () => api.get('/auth/profile'));
export const updateProfile = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('user_profile');
  evictAnalyticsCache();
  return api.put('/auth/profile', payload);
};
export const registerAdmin = (payload: any): Promise<AxiosResponse> => api.post('/auth/register', payload);

export const listAdmins = (): Promise<AxiosResponse> => fetchWithCache('admins_list', () => api.get('/admins'));
export const createAdmin = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('admins_list');
  return api.post('/admins', payload);
};
export const deleteAdmin = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete('admins_list');
  return api.delete(`/admins/${id}`);
};
export const updateAdmin = async (id: number | string, payload: any): Promise<AxiosResponse> => {
  cache.delete('admins_list');
  return api.put(`/admins/${id}`, payload);
};

export const getAdmins = () => listAdmins();
export const addAdmin = (payload: any) => createAdmin(payload);

export const listTenants = (): Promise<AxiosResponse> => fetchWithCache('tenants_list', () => api.get('/tenants'));
export const createTenant = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('tenants_list');
  evictAnalyticsCache();
  return api.post('/tenants', payload);
};
export const updateTenant = async (id: number | string, payload: any): Promise<AxiosResponse> => {
  cache.delete('tenants_list');
  evictAnalyticsCache();
  return api.put(`/tenants/${id}`, payload);
};
export const deleteTenantApi = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete('tenants_list');
  evictAnalyticsCache();
  return api.delete(`/tenants/${id}`);
};

export const listProperties = (): Promise<AxiosResponse> => fetchWithCache('properties_list', () => api.get('/properties'));
export const createProperty = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('properties_list');
  evictAnalyticsCache();
  return api.post('/properties', payload);
};
export const updateProperty = async (id: number | string, payload: any): Promise<AxiosResponse> => {
  cache.delete('properties_list');
  evictAnalyticsCache();
  return api.put(`/properties/${id}`, payload);
};
export const deleteProperty = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete('properties_list');
  evictAnalyticsCache();
  return api.delete(`/properties/${id}`);
};

export const listBills = (params: any = {}): Promise<AxiosResponse> => 
  fetchWithCache(`bills_list_${JSON.stringify(params)}`, () => api.get('/bills', { params }));
export const getBillsStats = (): Promise<AxiosResponse> => fetchWithCache('bills_stats', () => api.get('/bills/stats'));
export const getBillById = (id: number | string): Promise<AxiosResponse> => fetchWithCache(`bill_${id}`, () => api.get(`/bills/${id}`));
export const createBill = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('bills_stats');
  evictAnalyticsCache();
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('bills_list_')) cache.delete(key);
  });
  return api.post('/bills', payload);
};
export const updateBill = async (id: number | string, payload: any): Promise<AxiosResponse> => {
  cache.delete(`bill_${id}`);
  cache.delete('bills_stats');
  evictAnalyticsCache();
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('bills_list_')) cache.delete(key);
  });
  return api.put(`/bills/${id}`, payload);
};
export const deleteBill = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete(`bill_${id}`);
  cache.delete('bills_stats');
  evictAnalyticsCache();
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('bills_list_')) cache.delete(key);
  });
  return api.delete(`/bills/${id}`);
};
export const getReceiptHistory = (id: number | string): Promise<AxiosResponse> => 
  fetchWithCache(`receipt_history_${id}`, () => api.get(`/bills/${id}/receipts`));
export const markBillAsPaid = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete(`bill_${id}`);
  cache.delete('bills_stats');
  cache.delete('profits_total');
  evictAnalyticsCache();
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('bills_list_')) cache.delete(key);
  });
  return api.put(`/bills/${id}/pay`);
};
export const undoPayment = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete(`bill_${id}`);
  cache.delete('bills_stats');
  cache.delete('profits_total');
  evictAnalyticsCache();
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith('bills_list_')) cache.delete(key);
  });
  return api.put(`/bills/${id}/undo`);
};
export const getTotalProfit = (): Promise<AxiosResponse> => fetchWithCache('profits_total', () => api.get('/bills/profits/total'));

export const getAnalyticsOverview = (params: any = {}): Promise<AxiosResponse> => 
  fetchWithCache(`analytics_overview_${JSON.stringify(params)}`, () => api.get('/analytics/overview', { params }));
export const getDashboardSummary = (): Promise<AxiosResponse> => fetchWithCache('dashboard_summary', () => api.get('/analytics/dashboard-summary'));

export const createExpense = async (payload: any): Promise<AxiosResponse> => {
  cache.delete('expenses_list');
  evictAnalyticsCache();
  return api.post('/expenses', payload);
};
export const listExpenses = (): Promise<AxiosResponse> => fetchWithCache('expenses_list', () => api.get('/expenses'));
export const deleteExpense = async (id: number | string): Promise<AxiosResponse> => {
  cache.delete('expenses_list');
  evictAnalyticsCache();
  return api.delete(`/expenses/${id}`);
};

const apiClient = {
  login, me, updateProfile, registerAdmin,
  listAdmins, createAdmin, deleteAdmin, updateAdmin, getAdmins, addAdmin,
  listTenants, createTenant, updateTenant, deleteTenantApi,
  listProperties, createProperty, updateProperty, deleteProperty,
  listBills, getBillsStats, getBillById, createBill, updateBill, deleteBill,
  getReceiptHistory, markBillAsPaid, undoPayment, getTotalProfit,
  getAnalyticsOverview, getDashboardSummary,
  createExpense, listExpenses, deleteExpense,
  raw: api,
};

export default apiClient;
