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

    if (bill.status === 'PAID') {
      return NextResponse.json({ success: false, message: 'Cette facture est déjà marquée comme payée' }, { status: 400 });
    }

    const amountToAdd = parseFloat(bill.total_amount || bill.amount || 0);

    // Update status in Supabase
    const { data: updatedBill, error: updateError } = await supabaseAdmin
      .from('bills')
      .update({
        status: 'PAID',
        payment_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', billId)
      .select('*')
      .single();

    if (updateError || !updatedBill) {
      return NextResponse.json({ success: false, message: 'Échec de la mise à jour de la facture' }, { status: 500 });
    }

    // Increment admin profit
    const { data: profitRecord } = await supabaseAdmin
      .from('profits')
      .select('*')
      .eq('admin_id', currentAdmin.id)
      .maybeSingle();

    let newProfitTotal = amountToAdd;
    if (profitRecord) {
      newProfitTotal = parseFloat(profitRecord.total_profit) + amountToAdd;
      await supabaseAdmin
        .from('profits')
        .update({
          total_profit: newProfitTotal,
          last_updated: new Date().toISOString()
        })
        .eq('admin_id', currentAdmin.id);
    } else {
      await supabaseAdmin
        .from('profits')
        .insert({
          admin_id: currentAdmin.id,
          total_profit: newProfitTotal,
          last_updated: new Date().toISOString()
        });
    }

    console.log(`✅ Bill ${billId} marked as paid. Added €${amountToAdd.toFixed(2)} to profit. New total: €${newProfitTotal.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Facture marquée comme payée avec succès',
      data: {
        bill: {
          id: updatedBill.id,
          status: updatedBill.status,
          payment_date: updatedBill.payment_date,
          amount: amountToAdd,
        },
        profit: {
          total: newProfitTotal,
          added: amountToAdd,
        },
      },
    });

  } catch (error: any) {
    console.error('Error marking bill as paid:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
