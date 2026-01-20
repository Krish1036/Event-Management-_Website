import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import OrganizerEmailCenterClient from './OrganizerEmailCenterClient';

async function requireOrganizer() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/organizer');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'organizer') {
    redirect('/');
  }

  return { user, profile };
}

async function getOrganizerEvents(organizerId: string) {
  const supabase = getSupabaseServerClient();
  
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      event_date,
      status,
      created_at
    `)
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }

  return events || [];
}

async function getEmailHistory(organizerId: string, eventId?: string) {
  const supabase = getSupabaseServerClient();
  
  let query = supabase
    .from('event_emails')
    .select(`
      id,
      event_id,
      sent_by,
      sender_role,
      subject,
      recipient_count,
      sent_at,
      events!inner(title)
    `)
    .eq('sent_by', organizerId)
    .eq('sender_role', 'organizer')
    .order('sent_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data: emails, error } = await query;

  if (error) {
    console.error('Error fetching email history:', error);
    return [];
  }

  return emails || [];
}

export default async function OrganizerEmailCenterPage({
  searchParams
}: {
  searchParams: { event_id?: string };
}) {
  const { user, profile } = await requireOrganizer();
  const events = await getOrganizerEvents(user.id);
  const emailHistory = await getEmailHistory(user.id, searchParams.event_id);

  return (
    <OrganizerEmailCenterClient
      user={user}
      profile={profile}
      events={events}
      emailHistory={emailHistory}
      selectedEventId={searchParams.event_id}
    />
  );
}
