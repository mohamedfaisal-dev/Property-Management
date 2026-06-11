import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { data: expenses, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('admin_id', currentAdmin.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { expenses: expenses || [] } });

  } catch (error: any) {
    console.error('List expenses error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    const body = await req.json();

    const { type, amount, date } = body;

    if (!type || !String(type).trim()) {
      return NextResponse.json({ success: false, error: 'Expense type is required' }, { status: 400 });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 });
    }

    const when = date ? new Date(date) : new Date();
    const yyyy = when.getFullYear();
    const mm = String(when.getMonth() + 1).padStart(2, '0');
    const dd = String(when.getDate()).padStart(2, '0');

    const { data: created, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        admin_id: currentAdmin.id,
        month: `${yyyy}-${mm}`,
        category: String(type).trim(),
        amount: amt,
        notes: null,
        created_at: new Date(`${yyyy}-${mm}-${dd}`).toISOString(),
      })
      .select('*')
      .single();

    if (error || !created) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed to create expense' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { expense: created } }, { status: 201 });

  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
