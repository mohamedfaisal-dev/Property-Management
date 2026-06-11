import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);

    const { data: receipts, error } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('bill_id', billId)
      .eq('admin_id', currentAdmin.id)
      .order('sent_date', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: receipts || [],
    });

  } catch (error: any) {
    console.error('Get receipts history error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
