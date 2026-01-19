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

    // Check if event exists and get pricing info
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('price, title, pricing_type, pricing_dropdown_label')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // For custom pricing, validate selected pricing option
    let selectedPricingOption = null;
    let actualPrice = event.price;

    if (event.pricing_type === 'custom') {
      const selectedOptionId = body?.selected_pricing_option_id as string | undefined;
      if (!selectedOptionId) {
        throw new Error('Pricing option selection is required for custom pricing events');
      }

      const { data: pricingOption, error: pricingError } = await admin
        .from('event_pricing_options')
        .select('id, label, price')
        .eq('id', selectedOptionId)
        .eq('event_id', eventId)
        .single();

      if (pricingError || !pricingOption) {
        throw new Error('Invalid pricing option selected');
      }

      selectedPricingOption = pricingOption;
      actualPrice = pricingOption.price;
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
    if (actualPrice === 0) {
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
      amount: actualPrice * 100,
      currency: "INR",
      receipt: `ord_${Date.now().toString(36)}`,
      notes: {
        event_id: eventId,
        user_id: user.id,
        event_title: event.title,
        pricing_type: event.pricing_type,
        ...(event.pricing_type === 'custom' && {
          pricing_option_id: selectedPricingOption?.id,
          pricing_option_label: selectedPricingOption?.label,
          pricing_option_price: selectedPricingOption?.price
        })
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
      amount: actualPrice,
      event_title: event.title,
      pricing_type: event.pricing_type,
      ...(event.pricing_type === 'custom' && {
        selected_pricing_option: selectedPricingOption
      })
    });

  } catch (error: any) {
    console.error('register-event failed', {
      error: error.message,
      stack: error.stack,
      eventId,
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Return specific error messages for better user experience
    let errorMessage = 'Registration failed';
    let statusCode = 400;
    
    if (error.message.includes('Event not found')) {
      errorMessage = 'This event is no longer available';
      statusCode = 404;
    } else if (error.message.includes('Already registered')) {
      errorMessage = 'You are already registered for this event';
      statusCode = 409;
    } else if (error.message.includes('Razorpay API Error')) {
      errorMessage = 'Payment service is temporarily unavailable. Please try again later';
      statusCode = 503;
    } else if (error.message.includes('Unable to register')) {
      errorMessage = 'Registration is currently full or closed';
      statusCode = 409;
    } else if (error.message.includes('capacity')) {
      errorMessage = 'This event has reached maximum capacity';
      statusCode = 409;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        error_code: error.message.includes('Razorpay') ? 'PAYMENT_ERROR' : 'REGISTRATION_ERROR',
        retry_after: statusCode === 503 ? 60 : undefined // Suggest retry after 60 seconds for service errors
      },
      { status: statusCode }
    );
  }
}
