import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

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
  const { data } = await supabase
    .from('events')
    .select('id,title')
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('title', { ascending: true });

  return data ?? [];
}

async function getOrganizerRegistrations(params: {
  organizerId: string;
  search: string | null;
  eventId: string | null;
  status: string | null;
}) {
  const supabase = getSupabaseServerClient();

  const events = await getOrganizerEvents(params.organizerId);
  const eventIds = events.map((e: any) => e.id as string);
  if (eventIds.length === 0) return { registrations: [], events };

  let query = supabase
    .from('registrations')
    .select(
      `id,status,entry_code,created_at,event_id,user_id,
       event:events(id,title,is_paid,price),
       user:profiles(id,full_name,email)`
    )
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

  if (params.eventId && params.eventId !== 'all') {
    query = query.eq('event_id', params.eventId);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    query = query.or(`entry_code.ilike.%${q}%,profiles.full_name.ilike.%${q}%,profiles.email.ilike.%${q}%`) as any;
  }

  const { data } = await query;

  return {
    registrations: data ?? [],
    events
  };
}

interface SearchParams {
  search?: string;
  event?: string;
  status?: string;
}

export default async function OrganizerRegistrationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireOrganizer();

  const search = searchParams?.search ?? null;
  const eventId = searchParams?.event ?? null;
  const status = searchParams?.status ?? null;

  const { registrations, events } = await getOrganizerRegistrations({
    organizerId: user.id,
    search,
    eventId,
    status
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Registrations</h1>
          <p className="mt-1 text-sm text-slate-400">View registrations for your events (read-only).</p>
        </div>
        <form className="w-full max-w-xs">
          <input
            type="text"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Search by name, email, or entry code"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </form>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <form className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event</label>
            <select
              name="event"
              defaultValue={eventId ?? 'all'}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Events</option>
              {events.map((event: any) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              name="status"
              defaultValue={status ?? 'all'}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {registrations.length === 0 ? (
        <p className="text-sm text-slate-400">No registrations found.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {registrations.map((reg: any) => (
            <div key={reg.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{reg.event?.title ?? 'Event'}</h2>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-200 bg-slate-800">
                    {reg.status}
                  </span>
                  {reg.event?.is_paid && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-100 bg-amber-900/60">
                      Paid
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {reg.user?.full_name ?? 'User'} · {reg.user?.email ?? 'No email'} · Entry code: {reg.entry_code ?? 'N/A'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Registered on {new Date(reg.created_at).toLocaleString()}
                  {reg.event?.price && reg.event.is_paid && ` · Price: ₹${reg.event.price}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
