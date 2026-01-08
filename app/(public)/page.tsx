import { getSupabaseServerClient } from '@/lib/supabase-server';
import EventsClient from './EventsClient';
import './EventsDashboard.css';
import './ListView.css';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = getSupabaseServerClient();
  
  const { data: events } = await supabase
    .from('events')
    .select('id,title,description,event_date,start_time,end_time,location,price,is_paid,capacity')
    .eq('status', 'approved')
    .order('event_date', { ascending: true })
    .limit(50); // Get more events for filtering

  // Get registration counts for each event
  const eventsWithCounts = await Promise.all(
    (events || []).map(async (event) => {
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .in('status', ['PENDING', 'CONFIRMED']);
      
      return {
        ...event,
        registered_count: count || 0
      };
    })
  );

  return <EventsClient initialEvents={eventsWithCounts} />;
}