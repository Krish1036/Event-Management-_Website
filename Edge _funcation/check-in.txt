import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const { registration_id, entry_code } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: registration } = await supabase
    .from("registrations")
    .select("id,status")
    .or(
      registration_id
        ? `id.eq.${registration_id}`
        : `entry_code.eq.${entry_code}`
    )
    .single();

  if (!registration)
    return new Response("Registration not found", { status: 404 });

  if (registration.status !== "CONFIRMED")
    return new Response("Not confirmed", { status: 400 });

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("registration_id", registration.id)
    .single();

  if (existing)
    return new Response("Already checked in", { status: 409 });

  await supabase.from("attendance").insert({
    registration_id: registration.id,
  });

  return Response.json({ success: true });
});
