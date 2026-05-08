"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getAnalyticsOverview, listProperties } from '../api';

const monthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

const AnalyticsOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);

  const [startMonth, setStartMonth] = useState(monthStr(new Date(new Date().getFullYear(), 0, 1)));
  const [endMonth, setEndMonth] = useState(monthStr(new Date()));
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['electricity','water','maintenance','other']);
  const [aggregate, setAggregate] = useState(true);

  const categoryOptions = useMemo(() => ['electricity','water','maintenance','other'], []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [propsRes, analyticsRes] = await Promise.all([
          listProperties(),
          getAnalyticsOverview({
            startMonth,
            endMonth,
            propertyIds: selectedPropertyIds.length ? selectedPropertyIds.join(',') : undefined,
            categories: selectedCategories.length ? selectedCategories.join(',') : undefined,
            aggregate,
          })
        ]);
        const propsData = Array.isArray(propsRes.data?.data) ? propsRes.data.data : (propsRes.data?.properties || []);
        setProperties(propsData);
        setData(analyticsRes.data);
      } catch (e: any) {
        setError(e?.userMessage || e?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startMonth, endMonth, selectedPropertyIds, selectedCategories, aggregate]);

  if (loading) return <div className="p-6 bg-white rounded-lg shadow">Loading analytics…</div>;
  if (error) return <div className="p-6 bg-white rounded-lg shadow text-red-600">{error}</div>;
  if (!data?.success) return <div className="p-6 bg-white rounded-lg shadow">No analytics available</div>;

  const s = data.statCards || {};
  const series = data.series || {};
  const filters = data.filters || {};

  const toggleArrayValue = (arr: any[], value: any) => arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label mb-1">Start Month</label>
            <input type="month" value={startMonth} onChange={(e)=> setStartMonth(e.target.value)} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label mb-1">End Month</label>
            <input type="month" value={endMonth} onChange={(e)=> setEndMonth(e.target.value)} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label mb-1">Properties</label>
            <div className="border rounded-lg p-2 max-h-32 overflow-auto">
              <label className="flex items-center gap-2 text-sm mb-1">
                <input type="checkbox" checked={selectedPropertyIds.length===0} onChange={()=> setSelectedPropertyIds([])} />
                <span>All</span>
              </label>
              {(properties||[]).map((p:any)=>(
                <label key={p.id} className="flex items-center gap-2 text-sm mb-1">
                  <input type="checkbox" checked={selectedPropertyIds.includes(p.id)} onChange={()=> setSelectedPropertyIds(prev=> toggleArrayValue(prev, p.id))} />
                  <span>{p.title || `Property #${p.id}`}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label mb-1">Categories</label>
            <div className="border rounded-lg p-2 max-h-32 overflow-auto">
              {categoryOptions.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm mb-1">
                  <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={()=> setSelectedCategories(prev=> toggleArrayValue(prev, cat))} />
                  <span className="capitalize">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aggregate} onChange={()=> setAggregate(!aggregate)} />
            <span>Aggregate across properties</span>
          </label>
          <div className="text-xs text-gray-500">Applied: {filters.startMonth} → {filters.endMonth}</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Properties</div>
          <div className="text-2xl font-semibold">{Number(s.totalProperties || 0)}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Income</div>
          <div className="text-2xl font-semibold">€{Number(s.totalIncome || 0).toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Expenses</div>
          <div className="text-2xl font-semibold">€{Number(s.totalExpenses || 0).toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-500">Net Profit</div>
          <div className="text-2xl font-semibold">€{Number(s.netProfit || 0).toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-500">Budget Variance</div>
          <div className="text-xs text-gray-700">Income: €{Number(s.budgetVariance?.income || 0).toFixed(2)}</div>
          <div className="text-xs text-gray-700">Expenses: €{Number(s.budgetVariance?.expenses || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Charts (textual placeholders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="font-medium mb-3">Income vs Expenses</div>
          <div className="text-xs text-gray-500">{(series.incomeByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')} vs {(series.expensesByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="font-medium mb-3">Profit Trend</div>
          <div className="text-xs text-gray-500">{(series.netProfitByMonth||series.profitByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="font-medium mb-3">Budget vs Actual</div>
          <div className="text-xs text-gray-500">{(series.budgetVsActualByMonth||[]).map((r: any)=>`${r.month}: BI€${r.budgetedIncome}/AI€${r.actualIncome} | BE€${r.budgetedExpenses}/AE€${r.actualExpenses}`).join(' || ')}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="font-medium mb-3">Expense Breakdown</div>
          <div className="text-xs text-gray-500">{(series.expenseBreakdown||[]).map((r: any)=>`${r.category}:€${r.amount}`).join(' | ')}</div>
        </div>
      </div>

      {!aggregate && series.perProperty && (
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="font-medium mb-3">Per Property Series</div>
          <div className="space-y-2 text-xs text-gray-600">
            {Object.entries(series.perProperty).map(([pid, srs]: any) => (
              <div key={pid}>
                <div className="font-semibold">Property #{pid}</div>
                <div>Income: {(srs.incomeByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')}</div>
                <div>Expenses: {(srs.expensesByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')}</div>
                <div>Net Profit: {(srs.netProfitByMonth||[]).map((r: any)=>`${r.month}:€${r.amount}`).join(' | ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsOverview;


