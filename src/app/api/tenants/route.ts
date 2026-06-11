import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const propertyId = searchParams.get('property_id') || '';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('tenants')
      .select('*, admin:admins(id, name, email), property:properties(id, title, address, city, country, property_type)', { count: 'exact' })
      .eq('admin_id', currentAdmin.id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (propertyId) {
      query = query.eq('property_id', parseInt(propertyId, 10));
    }

    const { data: tenants, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: {
        tenants: tenants || [],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });

  } catch (error: any) {
    console.error('Get tenants error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    const body = await req.json();

    const {
      name,
      email,
      phone,
      property_id,
      lease_start,
      lease_end,
      rent_amount,
      status = 'ACTIVE',
    } = body;

    if (!name || !property_id) {
      return NextResponse.json({ success: false, error: 'Name and property_id are required' }, { status: 400 });
    }

    const propId = parseInt(property_id, 10);

    // Verify property exists and is owned by the admin (if target is standard ADMIN role)
    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('admin_id')
      .eq('id', propId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    if (currentAdmin.role === 'ADMIN' && property.admin_id !== currentAdmin.id) {
      return NextResponse.json({ success: false, error: 'Access denied. You can only add tenants to your own properties.' }, { status: 403 });
    }

    // Insert tenant in Supabase
    const { data: tenant, error: insertError } = await supabaseAdmin
      .from('tenants')
      .insert({
        admin_id: currentAdmin.id,
        property_id: propId,
        name,
        email,
        phone,
        lease_start: lease_start || null,
        lease_end: lease_end || null,
        rent_amount: rent_amount ? parseFloat(rent_amount) : null,
        status,
        join_date: new Date().toISOString().split('T')[0] // Default join_date to today
      })
      .select('*, admin:admins(id, name, email), property:properties(id, title, address, city, country, property_type)')
      .single();

    if (insertError || !tenant) {
      return NextResponse.json({ success: false, error: insertError?.message || 'Failed to create tenant' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant created successfully',
      data: { tenant },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create tenant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
