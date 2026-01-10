import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const payment = payload.payload.payment.entity;
    
    // Get event and user info from Razorpay notes
    const event_id = payment.notes?.event_id;
    const user_id = payment.notes?.user_id;
    const event_title = payment.notes?.event_title;

    if (!event_id || !user_id) {
      return NextResponse.json({ error: "Missing event_id or user_id" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Check if registration already exists (prevent duplicates)
    const { data: existingRegistration } = await admin
      .from('registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user_id)
      .single();

    if (existingRegistration) {
      return NextResponse.json({ error: "Registration already exists" }, { status: 400 });
    }

    // Create registration AFTER successful payment
    const { data: registrationId, error: registrationError } = await admin.rpc('register_for_event', {
      p_event_id: event_id,
      p_user_id: user_id
    });

    if (registrationError || !registrationId) {
      console.error('Failed to create registration after payment:', registrationError);
      return NextResponse.json({ error: "Failed to create registration" }, { status: 500 });
    }

    // Record payment
    const { error: paymentError } = await admin.from("payments").insert({
      registration_id: registrationId,
      razorpay_order_id: payment.order_id,
      razorpay_payment_id: payment.id,
      razorpay_signature: signature,
      amount: payment.amount / 100,
      status: "SUCCESS",
    });

    if (paymentError) {
      console.error('Failed to record payment:', paymentError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Confirm registration
    const { error: confirmError } = await admin.rpc("confirm_registration", {
      p_registration_id: registrationId,
    });

    if (confirmError) {
      console.error('Failed to confirm registration:', confirmError);
      return NextResponse.json({ error: "Failed to confirm registration" }, { status: 500 });
    }

    console.log('✅ Payment processed and registration confirmed:', {
      registrationId,
      event_id,
      user_id,
      payment_id: payment.id
    });

    return NextResponse.json({ 
      success: true, 
      message: "Payment processed and registration confirmed",
      registration_id: registrationId
    });

  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
