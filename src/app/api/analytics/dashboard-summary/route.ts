import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [propRes, tenantRes, billPaidRes, billPendingRes] = await Promise.all([
      supabaseAdmin.from('properties').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id),
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id).eq('status', 'ACTIVE'),
      supabaseAdmin.from('bills').select('amount').eq('admin_id', currentAdmin.id).eq('status', 'PAID').eq('month', currentMonth),
      supabaseAdmin.from('bills').select('id').eq('admin_id', currentAdmin.id).in('status', ['PENDING', 'OVERDUE']),
    ]);

    const totalProperties = propRes.count || 0;
    const activeTenants = tenantRes.count || 0;

    let monthlyRevenue = 0.0;
    for (const b of billPaidRes.data || []) {
      monthlyRevenue += parseFloat(b.amount || 0);
    }

    const pendingBills = billPendingRes.data?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalProperties,
        activeTenants,
        monthlyRevenue,
        pendingBills
      }
    });

  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
