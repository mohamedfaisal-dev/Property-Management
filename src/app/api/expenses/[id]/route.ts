import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const expenseId = parseInt(id, 10);

    const { data: expense, error: fetchError } = await supabaseAdmin
      .from('expenses')
      .select('id')
      .eq('id', expenseId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteError) {
      return NextResponse.json({ success: false, error: 'Failed to delete expense' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });

  } catch (error: any) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
