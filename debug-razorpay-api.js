#!/usr/bin/env node

/**
 * Debug Razorpay API Connection
 * Test the exact same API call that's failing in production
 */

const RAZORPAY_KEY_ID = 'rzp_test_RzjcsZOvCgVRla';
const RAZORPAY_KEY_SECRET = '9wFflAYtmO6zo7CIAOsdWdRH';

async function testRazorpayOrder() {
  console.log('🔍 Testing Razorpay Order Creation...\n');
  
  const orderPayload = {
    amount: 50000, // ₹500 in paise
    currency: "INR",
    receipt: `order_test_${Date.now()}`,
    notes: {
      event_id: "test-event-id",
      user_id: "test-user-id",
      event_title: "Test Event"
    },
  };

  console.log('📤 Request Payload:', JSON.stringify(orderPayload, null, 2));
  console.log('🔑 Key ID:', RAZORPAY_KEY_ID);
  console.log('🔐 Has Secret:', !!RAZORPAY_KEY_SECRET);
  
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  console.log('🔒 Auth Header (first 20 chars):', auth.substring(0, 20) + '...');

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(orderPayload),
    });

    console.log('\n📥 Response Status:', res.status, res.statusText);
    console.log('📥 Response Headers:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error Response:', errorText);
      return { success: false, error: errorText };
    }

    const order = await res.json();
    console.log('✅ Success! Order Created:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

    return { success: true, order };

  } catch (error) {
    console.error('💥 Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test the API
testRazorpayOrder();
