import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const [totalRes, activeRes, inactiveRes, expiredRes] = await Promise.all([
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id),
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id).eq('status', 'ACTIVE'),
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id).eq('status', 'INACTIVE'),
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', currentAdmin.id).eq('status', 'EXPIRED'),
    ]);

    // Grouping by property in memory (Supabase doesn't support grouping natively in queries)
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('property_id, property:properties(id, title)')
      .eq('admin_id', currentAdmin.id);

    if (tenantsError) {
      return NextResponse.json({ success: false, error: tenantsError.message }, { status: 500 });
    }

    const propCounts: Record<number, { title: string; count: number }> = {};
    for (const t of tenants || []) {
      if (t.property_id && t.property) {
        const title = (t.property as any).title;
        if (!propCounts[t.property_id]) {
          propCounts[t.property_id] = { title, count: 0 };
        }
        propCounts[t.property_id].count += 1;
      }
    }

    const tenantsByProperty = Object.keys(propCounts).map(k => {
      const id = parseInt(k, 10);
      return {
        property_id: id,
        property: { id, title: propCounts[id].title },
        count: propCounts[id].count
      };
    }).sort((a, b) => b.count - a.count).slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        totalTenants: totalRes.count || 0,
        activeTenants: activeRes.count || 0,
        inactiveTenants: inactiveRes.count || 0,
        expiredTenants: expiredRes.count || 0,
        tenantsByProperty
      }
    });

  } catch (error: any) {
    console.error('Get tenant stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
