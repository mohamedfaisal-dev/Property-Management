export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROPERTIES: '/properties',
  TENANTS: '/tenants',
  BILLS: '/bills',
  ANALYTICS: '/analytics',
  EXPENSES: '/expenses',
  SETTINGS: '/settings',
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  PROPERTIES: '/api/properties',
  TENANTS: '/api/tenants',
  BILLS: '/api/bills',
  ANALYTICS: '/api/analytics',
  EXPENSES: '/api/expenses',
} as const;
