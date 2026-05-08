"use client";
import React, { useEffect, useState } from 'react';
import { createExpense, listExpenses, deleteExpense, me } from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EXPENSE_TYPES = [
  'Electricity Bill',
  'Water Bill',
  'Maintenance',
  'Cleaning & Housekeeping',
  'Property Tax',
  'Security Staff Salary',
  'Gardening / Landscaping',
  'Internet / Wi-Fi',
  'Repairs & Renovations',
  'Waste Management',
  'Insurance',
  'Miscellaneous'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6361', '#BC5090', '#58508D', '#003F5C', '#665191'];

const ExpenseAnalytics: React.FC = () => {
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(storedUser?.id ?? null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [expenseType, setExpenseType] = useState(EXPENSE_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Date range filter for viewing expenses
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);

  const fetchExpenses = async () => {
    try {
      const res = await listExpenses();
      setExpenses(res.data?.data?.expenses || []);
    } catch (e: any) {
      console.error('Error fetching expenses:', e);
      setExpenses([]);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  // Ensure we use the server's view of the current admin (token-based)
  useEffect(() => {
    (async () => {
      try {
        const res = await me();
        const adminId = res?.data?.data?.admin?.id ?? null;
        if (adminId != null) setCurrentAdminId(adminId);
      } catch (_e) {
        // ignore; fallback to stored user if any
      }
    })();
  }, []);

  // Filter expenses by date range
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredExpenses(expenses);
      return;
    }

    const filtered = expenses.filter((exp: any) => {
      const expDate = new Date(exp.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return expDate >= start && expDate <= end;
      } else if (start) {
        return expDate >= start;
      } else if (end) {
        return expDate <= end;
      }
      return true;
    });
    setFilteredExpenses(filtered);
  }, [expenses, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        setError('Amount must be a positive number');
        return;
      }
      await createExpense({ type: expenseType, amount: amt, date });
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      await fetchExpenses();
    } catch (e: any) {
      setError(e?.userMessage || e?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, exp?: any) => {
    const cat = exp?.category || 'Expense';
    const amt = exp?.amount != null ? Number(exp.amount).toFixed(2) : '';
    const when = exp?.created_at ? new Date(exp.created_at).toLocaleDateString() : '';
    const prompt = [
      'Confirm delete',
      cat,
      amt ? `€${amt}` : '',
      when ? `on ${when}` : ''
    ].filter(Boolean).join(' ');
    if (!window.confirm(`${prompt}? This cannot be undone.`)) {
      return;
    }
    
    console.log('[ExpenseAnalytics] Deleting expense ID:', id);
    
    try {
      setError('');
      setLoading(true);
      
      const response = await deleteExpense(id);
      console.log('[ExpenseAnalytics] Delete response:', response);
      
      // Refresh the list
      await fetchExpenses();
      console.log('[ExpenseAnalytics] Expense deleted and list refreshed');
    } catch (e: any) {
      console.error('[ExpenseAnalytics] Delete failed:', e);
      console.error('[ExpenseAnalytics] Error response:', e?.response);
      
      const status = e?.response?.status;
      let errorMsg = e?.response?.data?.error || e?.userMessage || e?.message || 'Failed to delete expense';
      if (status === 404) {
        errorMsg = 'Expense not found or access denied (data isolation)';
      } else if (status === 403) {
        errorMsg = 'Access denied: this expense belongs to another admin';
      }
      setError(errorMsg);
      alert(`Delete failed: ${errorMsg}`);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
      // sync UI in case of cross-admin item present in list
      try { await fetchExpenses(); } catch {}
    } finally {
      setLoading(false);
    }
  };

  // Use filtered expenses for calculations
  const displayExpenses = filteredExpenses.length > 0 || startDate || endDate ? filteredExpenses : expenses;

  // Compute summary stats
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthlyExpenses = displayExpenses.filter((exp: any) => {
    const d = new Date(exp.created_at);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return m === currentMonth;
  });
  
  const totalMonthly = monthlyExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  
  const typeMap: any = {};
  displayExpenses.forEach((exp: any) => {
    const cat = exp.category || 'Miscellaneous';
    typeMap[cat] = (typeMap[cat] || 0) + Number(exp.amount || 0);
  });
  
  const highestType = Object.keys(typeMap).length > 0
    ? Object.keys(typeMap).reduce((a, b) => typeMap[a] > typeMap[b] ? a : b)
    : 'N/A';
  
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDaily = totalMonthly / daysInMonth;

  // Pie chart data - Expense by type
  const pieData = Object.keys(typeMap).map(cat => ({ name: cat, value: typeMap[cat] }));

  // Pie chart data - Monthly distribution (last 6 months)
  const monthlyDistribution: any = {};
  displayExpenses.forEach((exp: any) => {
    const m = exp.month || 'Unknown';
    monthlyDistribution[m] = (monthlyDistribution[m] || 0) + Number(exp.amount || 0);
  });
  const last6Months = Object.keys(monthlyDistribution).sort().slice(-6);
  const monthlyPieData = last6Months.map(m => ({ name: m, value: monthlyDistribution[m] }));

  // Pie chart data - Expense range categories
  const expenseRanges: Record<string, number> = {
    'Under €50': 0,
    '€50 - €100': 0,
    '€100 - €500': 0,
    'Over €500': 0
  };
  displayExpenses.forEach((exp: any) => {
    const amt = Number(exp.amount || 0);
    if (amt < 50) expenseRanges['Under €50']++;
    else if (amt < 100) expenseRanges['€50 - €100']++;
    else if (amt < 500) expenseRanges['€100 - €500']++;
    else expenseRanges['Over €500']++;
  });
  const rangePieData = Object.keys(expenseRanges).map(range => ({ name: range, value: expenseRanges[range] })).filter(d => d.value > 0);

  // Bar chart data (by day for current month)
  const dayMap: any = {};
  monthlyExpenses.forEach((exp: any) => {
    const d = new Date(exp.created_at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap[day] = (dayMap[day] || 0) + Number(exp.amount || 0);
  });
  const barData = Object.keys(dayMap).sort().map(day => ({ date: day, amount: dayMap[day] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expense Analytics Dashboard</h1>

      {/* Expense Entry Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">📅 Filter by Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filter
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              {startDate || endDate ? (
                <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded">
                  Showing {displayExpenses.length} of {expenses.length} expenses
                </span>
              ) : (
                <span className="text-gray-500 px-3 py-2">
                  All {expenses.length} expenses
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Monthly Expense</div>
          <div className="text-2xl font-semibold">€{totalMonthly.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Highest Expense Type</div>
          <div className="text-xl font-semibold">{highestType}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Average Daily Expense</div>
          <div className="text-2xl font-semibold">€{avgDaily.toFixed(2)}</div>
        </div>
      </div>

      {/* Expense List with Delete */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Expenses</h2>
        {displayExpenses.length === 0 ? (
          <div className="text-gray-500">No expenses to show</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayExpenses.map((exp: any) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{exp.category}</td>
                    <td className="py-2 pr-4">€{Number(exp.amount || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">{exp.month}</td>
                    <td className="py-2">
                      {currentAdminId != null && exp.admin_id === currentAdminId ? (
                        <button
                          onClick={() => handleDelete(exp.id, exp)}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Not yours</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart 1 - By Type */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">💰 Expense Breakdown by Type</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-12">No expense data yet</div>
          )}
        </div>

        {/* Pie Chart 2 - By Month */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📅 Monthly Distribution (Last 6 Months)</h3>
          {monthlyPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={monthlyPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {monthlyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-12">No monthly data available</div>
          )}
        </div>
      </div>

      {/* Charts - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart 3 - By Amount Range */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📊 Expense Count by Amount Range</h3>
          {rangePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rangePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {rangePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-12">No range data available</div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📈 Daily Expense Trend (Current Month)</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-12">No expense data for this month</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseAnalytics;

