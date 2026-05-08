"use client";
import { useEffect, useState } from 'react';
import { Search, Bell, Heart, X, Star, MapPin, Users, Bed, Bath, Wifi, Car, Coffee, Tv, LayoutDashboard, Building2, CreditCard, BarChart3, Settings as SettingsIcon, Shield, DollarSign, TrendingUp, Plus, Download, HelpCircle } from 'lucide-react';
// import { useRouter } from 'next/navigation';
import TunnetSectionFixed from '../../components/TunnetSectionFixed';
// Removed OverviewDashboard import due to type resolution issues
// import PaymentTracking from '../../components/PaymentTracking';
import PaymentsManagement from '../../components/PaymentsManagement';
import PropertiesSection from '../../components/PropertiesSection';
import AdminManagement from '../admin-management/page';
import ExpenseAnalytics from '../../components/ExpenseAnalytics';
import ApiDiagnostics from '../../components/ApiDiagnostics';
import { listExpenses, listProperties, listTenants, getBillsStats, listBills, getDashboardSummary } from '../../api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Types
interface DashboardProperty {
  id: number;
  title?: string;
  name?: string;
  rent?: number;
  monthly_rent?: number;
  [key: string]: any;
}


interface Activity {
  id: string;
  type: string;
  message: string;
  detail: string;
  time: string;
  color: string;
}

// Real Statistics Component
const RealStatistics = ({ onError }: { onError?: (hasError: boolean) => void }) => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    pendingBills: 0,
    loading: true,
    error: null as string | null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check if token exists before making API calls
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, skipping API calls');
          setStats(prev => ({ ...prev, loading: false, error: 'No authentication token' }));
          onError?.(true);
          return;
        }

        setStats(prev => ({ ...prev, loading: true, error: null }));

        // --- UNIQUE LOGIC: Unified Speed Dispatcher ---
        // Instead of 3-4 separate requests, we fire exactly ONE request 
        // to a optimized backend aggregation route.
        const response = await getDashboardSummary();
        const data: any = response?.data?.data || {};

        setStats({
          totalProperties: data.totalProperties || 0,
          activeTenants: data.activeTenants || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          pendingBills: data.pendingBills || 0,
          loading: false,
          error: null
        });
        onError?.(false);
      } catch (error) {
        console.error('Error fetching statistics:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to load statistics';
        const errorMsg = (error as any)?.message || '';
        if (errorMsg.includes('Network error')) {
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else if (errorMsg.includes('timeout')) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (errorMsg.includes('401')) {
          errorMessage = 'Authentication error. Please login again.';
        } else if (errorMsg.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        }

        // Set fallback data so the dashboard doesn't break completely
        setStats({
          totalProperties: 0,
          activeTenants: 0,
          monthlyRevenue: 0,
          pendingBills: 0,
          loading: false,
          error: errorMessage
        });
        onError?.(true);
      }
    };

    fetchStats();
  }, []);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
              </div>
              <div className="p-3 bg-gray-200 rounded-full w-12 h-12"></div>
            </div>
          </div>
        ))}
        <div className="col-span-full text-center py-4">
          <div className="inline-flex items-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Loading dashboard statistics...
          </div>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-600 font-medium">{stats.error}</p>
            <p className="text-red-500 text-sm mt-1">Please try refreshing the page or check your connection.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Properties</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-green-600 mt-2">From database</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeTenants}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <Users className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-green-600 mt-2">Currently active</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-gray-900">€{stats.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-full">
            <DollarSign className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <p className="text-xs text-green-600 mt-2">This month</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending Bills</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingBills}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <CreditCard className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <p className="text-xs text-red-600 mt-2">Need attention</p>
      </div>
    </div>
  );
};

