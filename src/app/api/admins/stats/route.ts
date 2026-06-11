import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    if (!isSuperAdmin(currentAdmin)) {
      return NextResponse.json({ success: false, error: 'Access denied. Super admin privileges required.' }, { status: 403 });
    }

    const [totalRes, activeRes, superRes, regularRes] = await Promise.all([
      supabaseAdmin.from('admins').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('admins').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabaseAdmin.from('admins').select('*', { count: 'exact', head: true }).eq('role', 'SUPER_ADMIN'),
      supabaseAdmin.from('admins').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalAdmins: totalRes.count || 0,
        activeAdmins: activeRes.count || 0,
        superAdmins: superRes.count || 0,
        regularAdmins: regularRes.count || 0,
      },
    });

  } catch (error: any) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
