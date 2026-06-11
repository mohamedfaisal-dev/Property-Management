import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { hashPassword } from '../../../../lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    const { password: _, ...adminResponse } = admin as any;
    return NextResponse.json({ success: true, data: { admin: adminResponse } });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { name, email, password } = await req.json();

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    
    if (email && email !== currentAdmin.email) {
      // Check if email already taken
      const { data: existingAdmin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingAdmin) {
        return NextResponse.json({ success: false, error: 'Email already taken' }, { status: 400 });
      }
      updateData.email = email;
    }

    if (password) {
      updateData.password = await hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      const { password: _, ...adminResponse } = currentAdmin as any;
      return NextResponse.json({ success: true, data: { admin: adminResponse } });
    }

    // Update in Supabase
    const { data: updatedAdmin, error } = await supabaseAdmin
      .from('admins')
      .update(updateData)
      .eq('id', currentAdmin.id)
      .select('*')
      .single();

    if (error || !updatedAdmin) {
      return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }

    const { password: _, ...adminResponse } = updatedAdmin;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { admin: adminResponse },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