// Real Property Performance Component
const RealPropertyPerformance = () => {
  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // Check if token exists before making API calls
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, skipping property API calls');
          setLoading(false);
          setError('No authentication token');
          return;
        }

        setLoading(true);
        const res = await listProperties();
        const propertiesData = res?.data?.data?.properties || [];

        // Sort by rent amount (highest first) and take top 3
        const sortedProperties = propertiesData
          .sort((a: DashboardProperty, b: DashboardProperty) => (b.rent || b.monthly_rent || 0) - (a.rent || a.monthly_rent || 0))
          .slice(0, 3);

        setProperties(sortedProperties);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setError('Failed to load property data');
        // Set empty array as fallback
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">{error}</div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">No properties found</div>
    );
  }

  const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500'];

  return (
    <div className="space-y-4">
      {properties.map((property, index) => (
        <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className={`w-3 h-3 ${colors[index]} rounded-full mr-3`}></div>
            <span className="font-medium">{property.title || property.name || `Property ${property.id}`}</span>
          </div>
          <span className="text-green-600 font-semibold">€{property.rent || property.monthly_rent || 0}/mo</span>
        </div>
      ))}
    </div>
  );
};

// Real Recent Activity Component
const RealRecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);

        // Fetch recent data from multiple sources
        const [tenantsRes, billsRes] = await Promise.all([
          listTenants(),
          listBills({ limit: 5, sort: 'created_at', order: 'DESC' })
        ]);

        const tenants = tenantsRes?.data?.data?.tenants || [];
        const bills = billsRes?.data?.data?.bills || [];

        // Create activity items from recent data
        const activities: Activity[] = [];

        // Add recent tenants
        tenants.slice(0, 2).forEach((tenant: any) => {
          activities.push({
            id: `tenant-${tenant.id}`,
            type: 'tenant',
            message: 'Tenant registered',
            detail: `${tenant.name || 'Tenant'} assigned to ${tenant.property?.title || 'a property'}`,
            time: tenant.created_at,
            color: 'blue'
          });
        });

        // Add recent bills
        bills.slice(0, 2).forEach((bill: any) => {
          activities.push({
            id: `bill-${bill.id}`,
            type: 'payment',
            message: bill.status === 'PAID' ? 'Payment received' : 'Bill generated',
            detail: bill.status === 'PAID'
              ? `€${bill.amount} from ${bill.tenant?.name || 'tenant'}`
              : `€${bill.amount} bill for ${bill.tenant?.name || 'tenant'}`,
            time: bill.created_at,
            color: bill.status === 'PAID' ? 'green' : 'yellow'
          });
        });

        // Sort by time and take most recent
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivities(activities.slice(0, 3));

      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setError('Failed to load recent activity');
        // Set empty array as fallback
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-2 h-2 bg-gray-200 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">{error}</div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">No recent activity</div>
    );
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50';
      case 'green': return 'bg-green-50';
      case 'yellow': return 'bg-yellow-50';
      default: return 'bg-gray-50';
    }
  };

  const getDotColor = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className={`flex items-center p-3 ${getColorClasses(activity.color)} rounded-lg`}>
          <div className={`w-2 h-2 ${getDotColor(activity.color)} rounded-full mr-3`}></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.message}</p>
            <p className="text-xs text-gray-600">{activity.detail}</p>
          </div>
          <span className="text-xs text-gray-500">{formatTimeAgo(activity.time)}</span>
        </div>
      ))}
    </div>
  );
};

