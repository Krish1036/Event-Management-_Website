import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const revalidate = 0;

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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user };
}

async function getEventsWithUsage() {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,status,created_by')
    .order('event_date', { ascending: true });

  const { data: registrations } = await supabase
    .from('registrations')
    .select('event_id,status');

  const usageMap = new Map<string, { pending: number; confirmed: number }>();
  for (const r of registrations ?? []) {
    const key = r.event_id as string;
    const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
    if (r.status === 'PENDING') entry.pending += 1;
    if (r.status === 'CONFIRMED') entry.confirmed += 1;
    usageMap.set(key, entry);
  }

  const { data: organizers } = await supabase
    .from('profiles')
    .select('id,full_name');

  const orgMap = new Map<string, string>();
  for (const o of organizers ?? []) {
    orgMap.set(o.id as string, (o.full_name as string) ?? 'Organizer');
  }

  return (events ?? []).map((e) => {
    const usage = usageMap.get(e.id as string) ?? { pending: 0, confirmed: 0 };
    const total = usage.pending + usage.confirmed;
    const capacity = e.capacity ?? 0;
    const utilization = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;
    const seatsLeft = Math.max(0, capacity - total);

    return {
      ...e,
      organizerName: orgMap.get(e.created_by as string) ?? 'Unknown',
      pendingCount: usage.pending,
      confirmedCount: usage.confirmed,
      utilization,
      seatsLeft
    };
  });
}

