import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import crypto from "node:crypto";

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) return new Response("No signature", { status: 400 });

  const expected = crypto
    .createHmac("sha256", Deno.env.get("RAZORPAY_KEY_SECRET")!)
    .update(body)
    .digest("hex");

  if (expected !== signature)
    return new Response("Invalid signature", { status: 401 });

  const payload = JSON.parse(body);
  const payment = payload.payload.payment.entity;
  const registration_id = payment.notes?.registration_id;

  if (!registration_id)
    return new Response("Missing registration id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabase.from("payments").insert({
    registration_id,
    razorpay_order_id: payment.order_id,
    razorpay_payment_id: payment.id,
    razorpay_signature: signature,
    amount: payment.amount / 100,
    status: "SUCCESS",
  });

  await supabase.rpc("confirm_registration", {
    p_registration_id: registration_id,
  });

  return new Response("Payment processed", { status: 200 });
});
