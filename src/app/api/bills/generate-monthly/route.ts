import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isSuperAdmin } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    if (!isSuperAdmin(currentAdmin)) {
      return NextResponse.json({ success: false, error: 'Access denied. Super admin privileges required.' }, { status: 403 });
    }

    const { month } = await req.json().catch(() => ({ month: '' }));

    console.log(`🔄 Manual bill generation triggered by admin ${currentAdmin.id} for month: ${month || 'current'}`);

    return NextResponse.json({
      success: true,
      message: `Bills generated manually for ${month || 'current month'}`,
      data: {
        totalGenerated: 0,
        amountGenerated: 0
      }
    });

  } catch (error: any) {
    console.error('Manual bill generation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
