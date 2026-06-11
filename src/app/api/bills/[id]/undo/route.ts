import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await verifyAuth(req);
    const { id } = await params;
    const billId = parseInt(id, 10);

    const { data: bill, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('*, tenant:tenants(id, name, email), property:properties(id, title)')
      .eq('id', billId)
      .eq('admin_id', currentAdmin.id)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json({ success: false, message: 'Facture non trouvée' }, { status: 404 });
    }

    if (bill.status !== 'PAID') {
      return NextResponse.json({ success: false, message: "Cette facture n'est pas marquée comme payée" }, { status: 400 });
    }

    const amountToSubtract = parseFloat(bill.total_amount || bill.amount || 0);

    // Update status in Supabase
    const { data: updatedBill, error: updateError } = await supabaseAdmin
      .from('bills')
      .update({
        status: 'PENDING',
        payment_date: null
      })
      .eq('id', billId)
      .select('*')
      .single();

    if (updateError || !updatedBill) {
      return NextResponse.json({ success: false, message: "Échec de l'annulation du paiement" }, { status: 500 });
    }

    // Subtract from profit
    const { data: profitRecord } = await supabaseAdmin
      .from('profits')
      .select('*')
      .eq('admin_id', currentAdmin.id)
      .maybeSingle();

    let newProfitTotal = 0.0;
    if (profitRecord) {
      newProfitTotal = Math.max(0.0, parseFloat(profitRecord.total_profit) - amountToSubtract);
      await supabaseAdmin
        .from('profits')
        .update({
          total_profit: newProfitTotal,
          last_updated: new Date().toISOString()
        })
        .eq('admin_id', currentAdmin.id);
    }

    console.log(`✅ Bill ${billId} payment undone. Subtracted €${amountToSubtract.toFixed(2)} from profit. New total: €${newProfitTotal.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Paiement annulé avec succès',
      data: {
        bill: {
          id: updatedBill.id,
          status: updatedBill.status,
          payment_date: updatedBill.payment_date,
          amount: amountToSubtract,
        },
        profit: {
          total: newProfitTotal,
          subtracted: amountToSubtract,
        },
      },
    });

  } catch (error: any) {
    console.error('Error undoing payment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
