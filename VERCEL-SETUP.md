# Vercel Environment Variables Setup for Razorpay Testing

## 🚀 Add These Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select your Event Management project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Variables

**Payment Configuration:**
```
NEXT_PUBLIC_PAYMENTS_ENABLED=true
RAZORPAY_KEY_ID=rzp_test_RzjcsZOvCgVRla
RAZORPAY_KEY_SECRET=9wFflAYtmO6zo7CIAOsdWdRH
```

**Database Configuration (if not already set):**
```
NEXT_PUBLIC_SUPABASE_URL=https://bfspxxunptawbuivhvyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc3B4eHVucHRhd2J1aXZodnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjg0OTQsImV4cCI6MjA4MTY0NDQ5NH0.mMHB0vI6wvhAabaD8PJZaF3xNcoIzwOiUlvYCyizHgc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc3B4eHVucHRhd2J1aXZodnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA2ODQ5NCwiZXhwIjoyMDgxNjQ0NDk0fQ._bpWK8iPPYBK5XwSkx6nlKJNqUYbAy33JTMcg0_Tctg
```

**QR Code Security (if not already set):**
```
QR_HMAC_SECRET=HliUYyxP8^{WQN(2oEK;Rra4JmD#FnsaSDHt!HYq{MP]QO:X;CAFypqW/DU?p5c$
```

### Step 3: Environment Variable Types

**Public Variables (NEXT_PUBLIC_*)**
- Accessible in browser code
- Safe to expose to frontend

**Private Variables**
- Server-side only
- Never exposed to browser

### Step 4: Deploy After Adding Variables

1. **Redeploy**: After adding environment variables, trigger a new deployment
2. **Wait**: Deployment takes 2-3 minutes
3. **Test**: Once deployed, test payment flow on live site

## 🎯 Testing on Live Demo

After deployment, test at: **https://your-app.vercel.app**

### Test Steps:
1. **Create paid event** via admin dashboard
2. **Register for event** as test user
3. **Test UPI payment** with `success@razorpay`
4. **Verify confirmation** and ticket generation

## 🔍 Verification Checklist

✅ **Environment Variables Added**
✅ **Deployment Complete**  
✅ **Payments Enabled**
✅ **Razorpay Keys Working**
✅ **UPI Test ID**: `success@razorpay`
✅ **Payment Flow Working**

## 🚨 Important Notes

- **Test Mode**: Using Razorpay test keys (no real money)
- **Webhook URL**: Will be `https://your-app.vercel.app/api/razorpay/webhook`
- **Database**: Same Supabase instance as local
- **Security**: All test credentials are safe for demo

## 📞 Next Steps

1. Add variables to Vercel
2. Trigger deployment
3. Test payment flow on live site
4. Share demo link for testing
