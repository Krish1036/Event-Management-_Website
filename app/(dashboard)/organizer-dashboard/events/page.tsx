import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import MyEventsClient from './MyEventsClient';

export const revalidate = 0;

async function requireOrganizer() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/organizer');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'organizer') {
    redirect('/');
  }

  return { user };
}

async function getOrganizerEvents(organizerId: string) {
  const supabase = getSupabaseServerClient();

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      location,
      event_date,
      start_time,
      end_time,
      status,
      image_url,
      created_by,
      assigned_organizer,
      created_at
    `)
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organizer events:', error);
    throw new Error('Failed to fetch events');
  }

  return events || [];
}

export default async function OrganizerEventsPage() {
  const { user } = await requireOrganizer();
  const events = await getOrganizerEvents(user.id);

  return <MyEventsClient events={events} />;
}
