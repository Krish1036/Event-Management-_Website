import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual payment confirmation called');
    
    const supabase = getSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { event_id, payment_id, order_id, amount } = body;

    console.log('📝 Manual confirmation details:', {
      user_id: user.id,
      event_id,
      payment_id,
      order_id,
      amount
    });

    if (!event_id || !payment_id || !order_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: event_id, payment_id, order_id' 
      }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Check if registration already exists
    const { data: existingRegistration } = await admin
      .from('registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    if (existingRegistration) {
      console.log('ℹ️ Registration already exists:', existingRegistration.id);
      return NextResponse.json({ 
        success: true, 
        message: 'Registration already exists',
        registration_id: existingRegistration.id
      });
    }

    // Create registration
    const { data: registrationId, error: registrationError } = await admin.rpc('register_for_event', {
      p_event_id: event_id,
      p_user_id: user.id
    });

    if (registrationError || !registrationId) {
      console.error('❌ Failed to create registration:', registrationError);
      throw new Error('Failed to create registration');
    }

    console.log('✅ Registration created:', registrationId);

    // Record payment
    const { error: paymentError } = await admin.from("payments").insert({
      registration_id: registrationId,
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: 'manual_confirmation',
      amount: amount / 100, // Convert from paise to rupees
      status: "SUCCESS",
    });

    if (paymentError) {
      console.error('❌ Failed to record payment:', paymentError);
      throw new Error('Failed to record payment');
    }

    console.log('✅ Payment recorded');

    // Confirm registration
    const { error: confirmError } = await admin.rpc("confirm_registration", {
      p_registration_id: registrationId,
    });

    if (confirmError) {
      console.error('❌ Failed to confirm registration:', confirmError);
      throw new Error('Failed to confirm registration');
    }

    console.log('✅ Registration confirmed successfully');

    return NextResponse.json({ 
      success: true, 
      message: "Payment confirmed and registration created",
      registration_id: registrationId
    });

  } catch (error: any) {
    console.error('❌ Manual confirmation failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Manual confirmation failed" },
      { status: 500 }
    );
  }
}
