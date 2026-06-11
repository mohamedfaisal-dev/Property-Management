import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { data: profit, error } = await supabaseAdmin
      .from('profits')
      .select('total_profit')
      .eq('admin_id', currentAdmin.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const totalProfit = profit ? parseFloat(profit.total_profit) : 0.0;

    return NextResponse.json({
      success: true,
      data: {
        total_profit: totalProfit,
      },
    });

  } catch (error: any) {
    console.error('Get total profit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
