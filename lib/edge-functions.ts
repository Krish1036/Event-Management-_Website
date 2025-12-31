import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export async function checkIn(ticketId: string, userId: string) {
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

  // Check if ticket exists and belongs to the user
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('user_id', userId)
    .single();

  if (ticketError || !ticket) {
    throw new Error('Ticket not found or access denied');
  }

  // Update check-in status
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (updateError) {
    throw new Error('Failed to update check-in status');
  }

  return { success: true };
}
