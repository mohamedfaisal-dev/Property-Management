import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../../lib/supabase';
import { comparePassword } from '../../../../lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    // Look up admin by email in Supabase
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('status', 'ACTIVE')
      .single();

    if (error || !admin) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate token
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

    // Remove password from returned admin object
    const { password: _, ...adminResponse } = admin;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { admin: adminResponse, token },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
