import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .select('*, tenant:tenants(id, name, email, phone, join_date), property:properties(id, title, address, city, country, monthly_rent), admin:admins(id, name, email), receipts:receipts(id, sent_date, status, sent_to_tenant, sent_to_admin)')
      .eq('id', billId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (error || !bill) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bill });

  } catch (error: any) {
    console.error('Get bill by ID error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);
    const body = await req.json();

    const { amount, due_date, status, description } = body;

    const { data: bill, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('*')
      .eq('id', billId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (due_date !== undefined) updateData.due_date = due_date;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: bill });
    }

    const { data: updatedBill, error: updateError } = await supabaseAdmin
      .from('bills')
      .update(updateData)
      .eq('id', billId)
      .select('*')
      .single();

    if (updateError || !updatedBill) {
      return NextResponse.json({ success: false, message: 'Failed to update bill', error: updateError?.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill updated successfully',
      data: updatedBill,
    });

  } catch (error: any) {
    console.error('Update bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);

    const { data: bill, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('id')
      .eq('id', billId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('bills')
      .delete()
      .eq('id', billId);

    if (deleteError) {
      return NextResponse.json({ success: false, message: 'Failed to delete bill' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Bill deleted successfully' });

  } catch (error: any) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