async function handleEventAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const eventId = formData.get('eventId') as string | null;

  if (!action || !eventId) {
    redirect('/admin-dashboard/events');
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  const { data: event } = await supabase
    .from('events')
    .select('id,status,is_registration_open')
    .eq('id', eventId)
    .single();

  if (!event) {
    redirect('/admin-dashboard/events');
  }

  const updates: Record<string, any> = {};
  let logAction = '';

  if (action === 'approve') {
    updates.status = 'approved';
    logAction = 'EVENT_APPROVE';
  } else if (action === 'cancel') {
    updates.status = 'cancelled';
    updates.is_registration_open = false;
    logAction = 'EVENT_CANCEL';
  } else if (action === 'open_reg') {
    updates.is_registration_open = true;
    logAction = 'EVENT_OPEN_REG';
  } else if (action === 'close_reg') {
    updates.is_registration_open = false;
    logAction = 'EVENT_CLOSE_REG';
  } else if (action === 'emergency_disable') {
    updates.status = 'cancelled';
    updates.is_registration_open = false;
    logAction = 'EVENT_EMERGENCY_DISABLE';
  } else if (action === 'edit_event') {
    const title = formData.get('title') as string | null;
    const event_date = formData.get('event_date') as string | null;
    const start_time = formData.get('start_time') as string | null;
    const end_time = formData.get('end_time') as string | null;
    const location = formData.get('location') as string | null;
    const capacity = formData.get('capacity') as string | null;

    if (title) updates.title = title;
    if (event_date) updates.event_date = event_date;
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (location) updates.location = location;
    if (capacity) updates.capacity = parseInt(capacity, 10);
    
    logAction = 'EVENT_EDIT';
  } else if (action === 'manual_override') {
    const userEmail = formData.get('userEmail') as string | null;
    
    if (!userEmail) {
      redirect('/admin-dashboard/events');
    }

    // Find user by email
    const { data: user } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('email', userEmail)
      .single();

    if (!user) {
      redirect('/admin-dashboard/events');
    }

    // Generate manual entry code
    const entryCode = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create manual registration
    await supabase.from('registrations').insert({
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
      entry_code: entryCode
    });

    // Log manual override immediately
    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'REG_MANUAL_OVERRIDE',
      details: {
        event_id: eventId,
        user_email: userEmail,
        entry_code: entryCode
      }
    });

    logAction = 'REG_MANUAL_OVERRIDE';
  } else if (action === 'force_close_capacity') {
    updates.is_registration_open = false;
    logAction = 'EVENT_FORCE_CLOSE_CAPACITY';
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: logAction,
      details: {
        event_id: eventId,
        previous_status: event.status,
        previous_is_registration_open: event.is_registration_open,
        updates
      }
    });
  }

  redirect('/admin-dashboard/events');
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await requireAdmin();
  const events = await getEventsWithUsage();
  const highlightEventId = typeof searchParams?.new_event === 'string' ? searchParams?.new_event : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Events</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage events, approvals, registrations, and capacity.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-400">No events found.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {events.map((event: any) => {
            const isHighlighted = highlightEventId === event.id;
            return (
            <div
              key={event.id}
              className={`rounded-xl border bg-slate-900/60 p-4 ${
                isHighlighted ? 'border-sky-500 shadow-[0_0_0_1px_rgba(56,189,248,0.6)]' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">{event.title}</h2>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-200 bg-slate-800">
                      {event.status}
                    </span>
                    {isHighlighted && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-50 bg-sky-600/90">
                        New
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-200 bg-slate-800/70">
                      {event.is_registration_open ? 'Registrations Open' : 'Registrations Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {event.location || 'No location'} · Capacity {event.capacity ?? 0} ·
                    Pending {event.pendingCount} · Confirmed {event.confirmedCount}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Organizer: {event.organizerName} · Seats left: {event.seatsLeft}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Utilization: {event.utilization}%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <form action={handleEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <div className="flex flex-wrap gap-2">
                      {event.status !== 'approved' && (
                        <button
                          type="submit"
                          name="action"
                          value="approve"
                          className="rounded-md bg-emerald-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600"
                        >
                          Approve
                        </button>
                      )}
                      {event.status !== 'cancelled' && (
                        <button
                          type="submit"
                          name="action"
                          value="cancel"
                          className="rounded-md bg-red-800 px-3 py-1 text-[11px] font-medium text-red-50 hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      {event.is_registration_open ? (
                        <button
                          type="submit"
                          name="action"
                          value="close_reg"
                          className="rounded-md border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                        >
                          Close registrations
                        </button>
                      ) : (
                        <button
                          type="submit"
                          name="action"
                          value="open_reg"
                          className="rounded-md border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                        >
                          Open registrations
                        </button>
                      )}
                      {event.confirmedCount >= (event.capacity || 0) && event.is_registration_open && (
                        <button
                          type="submit"
                          name="action"
                          value="force_close_capacity"
                          className="rounded-md bg-amber-700 px-3 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-600"
                        >
                          Force close (capacity reached)
                        </button>
                      )}
                      <button
                        type="submit"
                        name="action"
                        value="emergency_disable"
                        className="rounded-md bg-red-950 px-3 py-1 text-[11px] font-medium text-red-200 hover:bg-red-900"
                      >
                        Emergency disable
                      </button>
                    </div>
                  </form>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-300">Edit Event</summary>
                    <form action={handleEventAction} className="mt-2 space-y-2">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="action" value="edit_event" />
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          type="text"
                          name="title"
                          placeholder="Title"
                          defaultValue={event.title}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="text"
                          name="location"
                          placeholder="Location"
                          defaultValue={event.location || ''}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="date"
                          name="event_date"
                          defaultValue={event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : ''}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="number"
                          name="capacity"
                          placeholder="Capacity"
                          defaultValue={event.capacity || ''}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="time"
                          name="start_time"
                          defaultValue={event.start_time || ''}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="time"
                          name="end_time"
                          defaultValue={event.end_time || ''}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-md bg-sky-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600"
                      >
                        Save Changes
                      </button>
                    </form>
                  </details>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-300">Manual Override</summary>
                    <form action={handleEventAction} className="mt-2 space-y-2">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="action" value="manual_override" />
                      <div className="space-y-2">
                        <input
                          type="text"
                          name="userEmail"
                          placeholder="User email"
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-amber-700 px-3 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-600"
                        >
                          Add User (Capacity Override)
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
