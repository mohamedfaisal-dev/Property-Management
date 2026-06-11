import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ success: false, message: 'Month parameter is required (YYYY-MM format)' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        month,
        status: 'completed',
        details: 'All bills generated successfully'
      }
    });

  } catch (error: any) {
    console.error('Get bill generation stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
