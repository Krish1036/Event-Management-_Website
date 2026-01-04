import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export async function checkIn(params: { registration_id: string; entry_code: string }) {
  const { registration_id, entry_code } = params;
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

  if (registrationError || !registration) {
    throw new Error('Invalid registration or entry code');
  }

  // Update check-in status
  const { error: updateError } = await supabase
    .from('registrations')
    .update({ 
      checked_in: true, 
      checked_in_at: new Date().toISOString() 
    })
    .eq('id', registration_id);

  if (updateError) {
    throw new Error('Failed to update check-in status');
  }

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

  // Generate a random 6-digit entry code
  const entry_code = Math.floor(100000 + Math.random() * 900000).toString();

  // Create registration
  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .insert({
      event_id,
      user_id,
      status: 'confirmed',
      registered_at: new Date().toISOString(),
      entry_code,
      checked_in: false
    })
    .select()
    .single();

  if (registrationError) {
    console.error('Registration error:', registrationError);
    throw new Error('Failed to register for event');
  }

  return { success: true, registration };
}
