import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import EventImage from './EventImage';

export const revalidate = 30;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getEvents(params: { paid?: 'free' | 'paid' }) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('events')
    .select('id,title,description,event_date,location,price,is_paid,capacity,is_registration_open,status,image_url')
    .gte('event_date', new Date().toISOString().slice(0, 10))
    .eq('status', 'approved')
    .order('event_date', { ascending: true });

  if (params.paid === 'free') {
    query = query.eq('is_paid', false);
  } else if (params.paid === 'paid') {
    query = query.eq('is_paid', true);
  }

  const { data: events } = await query;

  return events ?? [];
}

export default async function EventsPage({ searchParams }: { searchParams: { paid?: string } }) {
  const filterPaid = searchParams.paid === 'free' || searchParams.paid === 'paid' ? (searchParams.paid as 'free' | 'paid') : undefined;
  const events = await getEvents({ paid: filterPaid });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
          <p className="text-gray-600">Discover and join amazing events at Ganpat University</p>
        </div>
        
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Filter:</span>
            <Link
              href="/events"
              className={`rounded-full px-4 py-2 font-medium transition-all duration-200 ${!filterPaid ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              All Events
            </Link>
            <Link
              href="/events?paid=free"
              className={`rounded-full px-4 py-2 font-medium transition-all duration-200 ${filterPaid === 'free' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Free Events
            </Link>
            <Link
              href="/events?paid=paid"
              className={`rounded-full px-4 py-2 font-medium transition-all duration-200 ${filterPaid === 'paid' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Paid Events
            </Link>
          </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id as string}
              href={`/events/${event.id}`}
              className="group flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Event Image */}
              <div className="w-full h-48 bg-gray-100 overflow-hidden">
                <EventImage 
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Event Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-lg text-gray-900 group-hover:text-purple-700 transition-colors">
                    {event.title}
                  </h2>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                    {event.is_paid ? `₹${event.price}` : 'Free'}
                    {!PAYMENTS_ENABLED && event.is_paid && ' · Test Mode'}
                  </span>
                </div>
                
                <p className="mb-4 text-gray-600 line-clamp-2 flex-1">{event.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(event.event_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">No upcoming events match your filters. Try adjusting your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
