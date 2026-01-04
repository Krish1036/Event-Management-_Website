import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export async function checkIn(params: { registration_id: string; entry_code: string }) {
  const { registration_id, entry_code } = params;
  console.log('[edge] checkIn called', { registration_id, entry_code });

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Check if registration exists and entry code matches
  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .select('*')
    .eq('id', registration_id)
    .eq('entry_code', entry_code)
    .single();

  console.log('[edge] registration lookup', { registration, registrationError });

  if (registrationError || !registration) {
    throw new Error('Invalid registration or entry code');
  }

  // Insert attendance row (use attendance table to track check-ins)
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .insert({ registration_id })
    .select()
    .single();

  if (attendanceError) {
    console.error('[edge] attendance insert failed', attendanceError);
    throw new Error('Failed to record attendance');
  }

  console.log('[edge] attendance recorded', attendance);

  return { success: true };
}

export async function registerForEvent(params: { event_id: string; user_id: string }) {
  const { event_id, user_id } = params;
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Check if event exists and is active
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .single();

  if (eventError || !event) {
    throw new Error('Event not found');
  }

  // Check if user is already registered
  const { data: existingRegistration } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', event_id)
    .eq('user_id', user_id)
    .single();

  if (existingRegistration) {
    throw new Error('Already registered for this event');
  }

  console.log('[edge] creating registration', { event_id, user_id });

  // Generate a random 6-digit entry code (placeholder - real entry code is generated on confirm)
  const entry_code = Math.floor(100000 + Math.random() * 900000).toString();

  // Create registration - use schema fields and valid status value
  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .insert({
      event_id,
      user_id,
      status: 'PENDING',
      entry_code
    })
    .select()
    .single();

  console.log('[edge] registration result', { registration, registrationError });

  if (registrationError) {
    console.error('[edge] Registration error:', registrationError);
    throw new Error('Failed to register for event');
  }

  return { success: true, registration };
}
