import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('bills')
      .select('*, tenant:tenants(id, name, email, phone), property:properties(id, title, address, city, country), admin:admins(id, name, email)', { count: 'exact' })
      .eq('admin_id', currentAdmin.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bills, count, error } = await query
      .order(sortBy, { ascending: sortOrder.toUpperCase() === 'ASC' })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        bills: bills || [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error: any) {
    console.error('Get all bills error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    const body = await req.json();

    const { tenant_id, property_id, amount, rent_amount, charges, month, due_date, description } = body;

    if (!tenant_id || !property_id || !amount || !month || !due_date) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: tenant_id, property_id, amount, month, due_date',
      }, { status: 400 });
    }

    const tenantId = parseInt(tenant_id, 10);
    const propId = parseInt(property_id, 10);

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*, property:properties(id, monthly_rent)')
      .eq('id', tenantId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ success: false, message: 'Tenant not found or not authorized' }, { status: 404 });
    }

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ success: false, message: 'Property not found or not authorized' }, { status: 404 });
    }

    // Check if bill exists
    const { data: existingBill } = await supabaseAdmin
      .from('bills')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('month', month)
      .eq('admin_id', currentAdmin.id)
      .maybeSingle();

    if (existingBill) {
      return NextResponse.json({ success: false, message: 'Bill already exists for this tenant and month' }, { status: 400 });
    }

    const parsedRentAmount = rent_amount ? parseFloat(rent_amount) : (tenant.property?.monthly_rent ? parseFloat(tenant.property.monthly_rent) : parseFloat(amount));
    const chargesAmount = charges ? parseFloat(charges) : 0;
    const totalAmount = parsedRentAmount + chargesAmount;

    // Generate unique bill reference number
    const billNumber = `BILL-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    const { data: bill, error: insertError } = await supabaseAdmin
      .from('bills')
      .insert({
        tenant_id: tenantId,
        property_id: propId,
        admin_id: currentAdmin.id,
        amount: parseFloat(amount),
        rent_amount: parsedRentAmount,
        charges: chargesAmount,
        total_amount: totalAmount,
        month,
        due_date,
        bill_date: new Date().toISOString().split('T')[0],
        description: description || 'Monthly rent payment',
        bill_number: billNumber,
        language: 'fr',
        status: 'PENDING'
      })
      .select('*, tenant:tenants(id, name, email, phone), property:properties(id, title, address, city)')
      .single();

    if (insertError || !bill) {
      return NextResponse.json({ success: false, message: 'Failed to create bill', error: insertError?.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill created successfully',
      data: bill,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