const OverviewPies = () => {
  const [loading, setLoading] = useState(true);
  const [byType, setByType] = useState<any[]>([]);
  const [byMonth, setByMonth] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        console.log('Fetching expense data...');
        const res = await listExpenses();
        console.log('Expense response:', res);

        // Handle different response structures
        let expenses: any[] = [];
        if (res?.data?.data?.expenses) {
          expenses = res.data.data.expenses;
        } else if ((res?.data as any)?.expenses) {
          expenses = (res.data as any).expenses;
        } else if (Array.isArray(res?.data)) {
          expenses = res.data;
        }

        console.log('Expenses data:', expenses);

        if (!expenses || expenses.length === 0) {
          setByType([]);
          setByMonth([]);
          setLoading(false);
          return;
        }

        const typeMap: Record<string, number> = {};
        const monthMap: Record<string, number> = {};

        for (const exp of expenses) {
          const cat = (exp.category || exp.type || 'Misc').toString();
          typeMap[cat] = (typeMap[cat] || 0) + Number(exp.amount || 0);

          const m = exp.month || (() => {
            const d = new Date(exp.date || exp.created_at || new Date());
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${d.getFullYear()}-${mm}`;
          })();
          monthMap[m] = (monthMap[m] || 0) + Number(exp.amount || 0);
        }

        setByType(Object.keys(typeMap).map(k => ({ name: k, value: typeMap[k] })));
        const last6 = Object.keys(monthMap).sort().slice(-6);
        setByMonth(last6.map(k => ({ name: k, value: monthMap[k] })));
      } catch (e: any) {
        console.error('Error loading expenses:', e);
        setByType([]);
        setByMonth([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-base font-semibold mb-3">Expense Breakdown (Type)</h3>
        {loading ? (
          <div className="text-gray-500 py-10 text-center">Loading expense data…</div>
        ) : byType.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`€${value}`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500 py-10 text-center">
            <p>No expense data available</p>
            <p className="text-xs mt-2">Add some expenses to see the breakdown</p>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-base font-semibold mb-3">Monthly Expenses (Last 6)</h3>
        {loading ? (
          <div className="text-gray-500 py-10 text-center">Loading monthly data…</div>
        ) : byMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byMonth}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
              >
                {byMonth.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`€${value}`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500 py-10 text-center">
            <p>No monthly expense data</p>
            <p className="text-xs mt-2">Expenses will appear here over time</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface Property {
  id: number;
  title: string;
  location: string;
  price: number;
  image: string;
  tag: string;
  tagColor: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  rating: number;
  reviews: number;
  amenities: string[];
  images: string[];
  host: {
    name: string;
    avatar: string;
    joinDate: string;
  };
  propertyDetails: {
    propertyType: string;
    size: string;
    checkIn: string;
    checkOut: string;
  };
}

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  // const navigate = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(storedUser);
    } catch (e) {
      console.error('Failed to load user from localStorage:', e);
    }
  }, []);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [hasApiErrors, setHasApiErrors] = useState(false);

  const closePropertyDetails = () => {
    setSelectedProperty(null);
    setIsPropertyModalOpen(false);
  };

  const renderPropertiesContent = () => <PropertiesSection />;

  const renderTunnetContent = () => <TunnetSectionFixed />;

  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Property Management</h1>
        <p className="text-blue-100">Manage your properties, tenants, and finances efficiently</p>
      </div>

      {/* Real Statistics Cards */}
      <RealStatistics onError={setHasApiErrors} />

      {/* API Diagnostics - Show when there are errors */}
      {hasApiErrors && (
        <ApiDiagnostics />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Revenue Overview
            </h3>
          </div>
          <OverviewPies />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Property Performance
          </h3>
          <RealPropertyPerformance />
        </div>
      </div>

      {/* Real Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-purple-600" />
          Recent Activity
        </h3>
        <RealRecentActivity />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-orange-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSection('properties')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center group"
            title="Navigate to Properties section to add a new property"
          >
            <Plus className="w-6 h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-blue-800">Add Property</p>
          </button>
          <button
            onClick={() => setActiveSection('tunnet')}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center group"
            title="Navigate to Tenants section to add a new tenant"
          >
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-green-800">Add Tenant</p>
          </button>
          <button
            onClick={() => setActiveSection('payments')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center group"
            title="Navigate to Payments section to generate bills"
          >
            <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-purple-800">Generate Bill</p>
          </button>
          <button
            onClick={() => setActiveSection('expense-analytics')}
            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center group"
            title="View detailed analytics and reports"
          >
            <BarChart3 className="w-6 h-6 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-orange-800">View Reports</p>
          </button>
        </div>

        {/* Additional Quick Actions Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <button
            onClick={() => setActiveSection('settings')}
            className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-center group"
            title="Go to settings"
          >
            <SettingsIcon className="w-6 h-6 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-indigo-800">Settings</p>
          </button>
          <button
            onClick={() => {
              // Show a simple alert for now - could be enhanced with a modal
              alert('Export feature coming soon! This will allow you to export your data to CSV/PDF.');
            }}
            className="p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors text-center group"
            title="Export data (coming soon)"
          >
            <Download className="w-6 h-6 text-teal-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-teal-800">Export Data</p>
          </button>
          <button
            onClick={() => {
              // Show help information
              alert('Dashboard Help:\n\n• Use Quick Actions to navigate to different sections\n• Statistics show real-time data from your database\n• Recent Activity displays latest tenant and bill updates\n• Charts show expense breakdowns and trends');
            }}
            className="p-4 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors text-center group"
            title="Get help and information"
          >
            <HelpCircle className="w-6 h-6 text-pink-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-pink-800">Help</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentsContent = () => (
    <PaymentsManagement />
  );





  const renderExpenseAnalyticsContent = () => <ExpenseAnalytics />;

  // Settings component as a separate component to properly use hooks
  const SettingsContent = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (storedUser) {
          setName(storedUser.name || '');
          setEmail(storedUser.email || '');
        }
      } catch (err) {
        console.error('SettingsContent: Failed to load user:', err);
      }
    }, []);

    const handleSave = async () => {
      try {
        setSaving(true);
        setMsg('');
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        const payload: any = {};
        if (name && name !== currentUser?.name) payload.name = name;
        if (email && email !== currentUser?.email) payload.email = email;
        const { updateProfile, me } = await import('../../api');
        await updateProfile(payload);
        const fresh = await me();
        const admin = fresh?.data?.data?.admin;
        if (admin) {
          localStorage.setItem('user', JSON.stringify(admin));
        }
        setMsg('Saved');
        setTimeout(() => setMsg(''), 3000);
      } catch (e: any) {
        setMsg(e?.response?.data?.error || e?.userMessage || e?.message || 'Save failed');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>


        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
          <p className="text-gray-600 mb-4">Manage your account preferences and settings.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your profile name"
                title="Profile name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                title="Email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {msg && <div className="text-sm text-gray-600">{msg}</div>}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/'; }}
                className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    return <SettingsContent />;
  };

  const renderAdminManagementContent = () => <AdminManagement />;

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewContent();
      case 'properties':
        return renderPropertiesContent();
      case 'tunnet':
        return renderTunnetContent();
      case 'payments':
        return renderPaymentsContent();
      case 'expense-analytics':
        return renderExpenseAnalyticsContent();
      case 'settings':
        return renderSettingsContent();
      case 'admin-management':
        return renderAdminManagementContent();
      default:
        return renderOverviewContent();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 animate-slide-in-left">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-display-medium text-gray-900 animate-fade-in">Dashboard</h1>
          <div className="mt-2 w-12 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-expand"></div>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-300 hover:transform hover:translate-x-1 ${activeSection === 'overview'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600 animate-slide-in-right'
                : 'text-gray-600 hover:bg-gray-50 hover:shadow-md'
                }`}
            >
              <LayoutDashboard className={`w-5 h-5 mr-3 ${activeSection === 'overview' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Overview</span>
            </button>

            <button
              onClick={() => setActiveSection('properties')}
              className={`w-full flex items-center px-4 py-3 rounded-lg ${activeSection === 'properties'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Building2 className={`w-5 h-5 mr-3 ${activeSection === 'properties' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Properties</span>
            </button>

            <button
              onClick={() => setActiveSection('tunnet')}
              className={`w-full flex items-center px-4 py-3 rounded-lg ${activeSection === 'tunnet'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Users className={`w-5 h-5 mr-3 ${activeSection === 'tunnet' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Tenants</span>
            </button>

            <button
              onClick={() => setActiveSection('payments')}
              className={`w-full flex items-center px-4 py-3 rounded-lg ${activeSection === 'payments'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <CreditCard className={`w-5 h-5 mr-3 ${activeSection === 'payments' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Payments</span>
            </button>




            <button
              onClick={() => setActiveSection('expense-analytics')}
              className={`w-full flex items-center px-4 py-3 rounded-lg ${activeSection === 'expense-analytics'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <DollarSign className={`w-5 h-5 mr-3 ${activeSection === 'expense-analytics' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Expense Analytics</span>
            </button>

            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center px-4 py-3 rounded-lg ${activeSection === 'settings'
                ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <SettingsIcon className={`w-5 h-5 mr-3 ${activeSection === 'settings' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="nav-item">Settings</span>
            </button>

            {isClient && user?.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveSection('admin-management')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-300 hover:transform hover:translate-x-1 ${activeSection === 'admin-management'
                  ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600 animate-slide-in-right'
                  : 'text-gray-600 hover:bg-gray-50 hover:shadow-md'
                  }`}
                title="Admin Management"
              >
                <Shield className={`w-5 h-5 mr-3 ${activeSection === 'admin-management' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="nav-item">Admin Management</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 max-w-lg">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Search"
                  aria-label="Search properties"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md form-input"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors duration-200 hover:animate-bounce-subtle" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-blue-300 transition-all duration-200">
                  {isClient ? (user?.name || user?.fullName || 'U').charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-label-large text-gray-900">{isClient ? (user?.name || user?.fullName || 'User') : '...'}</div>
                  <div className="text-label-medium text-gray-500">{isClient ? (user?.role || 'Admin') : '...'}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 animate-fade-in-up animate-delay-200">
          {renderContent()}
        </div>
      </div>

      {/* Property Details Modal */}
      {isPropertyModalOpen && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto transform animate-modal-slide-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-heading-large">{selectedProperty.title}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-label-large">{selectedProperty.rating}</span>
                    <span className="ml-1 card-subtitle">({selectedProperty.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center card-subtitle">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedProperty.location}
                  </div>
                </div>
              </div>
              <button
                onClick={closePropertyDetails}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 transform hover:scale-110"
                aria-label="Close property details"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Image Gallery */}
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title}
                      className="w-full h-80 object-cover rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProperty.images.slice(1, 5).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${selectedProperty.title} ${index + 2}`}
                        className="w-full h-36 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Property Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedProperty.propertyDetails.propertyType} hosted by {selectedProperty.host.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedProperty.tagColor === 'orange'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                        }`}>
                        {selectedProperty.tag}
                      </span>
                    </div>

                    <div className="flex items-center space-x-6 text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{selectedProperty.guests} guests</span>
                      </div>
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        <span>{selectedProperty.bedrooms} bedrooms</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        <span>{selectedProperty.bathrooms} bathrooms</span>
                      </div>
                    </div>

                    <p className="text-gray-700 leading-relaxed">{selectedProperty.description}</p>
                  </div>

                  {/* Amenities */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProperty.amenities.map((amenity, index) => {
                        const getAmenityIcon = (amenity: string) => {
                          switch (amenity.toLowerCase()) {
                            case 'wifi': return <Wifi className="w-5 h-5" />;
                            case 'tv': return <Tv className="w-5 h-5" />;
                            case 'parking': return <Car className="w-5 h-5" />;
                            case 'coffee maker': return <Coffee className="w-5 h-5" />;
                            default: return <div className="w-5 h-5 bg-gray-300 rounded"></div>;
                          }
                        };

                        return (
                          <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                            {getAmenityIcon(amenity)}
                            <span className="text-gray-700">{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Property Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Property Type</h4>
                        <p className="text-gray-700">{selectedProperty.propertyDetails.propertyType}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Size</h4>
                        <p className="text-gray-700">{selectedProperty.propertyDetails.size}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Check-in</h4>
                        <p className="text-gray-700">{selectedProperty.propertyDetails.checkIn}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Check-out</h4>
                        <p className="text-gray-700">{selectedProperty.propertyDetails.checkOut}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Booking Card */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    {/* Host Info */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <img
                          src={selectedProperty.host.avatar}
                          alt={selectedProperty.host.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold text-gray-900">Hosted by {selectedProperty.host.name}</h4>
                          <p className="text-sm text-gray-600">{selectedProperty.host.joinDate}</p>
                        </div>
                      </div>
                    </div>

                    {/* Booking Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="price-large">{selectedProperty.price}€</span>
                          <span className="text-body-small text-gray-500 ml-1">mois</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-label-large">{selectedProperty.rating}</span>
                        </div>
                      </div>

                      {/* Booking Form */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="form-label mb-1">Check-in Date</label>
                            <input
                              type="date"
                              placeholder="Select check-in date"
                              title="Check-in date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label mb-1">Lease Duration</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" title="Lease duration">
                              <option>3 months</option>
                              <option>6 months</option>
                              <option>12 months</option>
                              <option>Month by month</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="form-label mb-1">Room Type</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" title="Room type">
                            <option>Private room</option>
                            <option>Shared room</option>
                            <option>Master room</option>
                          </select>
                        </div>
                        <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors btn-text">
                          Apply Now
                        </button>
                        <div className="flex items-center justify-center">
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Add to favorites">
                            <Heart className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 text-center">Application review required</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
