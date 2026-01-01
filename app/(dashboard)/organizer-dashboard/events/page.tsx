import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

async function getOrganizerEventsWithUsage(organizerId: string) {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,title,location,event_date,start_time,end_time,capacity,is_registration_open,status,created_by,assigned_organizer')
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('event_date', { ascending: true });

  const eventIds = (events ?? []).map((e: any) => e.id as string);

  const { data: registrations } =
    eventIds.length > 0
      ? await supabase.from('registrations').select('event_id,status').in('event_id', eventIds)
      : { data: [] as any[] };

  const usageMap = new Map<string, { pending: number; confirmed: number }>();
  for (const r of registrations ?? []) {
    const key = r.event_id as string;
    const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
    if (r.status === 'PENDING') entry.pending += 1;
    if (r.status === 'CONFIRMED') entry.confirmed += 1;
    usageMap.set(key, entry);
  }

  return (events ?? []).map((e: any) => {
    const usage = usageMap.get(e.id as string) ?? { pending: 0, confirmed: 0 };
    const total = usage.pending + usage.confirmed;
    const capacity = Number(e.capacity ?? 0) || 0;
    const utilization = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;
    const seatsLeft = Math.max(0, capacity - total);

    return {
      ...e,
      pendingCount: usage.pending,
      confirmedCount: usage.confirmed,
      utilization,
      seatsLeft
    };
  });
}

export default async function OrganizerEventsPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { user } = await requireOrganizer();
  const events = await getOrganizerEventsWithUsage(user.id);

  const highlightEventId =
    typeof searchParams?.new_event === 'string'
      ? searchParams?.new_event
      : typeof searchParams?.updated_event === 'string'
        ? searchParams?.updated_event
        : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">My Events</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your events, registrations, attendance, and exports.</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-400">No events found.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {events.map((event: any) => (
            <details
              key={event.id}
              className={`rounded-xl border bg-slate-900/60 p-4 ${
                highlightEventId === event.id ? 'border-sky-500' : 'border-slate-800'
              }`}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{event.title}</h2>
                    <p className="text-xs text-slate-300">
                      {event.location || 'No location'} · {new Date(event.event_date).toLocaleDateString()} ·{' '}
                      {event.start_time} - {event.end_time}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px]">
                    <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-200">
                      {event.status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ${
                        event.is_registration_open
                          ? 'bg-emerald-800/50 text-emerald-200'
                          : 'bg-red-800/40 text-red-200'
                      }`}
                    >
                      {event.is_registration_open ? 'Registrations Open' : 'Registrations Closed'}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-3 text-xs">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-slate-400">Capacity / Seats Left</p>
                    <p className="font-medium text-slate-100">
                      {event.capacity ?? 0} / {event.seatsLeft}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Registrations</p>
                    <p className="font-medium text-slate-100">
                      {event.confirmedCount} confirmed, {event.pendingCount} pending
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Utilization</p>
                    <p className="font-medium text-slate-100">{event.utilization}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/organizer-dashboard/events/${event.id}/edit`}
                    className="rounded-md bg-blue-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-600 inline-block"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/organizer-dashboard/registrations?event=${encodeURIComponent(event.id)}`}
                    className="rounded-md bg-slate-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-600 inline-block"
                  >
                    View Registrations
                  </Link>
                  <Link
                    href={`/organizer-dashboard/attendance?event=${encodeURIComponent(event.id)}`}
                    className="rounded-md bg-emerald-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 inline-block"
                  >
                    View Attendance
                  </Link>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
