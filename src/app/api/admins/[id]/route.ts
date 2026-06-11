import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { hashPassword } from '../../../../lib/crypto';

// Helper to check if request is authorized (SUPER_ADMIN only)
async function checkSuperAdmin(req: NextRequest) {
  const currentAdmin = await verifyAuth(req);
  if (!isSuperAdmin(currentAdmin)) {
    throw new Error('Access denied. Super admin privileges required.');
  }
  return currentAdmin;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkSuperAdmin(req);
    const { id } = await params;

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error || !admin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    const { password: _, ...adminResponse } = admin;
    return NextResponse.json({ success: true, data: { admin: adminResponse } });

  } catch (error: any) {
    console.error('Get admin by ID error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkSuperAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const { name, email, password, role, status } = body;

    const targetId = parseInt(id, 10);

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchError || !admin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    // Check email uniqueness if modified
    if (email && email !== admin.email) {
      const { data: existingAdmin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingAdmin) {
        return NextResponse.json({ success: false, error: 'Email already taken' }, { status: 400 });
      }
    }

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await hashPassword(password);
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      const { password: _, ...adminResponse } = admin;
      return NextResponse.json({ success: true, data: { admin: adminResponse } });
    }

    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admins')
      .update(updateData)
      .eq('id', targetId)
      .select('*')
      .single();

    if (updateError || !updatedAdmin) {
      return NextResponse.json({ success: false, error: 'Failed to update admin' }, { status: 500 });
    }

    const { password: _, ...adminResponse } = updatedAdmin;
    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin: adminResponse },
    });

  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkSuperAdmin(req);
    const { id } = await params;
    const targetId = parseInt(id, 10);

    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchError || !admin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    // Prevent deletion of the last SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      const { count, error: countError } = await supabaseAdmin
        .from('admins')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'SUPER_ADMIN');

      if (countError) {
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
      }

      if (count && count <= 1) {
        return NextResponse.json({ success: false, error: 'Cannot delete the last super admin' }, { status: 400 });
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('id', targetId);

    if (deleteError) {
      return NextResponse.json({ success: false, error: 'Failed to delete admin' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });

  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
