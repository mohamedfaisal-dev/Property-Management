import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { hashPassword } from '../../../lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('admins')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: admins, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Strip passwords from response
    const adminsResponse = (admins || []).map((admin: any) => {
      const { password, ...rest } = admin;
      return rest;
    });

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: {
        admins: adminsResponse,
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
    console.error('Get all admins error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    if (!isSuperAdmin(currentAdmin)) {
      return NextResponse.json({ success: false, error: 'Access denied. Super admin privileges required.' }, { status: 403 });
    }

    const { name, email, password, role = 'ADMIN', status = 'ACTIVE' } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Check if email taken
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json({ success: false, error: 'Admin with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .insert({
        name,
        email,
        password: hashedPassword,
        role,
        status,
        created_by: currentAdmin.id
      })
      .select('*')
      .single();

    if (error || !admin) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed to create admin' }, { status: 500 });
    }

    const { password: _, ...adminResponse } = admin;

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: adminResponse },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
