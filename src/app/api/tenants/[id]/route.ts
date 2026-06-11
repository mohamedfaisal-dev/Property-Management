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
    const tenantId = parseInt(id, 10);

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*, admin:admins(id, name, email), property:properties(id, title, address, city, country, property_type, monthly_rent)')
      .eq('id', tenantId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { tenant } });

  } catch (error: any) {
    console.error('Get tenant by ID error:', error);
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
    const tenantId = parseInt(id, 10);
    const body = await req.json();

    const {
      name,
      email,
      phone,
      property_id,
      lease_start,
      lease_end,
      rent_amount,
      status,
    } = body;

    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (lease_start !== undefined) updateData.lease_start = lease_start || null;
    if (lease_end !== undefined) updateData.lease_end = lease_end || null;
    if (rent_amount !== undefined) updateData.rent_amount = rent_amount ? parseFloat(rent_amount) : null;
    if (status) updateData.status = status;

    if (property_id && parseInt(property_id, 10) !== tenant.property_id) {
      const propId = parseInt(property_id, 10);
      const { data: property, error: propError } = await supabaseAdmin
        .from('properties')
        .select('admin_id')
        .eq('id', propId)
        .single();

      if (propError || !property) {
        return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
      }

      if (currentAdmin.role === 'ADMIN' && property.admin_id !== currentAdmin.id) {
        return NextResponse.json({ success: false, error: 'Access denied. You can only assign tenants to your own properties.' }, { status: 403 });
      }
      updateData.property_id = propId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: { tenant } });
    }

    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select('*, admin:admins(id, name, email), property:properties(id, title, address, city, country, property_type)')
      .single();

    if (updateError || !updatedTenant) {
      return NextResponse.json({ success: false, error: 'Failed to update tenant' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant updated successfully',
      data: { tenant: updatedTenant },
    });

  } catch (error: any) {
    console.error('Update tenant error:', error);
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
    const tenantId = parseInt(id, 10);

    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteError) {
      return NextResponse.json({ success: false, error: 'Failed to delete tenant' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Tenant deleted successfully' });

  } catch (error: any) {
    console.error('Delete tenant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
