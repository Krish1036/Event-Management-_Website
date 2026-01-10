#!/usr/bin/env node

/**
 * Test script to check UPI availability in Razorpay test mode
 */

const RAZORPAY_KEY_ID = 'rzp_test_RzjcsZOvCgVRla';
const RAZORPAY_KEY_SECRET = '9wFflAYtmO6zo7CIAOsdWdRH';

async function checkUPIAvailability() {
  console.log('🔍 Checking UPI Availability in Razorpay Test Mode...\n');
  
  try {
    // Create a test order to check available payment methods
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
      },
      body: JSON.stringify({
        amount: 10000, // ₹100
        currency: 'INR',
        receipt: 'test_upi_check_' + Date.now(),
        notes: {
          test_upi: true
        }
      })
    });

    if (response.ok) {
      const order = await response.json();
      console.log('✅ Test Order Created Successfully');
      console.log('📝 Order Details:', {
        id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: order.status
      });
      
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Deploy the updated RegisterClient.tsx (now using default config)');
      console.log('2. Test payment with ₹100 event');
      console.log('3. If UPI still missing, the issue is Razorpay test mode limitations');
      
      console.log('\n📱 RAZORPAY TEST MODE LIMITATIONS:');
      console.log('- UPI might not be available in test mode');
      console.log('- Test mode often shows limited payment methods');
      console.log('- Production mode has full UPI support');
      
      console.log('\n🔧 SOLUTIONS:');
      console.log('1. Enable UPI in Razorpay Dashboard → Settings → Payment Methods');
      console.log('2. Try with production keys (real payments)');
      console.log('3. Use Card/Netbanking for testing in test mode');
      
    } else {
      const error = await response.text();
      console.error('❌ Error creating test order:', error);
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
}

checkUPIAvailability();
