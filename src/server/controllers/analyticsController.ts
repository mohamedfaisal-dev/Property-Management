import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Bill, Expense, Budget, Property, Tenant } from '../models';

// -----------------------------------------------------------------
// Utility helpers
// -----------------------------------------------------------------
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

function parsePropertyIds(param: string | undefined): number[] | null {
  if (!param || param === 'all') return null;
  return param.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
}

// -----------------------------------------------------------------
// Analytics overview
// -----------------------------------------------------------------
export async function overview(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req.admin as any)?.id as number | undefined;
    if (!adminId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const startMonth: string =
      (req.query.startMonth as string) ||
      toMonthString(new Date(new Date().getFullYear(), 0, 1));
    const endMonth: string =
      (req.query.endMonth as string) || toMonthString(new Date());
    const propertyIds = parsePropertyIds(req.query.propertyIds as string | undefined);
    const categories: string[] | null = req.query.categories
      ? String(req.query.categories)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    const aggregate = String(req.query.aggregate || 'true') === 'true';

    const months = listMonths(startMonth, endMonth);

    const propertyWhere: Record<string, unknown> = { admin_id: adminId };
    if (propertyIds) propertyWhere.id = { [Op.in]: propertyIds };
    const properties = await (Property as any).findAll({
      where: propertyWhere,
      attributes: ['id', 'title'],
    });
    const selectedPropertyIds: number[] = properties.map((p: any) => p.id);

    const billWhere: Record<string, unknown> = {
      admin_id: adminId,
      month: { [Op.in]: months },
    };
    if (selectedPropertyIds.length) billWhere.property_id = { [Op.in]: selectedPropertyIds };

    const expenseWhere: Record<string, unknown> = {
      admin_id: adminId,
      month: { [Op.in]: months },
    };
    if (selectedPropertyIds.length) expenseWhere.property_id = { [Op.in]: selectedPropertyIds };
    if (categories?.length) expenseWhere.category = { [Op.in]: categories };

    const budgetWhere: Record<string, unknown> = { month: { [Op.in]: months } };
    if (selectedPropertyIds.length) budgetWhere.property_id = { [Op.in]: selectedPropertyIds };

    const bills: any[] = await (Bill as any).findAll({
      where: billWhere,
      attributes: ['id', 'amount', 'month', 'status', 'due_date', 'property_id'],
    });
    const expenses: any[] = await (Expense as any).findAll({
      where: expenseWhere,
      attributes: ['id', 'amount', 'month', 'category', 'property_id'],
    });
    const budgets: any[] = await (Budget as any).findAll({
      where: budgetWhere,
      attributes: ['property_id', 'month', 'budgeted_income', 'budgeted_expenses'],
    });

    const nowISO = new Date().toISOString().split('T')[0];

    const incomeByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const expensesByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const budgetIncomeByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const budgetExpenseByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));

    let paidCount = 0;
    let totalCount = 0;
    let overdueAmount = 0;

    for (const b of bills) {
      totalCount += 1;
      if (b.status === 'PAID' || b.status === 'RECEIPT_SENT') {
        paidCount += 1;
        incomeByMonth[b.month] = (incomeByMonth[b.month] ?? 0) + parseFloat(b.amount);
      }
      if (
        (b.status === 'PENDING' || b.status === 'OVERDUE') &&
        b.due_date &&
        b.due_date < nowISO
      ) {
        overdueAmount += parseFloat(b.amount);
      }
    }

    for (const e of expenses) {
      expensesByMonth[e.month] = (expensesByMonth[e.month] ?? 0) + parseFloat(e.amount);
    }

    for (const bud of budgets) {
      budgetIncomeByMonth[bud.month] = (budgetIncomeByMonth[bud.month] ?? 0) + parseFloat(bud.budgeted_income);
      budgetExpenseByMonth[bud.month] = (budgetExpenseByMonth[bud.month] ?? 0) + parseFloat(bud.budgeted_expenses);
    }

    const series = {
      incomeByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      expensesByMonth: months.map((m) => ({ month: m, amount: Number(expensesByMonth[m].toFixed(2)) })),
      // Profit defined as rental income only (no expense subtraction)
      profitByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      netProfitByMonth: months.map((m) => ({ month: m, amount: Number(incomeByMonth[m].toFixed(2)) })),
      budgetVsActualByMonth: months.map((m) => ({
        month: m,
        budgetedIncome: Number((budgetIncomeByMonth[m] ?? 0).toFixed(2)),
        actualIncome: Number((incomeByMonth[m] ?? 0).toFixed(2)),
        budgetedExpenses: Number((budgetExpenseByMonth[m] ?? 0).toFixed(2)),
        actualExpenses: Number((expensesByMonth[m] ?? 0).toFixed(2)),
      })),
    };

    // Optional per-property breakdown
    let perProperty: Record<number, unknown> | undefined;
    if (!aggregate) {
      const byProp = new Map<number, {
        income: Record<string, number>;
        expenses: Record<string, number>;
        bInc: Record<string, number>;
        bExp: Record<string, number>;
      }>();

      for (const pid of selectedPropertyIds) {
        byProp.set(pid, {
          income: Object.fromEntries(months.map((m) => [m, 0])),
          expenses: Object.fromEntries(months.map((m) => [m, 0])),
          bInc: Object.fromEntries(months.map((m) => [m, 0])),
          bExp: Object.fromEntries(months.map((m) => [m, 0])),
        });
      }

      for (const b of bills) {
        const group = byProp.get(b.property_id);
        if (group && (b.status === 'PAID' || b.status === 'RECEIPT_SENT')) {
          group.income[b.month] = (group.income[b.month] ?? 0) + parseFloat(b.amount);
        }
      }
      for (const e of expenses) {
        const group = byProp.get(e.property_id);
        if (group) {
          group.expenses[e.month] = (group.expenses[e.month] ?? 0) + parseFloat(e.amount);
        }
      }
      for (const bud of budgets) {
        const group = byProp.get(bud.property_id);
        if (group) {
          group.bInc[bud.month] = (group.bInc[bud.month] ?? 0) + parseFloat(bud.budgeted_income);
          group.bExp[bud.month] = (group.bExp[bud.month] ?? 0) + parseFloat(bud.budgeted_expenses);
        }
      }

      perProperty = {};
      for (const [pid, group] of byProp.entries()) {
        perProperty[pid] = {
          incomeByMonth: months.map((m) => ({ month: m, amount: Number(group.income[m].toFixed(2)) })),
          expensesByMonth: months.map((m) => ({ month: m, amount: Number(group.expenses[m].toFixed(2)) })),
          netProfitByMonth: months.map((m) => ({ month: m, amount: Number(group.income[m].toFixed(2)) })),
          budgetVsActualByMonth: months.map((m) => ({
            month: m,
            budgetedIncome: Number(group.bInc[m].toFixed(2)),
            actualIncome: Number(group.income[m].toFixed(2)),
            budgetedExpenses: Number(group.bExp[m].toFixed(2)),
            actualExpenses: Number(group.expenses[m].toFixed(2)),
          })),
        };
      }
    }

    const categoryMap = new Map<string, number>();
    for (const e of expenses) {
      const key = (e.category as string) || 'Uncategorized';
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + parseFloat(e.amount));
    }
    const expenseBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

    const totalIncome = series.incomeByMonth.reduce((s, v) => s + v.amount, 0);
    const totalExpenses = series.expensesByMonth.reduce((s, v) => s + v.amount, 0);
    // Profit equals rental income only
    const profit = totalIncome;
    const totalBudgetedIncome = months.reduce((s, m) => s + (budgetIncomeByMonth[m] ?? 0), 0);
    const totalBudgetedExpenses = months.reduce((s, m) => s + (budgetExpenseByMonth[m] ?? 0), 0);
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

    res.json({
      success: true,
      filters: {
        startMonth,
        endMonth,
        propertyIds: selectedPropertyIds,
        categories: categories ?? [],
        aggregate,
      },
      statCards,
      series: {
        ...series,
        expenseBreakdown,
        ...(perProperty ? { perProperty } : {}),
      },
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics overview',
      error: error.message,
    });
  }
}

// -----------------------------------------------------------------
// Dashboard summary
// -----------------------------------------------------------------
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    const adminId: number = (req.admin as any).id;

    // Current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Fetch all counts in parallel for maximum throughput
    const [propertyCount, tenantCount, monthlyRevenue, pendingCount] = await Promise.all([
      (Property as any).count({ where: { admin_id: adminId } }),
      (Tenant as any).count({ where: { admin_id: adminId, status: 'ACTIVE' } }),
      (Bill as any).sum('amount', {
        where: { admin_id: adminId, status: 'PAID', month: currentMonth },
      }),
      (Bill as any).count({
        where: { admin_id: adminId, status: { [Op.in]: ['PENDING', 'OVERDUE'] } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProperties: propertyCount as number,
        activeTenants: tenantCount as number,
        monthlyRevenue: Number(monthlyRevenue ?? 0),
        pendingBills: pendingCount as number,
      },
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
