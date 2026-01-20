import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import AdminEmailCenterClient from './AdminEmailCenterClient';

async function requireAdmin() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user, profile };
}

async function getEvents() {
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
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return events || [];
}

async function getEmailHistory(eventId?: string) {
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

export default async function AdminEmailCenterPage({
  searchParams
}: {
  searchParams: { event_id?: string };
}) {
  const { user, profile } = await requireAdmin();
  const events = await getEvents();
  const emailHistory = await getEmailHistory(searchParams.event_id);

  return (
    <AdminEmailCenterClient
      user={user}
      profile={profile}
      events={events}
      emailHistory={emailHistory}
      selectedEventId={searchParams.event_id}
    />
  );
}
