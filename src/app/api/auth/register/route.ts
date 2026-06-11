import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyAuth, isSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { hashPassword } from '../../../../lib/crypto';

export async function POST(req: NextRequest) {
  try {
    // Verify auth and roles
    const currentAdmin = await verifyAuth(req);
    if (!isSuperAdmin(currentAdmin)) {
      return NextResponse.json({ success: false, error: 'Access denied. Super admin privileges required.' }, { status: 403 });
    }

    const { name, email, password, role = 'ADMIN', status = 'ACTIVE' } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Check if email already exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json({ success: false, error: 'Admin with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Create the admin in Supabase
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

    // Generate token for new admin (optional, original Express code does this)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-jwt';
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
    );

    const { password: _, ...adminResponse } = admin;

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: adminResponse, token },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Register admin error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
