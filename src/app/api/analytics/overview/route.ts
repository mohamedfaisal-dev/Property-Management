import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

// Helper utilities
function toMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function listMonths(startMonth: string, endMonth: string): string[] {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  const result: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${m.toString().padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return result;
}

function parsePropertyIds(param: string | null): number[] | null {
  if (!param || param === 'all') return null;
  return param.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const startMonth = searchParams.get('startMonth') || toMonthString(new Date(new Date().getFullYear(), 0, 1));
    const endMonth = searchParams.get('endMonth') || toMonthString(new Date());
    const propertyIds = parsePropertyIds(searchParams.get('propertyIds'));
    const categoriesParam = searchParams.get('categories');
    const categories = categoriesParam ? categoriesParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const aggregate = searchParams.get('aggregate') !== 'false';

    const months = listMonths(startMonth, endMonth);

    // Fetch properties
    let propQuery = supabaseAdmin
      .from('properties')
      .select('id, title')
      .eq('admin_id', currentAdmin.id);

    if (propertyIds) {
      propQuery = propQuery.in('id', propertyIds);
    }

    const { data: properties, error: propError } = await propQuery;
    if (propError) {
      return NextResponse.json({ success: false, error: propError.message }, { status: 500 });
    }

    const selectedPropertyIds = (properties || []).map((p) => p.id);

    if (selectedPropertyIds.length === 0) {
      return NextResponse.json({
        success: true,
        filters: { startMonth, endMonth, propertyIds: [], categories: categories || [], aggregate },
        statCards: { totalProperties: 0, totalIncome: 0, totalExpenses: 0, netProfit: 0, budgetVariance: { income: 0, expenses: 0 }, onTimeRate: 0, overdueAmount: 0 },
        series: { incomeByMonth: [], expensesByMonth: [], profitByMonth: [], netProfitByMonth: [], budgetVsActualByMonth: [], expenseBreakdown: [] }
      });
    }

    // Fetch bills
    let billQuery = supabaseAdmin
      .from('bills')
      .select('id, amount, month, status, due_date, property_id')
      .eq('admin_id', currentAdmin.id)
      .in('month', months)
      .in('property_id', selectedPropertyIds);

    const { data: bills, error: billError } = await billQuery;
    if (billError) {
      return NextResponse.json({ success: false, error: billError.message }, { status: 500 });
    }

    // Fetch expenses
    let expQuery = supabaseAdmin
      .from('expenses')
      .select('id, amount, month, category, property_id')
      .eq('admin_id', currentAdmin.id)
      .in('month', months);

    if (categories) {
      expQuery = expQuery.in('category', categories);
    }

    const { data: expenses, error: expError } = await expQuery;
    if (expError) {
      return NextResponse.json({ success: false, error: expError.message }, { status: 500 });
    }

    // Fetch budgets
    const { data: budgets, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('property_id, month, budgeted_income, budgeted_expenses')
      .in('month', months)
      .in('property_id', selectedPropertyIds);

    if (budgetError) {
      return NextResponse.json({ success: false, error: budgetError.message }, { status: 500 });
    }

    const todayISO = new Date().toISOString().split('T')[0];

    const incomeByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const expensesByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const budgetIncomeByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const budgetExpenseByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));

    let paidCount = 0;
    let totalCount = 0;
    let overdueAmount = 0;

    for (const b of bills || []) {
      totalCount += 1;
      const amt = parseFloat(b.amount || 0);
      if (b.status === 'PAID' || b.status === 'RECEIPT_SENT') {
        paidCount += 1;
        incomeByMonth[b.month] = (incomeByMonth[b.month] || 0) + amt;
      }
      if ((b.status === 'PENDING' || b.status === 'OVERDUE') && b.due_date && b.due_date < todayISO) {
        overdueAmount += amt;
      }
    }

    for (const e of expenses || []) {
      const amt = parseFloat(e.amount || 0);
      expensesByMonth[e.month] = (expensesByMonth[e.month] || 0) + amt;
    }

    for (const bud of budgets || []) {
      budgetIncomeByMonth[bud.month] = (budgetIncomeByMonth[bud.month] || 0) + parseFloat(bud.budgeted_income || 0);
      budgetExpenseByMonth[bud.month] = (budgetExpenseByMonth[bud.month] || 0) + parseFloat(bud.budgeted_expenses || 0);
    }

    const series = {
      incomeByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      expensesByMonth: months.map((m) => ({ month: m, amount: Number(expensesByMonth[m].toFixed(2)) })),
      profitByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      netProfitByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      budgetVsActualByMonth: months.map((m) => ({
        month: m,
        budgetedIncome: Number((budgetIncomeByMonth[m] || 0).toFixed(2)),
        actualIncome: Number((incomeByMonth[m] || 0).toFixed(2)),
        budgetedExpenses: Number((budgetExpenseByMonth[m] || 0).toFixed(2)),
        actualExpenses: Number((expensesByMonth[m] || 0).toFixed(2)),
      })),
    };

    const categoryMap = new Map<string, number>();
    for (const e of expenses || []) {
      const key = e.category || 'Uncategorized';
      categoryMap.set(key, (categoryMap.get(key) || 0) + parseFloat(e.amount || 0));
    }
    const expenseBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

    const totalIncome = series.incomeByMonth.reduce((s, v) => s + v.amount, 0);
    const totalExpenses = series.expensesByMonth.reduce((s, v) => s + v.amount, 0);
    const profit = totalIncome;
    const totalBudgetedIncome = months.reduce((s, m) => s + (budgetIncomeByMonth[m] || 0), 0);
    const totalBudgetedExpenses = months.reduce((s, m) => s + (budgetExpenseByMonth[m] || 0), 0);
    const budgetVariance = {
      income: Number((totalIncome - totalBudgetedIncome).toFixed(2)),
      expenses: Number((totalExpenses - totalBudgetedExpenses).toFixed(2)),
    };
    const onTimeRate = totalCount ? paidCount / totalCount : 0;

    const statCards = {
      totalProperties: properties.length,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number(profit.toFixed(2)),
      budgetVariance,
      onTimeRate: Number(onTimeRate.toFixed(2)),
      overdueAmount: Number(overdueAmount.toFixed(2)),
    };

    return NextResponse.json({
      success: true,
      filters: {
        startMonth,
        endMonth,
        propertyIds: selectedPropertyIds,
        categories: categories || [],
        aggregate,
      },
      statCards,
      series: {
        ...series,
        expenseBreakdown
      },
    });

  } catch (error: any) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get analytics overview', error: error.message }, { status: 500 });
  }
}
