import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    // Get stats by status in memory (Supabase JS does not easily support SUM and COUNT grouped on a column in a single client command)
    const { data: bills, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('id, amount, status, due_date')
      .eq('admin_id', currentAdmin.id);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const todayISO = new Date().toISOString().split('T')[0];

    let totalBills = 0;
    let totalAmount = 0;
    let pendingBills = 0;
    let overdueBills = 0;

    const breakdown: Record<string, { count: number; total_amount: number }> = {};

    for (const b of bills || []) {
      const amt = parseFloat(b.amount || 0);
      totalBills += 1;
      totalAmount += amt;

      if (!breakdown[b.status]) {
        breakdown[b.status] = { count: 0, total_amount: 0 };
      }
      breakdown[b.status].count += 1;
      breakdown[b.status].total_amount += amt;

      if (b.status === 'PENDING') {
        pendingBills += 1;
      }

      if (b.status === 'OVERDUE' || (b.status === 'PENDING' && b.due_date && b.due_date < todayISO)) {
        overdueBills += 1;
      }
    }

    const statusBreakdown = Object.keys(breakdown).map(status => ({
      status,
      count: breakdown[status].count,
      total_amount: breakdown[status].total_amount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalBills,
        totalAmount,
        pendingBills,
        overdueBills,
        statusBreakdown,
      },
    });

  } catch (error: any) {
    console.error('Get bill stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
