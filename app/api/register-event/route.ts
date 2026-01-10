import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabaseUser = getSupabaseServerClient();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const limit = rateLimit(request, user.id);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const eventId = body?.event_id as string | undefined;
  if (!eventId) {
    return NextResponse.json({ success: false, error: 'Missing event_id' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdminClient();

    // Check if event exists and get price
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('price, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check if user is already registered
    const { data: existingRegistration } = await admin
      .from('registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (existingRegistration) {
      throw new Error('Already registered for this event');
    }

    // FREE EVENT - Register immediately
    if (event.price === 0) {
      const { data: registrationId, error } = await admin.rpc('register_for_event', {
        p_event_id: eventId,
        p_user_id: user.id
      });

      if (error || !registrationId) {
        throw new Error(error?.message || 'Unable to register');
      }

      const { error: confirmError } = await admin.rpc('confirm_registration', {
        p_registration_id: registrationId
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      return NextResponse.json({ success: true, free: true, registration_id: registrationId });
    }

    // PAID EVENT - Create Razorpay order first, registration after payment
    const orderPayload = {
      amount: event.price * 100,
      currency: "INR",
      receipt: `ord_${Date.now().toString(36)}`,
      notes: {
        event_id: eventId,
        user_id: user.id,
        event_title: event.title
      },
    };

    console.log('Creating Razorpay order:', {
      url: "https://api.razorpay.com/v1/orders",
      payload: orderPayload,
      keyId: process.env.RAZORPAY_KEY_ID,
      hasSecret: !!process.env.RAZORPAY_KEY_SECRET
    });

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Razorpay API Error:', {
        status: res.status,
        statusText: res.statusText,
        error: errorText,
        headers: Object.fromEntries(res.headers.entries())
      });
      throw new Error(`Razorpay API Error: ${res.status} - ${errorText}`);
    }

    const order = await res.json();

    return NextResponse.json({
      success: true,
      order_id: order.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      amount: event.price,
      event_title: event.title
    });

  } catch (error: any) {
    console.error('register-event failed', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
