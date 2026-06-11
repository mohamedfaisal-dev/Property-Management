import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .select('*, tenant:tenants(name)')
      .eq('id', billId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (error || !bill) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });
    }

    // Mock PDF file response
    const mockPdfHeader = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 50 >>\nstream\nBT /F1 24 Tf 100 700 Td (Mock PDF Bill ref: ${bill.bill_number || bill.id}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000212 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n310\n%%EOF`;
    
    const buffer = Buffer.from(mockPdfHeader, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="facture-${bill.id}-${bill.month}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Download bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
