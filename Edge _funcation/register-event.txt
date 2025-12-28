import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const token = auth.replace("Bearer ", "");

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data } = await supabaseUser.auth.getUser();
  if (!data.user) return new Response("Invalid user", { status: 401 });

  const { event_id, answers } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: fields, error: fieldsError } = await supabaseAdmin
    .from("event_form_fields")
    .select("id,required,field_type,options,disabled")
    .eq("event_id", event_id);

  if (fieldsError) return new Response(fieldsError.message, { status: 400 });

  const activeFields = (fields || []).filter((f: any) => !f.disabled);

  const safeAnswers = Array.isArray(answers) ? answers : [];

  for (const field of activeFields) {
    if (!field.required) continue;
    const answer = safeAnswers.find((a: any) => a.field_id === field.id);
    if (!answer || typeof answer.value !== "string" || !answer.value.trim()) {
      return new Response("Missing required field response", { status: 400 });
    }
    if (field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0) {
      if (!field.options.includes(answer.value)) {
        return new Response("Invalid option selected", { status: 400 });
      }
    }
  }

  const { data: registration_id, error } =
    await supabaseAdmin.rpc("register_for_event", {
      p_event_id: event_id,
      p_user_id: data.user.id,
    });

  if (error) return new Response(error.message, { status: 400 });

  if (safeAnswers.length > 0) {
    const payload = safeAnswers.map((a: any) => ({
      registration_id,
      field_id: a.field_id,
      value: a.value,
    }));
    const { error: responsesError } = await supabaseAdmin
      .from("registration_responses")
      .insert(payload);
    if (responsesError) return new Response(responsesError.message, { status: 400 });
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("price")
    .eq("id", event_id)
    .single();

  // FREE EVENT
  if (!event || event.price === 0) {
    await supabaseAdmin.rpc("confirm_registration", {
      p_registration_id: registration_id,
    });

    return Response.json({ success: true, free: true });
  }

  // PAID EVENT → Razorpay order
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        btoa(
          `${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get(
            "RAZORPAY_KEY_SECRET"
          )}`
        ),
    },
    body: JSON.stringify({
      amount: event.price * 100,
      currency: "INR",
      receipt: registration_id,
      notes: { registration_id },
    }),
  });

  const order = await res.json();

  await supabaseAdmin.from("payments").insert({
    registration_id,
    razorpay_order_id: order.id,
    amount: event.price,
    status: "CREATED",
  });

  return Response.json({
    success: true,
    order_id: order.id,
    razorpay_key: Deno.env.get("RAZORPAY_KEY_ID"),
    amount: event.price,
  });
});
