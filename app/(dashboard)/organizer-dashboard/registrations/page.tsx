import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
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
  console.log('DEBUG: Organizer registrations query', { organizerId: params.organizerId, eventId: params.eventId, status: params.status, search: params.search, returned: (data ?? []).length });

  const registrations = data ?? [];

  // If some profiles are missing emails, try to fetch them from the auth.users table (service role)
  try {
    const admin = getSupabaseAdminClient();
    const missingUserIds = Array.from(new Set(registrations.filter((r: any) => !r.user?.email && r.user?.id).map((r: any) => r.user.id)));
    if (missingUserIds.length > 0) {
      const { data: authUsers } = await admin.from('auth.users').select('id,email').in('id', missingUserIds as string[]);
      const emailMap = new Map<string, string>();
      for (const u of authUsers ?? []) {
        if (u?.id && u?.email) emailMap.set(u.id, u.email);
      }

      for (const reg of registrations) {
        const user = reg.user as any;
        if (!user?.email && user?.id) {
          const fallback = emailMap.get(user.id as string);
          if (fallback) user.email = fallback;
        }
      }
    }
  } catch (e) {
    // ignore; this is a best-effort fallback
  }

  return {
    registrations,
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
      <form method="get" className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Registrations</h1>
            <p className="mt-1 text-sm text-gray-600">View registrations for your events (read-only).</p>

            <div className="mt-4 max-w-lg">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-purple-600 text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                </span>

                <input
                  type="text"
                  name="search"
                  defaultValue={search ?? ''}
                  placeholder="Search by name, email, or entry code"
                  className="w-full pl-14 pr-4 py-3 rounded-full border border-transparent bg-white text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className="flex gap-3 items-center">
              <div>
                <label className="sr-only">Event</label>
                <select
                  name="event"
                  defaultValue={eventId ?? 'all'}
                  className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
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
                <label className="sr-only">Status</label>
                <select
                  name="status"
                  defaultValue={status ?? 'all'}
                  className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <button type="submit" className="ml-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700">
              Apply Filters
            </button>
          </div>
        </div>
      </form> 



      {registrations.length === 0 ? (
        <p className="text-sm text-gray-600">No registrations found.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {registrations.map((reg: any) => (
            <div key={reg.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">{reg.event?.title ?? 'Event'}</h2>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-purple-100 text-purple-700">
                    {reg.status}
                  </span>
                  {reg.event?.is_paid && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-100 bg-amber-900/60">
                      Paid
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  {reg.user?.full_name ?? 'User'} · {reg.user?.email ?? 'No email'} · Entry code: {reg.entry_code ?? 'N/A'}
                </p>
                <p className="text-[11px] text-gray-600">
                  Registered on {new Date(reg.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
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
