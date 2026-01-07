import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

const QRModalButton = dynamic(() => import('@/components/QRModalButton'), { ssr: false });
const AdminBackfillEmailsButton = dynamic(() => import('@/components/AdminBackfillEmailsButton'), { ssr: false });

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

async function getAttendanceData(eventFilter: string | null) {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,title,event_date')
    .order('title', { ascending: true });

  const filteredEventIds =
    eventFilter && eventFilter !== 'all' ? [eventFilter] : (events ?? []).map((e: any) => e.id as string);

  const { data: attendance } = await supabase
    .from('attendance')
    .select('id,checked_in_at,registration_id')
    .order('checked_in_at', { ascending: false });

  const { data: allRegistrations } = await supabase
    .from('registrations')
    .select(
      `id,status,entry_code,event_id,user_id,
         event:events(id,title,event_date),
         user:profiles(id,full_name,email)`
    )
    .eq('status', 'CONFIRMED')
    .in('event_id', filteredEventIds)
    .order('created_at', { ascending: false });

  // best-effort: fill missing emails from auth.users using service-role admin client
  try {
    const admin = getSupabaseAdminClient();
    const missingUserIds = Array.from(new Set((allRegistrations ?? []).filter((r: any) => !r.user?.email && r.user?.id).map((r: any) => r.user.id)));
    if (missingUserIds.length > 0) {
      const { data: authUsers } = await admin.from('auth.users').select('id,email').in('id', missingUserIds as string[]);
      const emailMap = new Map<string, string>();
      for (const u of authUsers ?? []) {
        if (u?.id && u?.email) emailMap.set(u.id, u.email);
      }

      for (const r of (allRegistrations ?? [])) {
        const user = r.user as any;
        if (!user?.email && user?.id) {
          const fallback = emailMap.get(user.id as string);
          if (fallback) user.email = fallback;
        }
      }
    }
  } catch (e) {
    // ignore best-effort fallback
  }

  const attendanceMap = new Map<string, { id: string; checked_in_at: string }>();
  for (const a of attendance ?? []) {
    attendanceMap.set(a.registration_id as string, {
      id: a.id as string,
      checked_in_at: a.checked_in_at as string
    });
  }

  const attendanceList = (allRegistrations ?? [])
    .filter((r: any) => attendanceMap.has(r.id as string))
    .map((r: any) => {
      const att = attendanceMap.get(r.id as string)!;
      return {
        id: att.id,
        checkedInAt: att.checked_in_at,
        registrationId: r.id,
        event: r.event,
        user: r.user,
        entryCode: r.entry_code,
        registrationStatus: r.status
      };
    });

  const notCheckedIn = (allRegistrations ?? [])
    .filter((r) => !attendanceMap.has(r.id as string))
    .map((r: any) => ({
      registrationId: r.id,
      event: r.event,
      user: r.user,
      entryCode: r.entry_code,
      registrationStatus: r.status
    }));

  // Calculate attendance statistics per event
  const eventStats = new Map<string, { total: number; present: number; absent: number }>();

  // Initialize totals per event from all confirmed registrations
  for (const reg of allRegistrations ?? []) {
    const eventId = reg.event_id as string;
    const stats = eventStats.get(eventId) || { total: 0, present: 0, absent: 0 };
    stats.total += 1;
    eventStats.set(eventId, stats);
  }

  // Add present counts based on attendanceMap
  for (const reg of allRegistrations ?? []) {
    const eventId = reg.event_id as string;
    if (!attendanceMap.has(reg.id as string)) continue;
    const stats = eventStats.get(eventId) || { total: 0, present: 0, absent: 0 };
    stats.present += 1;
    eventStats.set(eventId, stats);
  }

  // Calculate absent
  for (const [eventId, stats] of eventStats.entries()) {
    stats.absent = stats.total - stats.present;
  }

  return { attendanceList, notCheckedIn, eventStats };
}

async function handleAttendanceAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const registrationId = formData.get('registrationId') as string | null;
  const entryCode = formData.get('entryCode') as string | null;

  if (!action) {
    redirect('/admin-dashboard/attendance');
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

  let registration = null;

  // Find registration by different methods
  if (action === 'checkin_by_code' && entryCode) {
    const { data: regData } = await supabase
      .from('registrations')
      .select('id,status,entry_code,event_id,user_id')
      .eq('entry_code', entryCode)
      .eq('status', 'CONFIRMED')
      .single();
    registration = regData;
  } else if (action === 'checkin' && registrationId) {
    const { data: regData } = await supabase
      .from('registrations')
      .select('id,status,entry_code,event_id,user_id')
      .eq('id', registrationId)
      .eq('status', 'CONFIRMED')
      .single();
    registration = regData;
  } else if (action === 'undo' && registrationId) {
    const { data: regData } = await supabase
      .from('registrations')
      .select('id,status,entry_code,event_id,user_id')
      .eq('id', registrationId)
      .single();
    registration = regData;
  }

  if (!registration) {
    redirect('/admin-dashboard/attendance');
  }

  const finalRegistrationId = registration.id;

  if (action === 'checkin' || action === 'checkin_by_code') {
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('registration_id', finalRegistrationId)
      .single();

    if (!existing) {
      await supabase
        .from('attendance')
        .insert({ registration_id: finalRegistrationId });

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'ATTENDANCE_CHECKIN',
        details: {
          registration_id: finalRegistrationId,
          event_id: registration.event_id,
          user_id: registration.user_id,
          entry_code: registration.entry_code,
          method: action.replace('checkin_', '')
        }
      });
    }
  } else if (action === 'undo') {
    await supabase
      .from('attendance')
      .delete()
      .eq('registration_id', finalRegistrationId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'ATTENDANCE_UNDO',
      details: {
        registration_id: finalRegistrationId,
        event_id: registration.event_id,
        user_id: registration.user_id,
        entry_code: registration.entry_code
      }
    });
  }

  redirect('/admin-dashboard/attendance');
}

export default async function AdminAttendancePage({
  searchParams
}: {
  searchParams?: { event?: string };
}) {
  await requireAdmin();
  const eventFilter = searchParams?.event ?? null;
  const { attendanceList, notCheckedIn, eventStats } = await getAttendanceData(eventFilter);
  
  const { data: events } = await getSupabaseServerClient()
    .from('events')
    .select('id,title,event_date')
    .order('title', { ascending: true });
    
  const selectedEventName = (events?.find((e: any) => e.id === eventFilter)?.title) ?? (events?.[0]?.title ?? null);
  const selectedEventId = eventFilter ?? (events?.[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Attendance</h1>
        <p className="mt-1 text-sm text-gray-600">Mark attendance for your events. Undo is not allowed.</p>
      </div>

      <form className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <label className="sr-only">Event</label>
            <select
              name="event"
              defaultValue={eventFilter ?? 'all'}
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700"
            >
              <option value="all">All Events</option>
              {events?.map((event: any) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                  {event.event_date ? ` • ${new Date(event.event_date as string).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 md:mt-0 flex items-center gap-3">
            <button type="submit" className="ml-2 rounded-full bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700">
              Apply
            </button>
            <div className="ml-2">
              {/* QR Scanner button removed from header - replaced in Manual Check-in below */}
            </div>
          </div>
        </div>
      </form>

      {/* Attendance Statistics */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Event Attendance Statistics</h2>
        {selectedEventName && (
          <div className="mb-3">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              <svg className="h-3 w-3 mr-2 text-purple-600" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
              {selectedEventName}
            </span>
          </div>
        )}
        {Array.from(eventStats.entries()).length === 0 ? (
          <p className="text-sm text-gray-600">No confirmed registrations.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from(eventStats.entries()).map(([eventId, stats]) => {
              const attendance = attendanceList.find((a: any) => a.event?.id === eventId);
              const eventName = attendance?.event?.title || `Event ${eventId}`;
              const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

              return (
                <div key={eventId} className="rounded-lg border border-gray-200 bg-white p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{eventName}</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Registered:</span>
                      <span className="text-gray-700 font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Present:</span>
                      <span className="text-emerald-600 font-medium">{stats.present}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Absent:</span>
                      <span className="text-red-600 font-medium">{stats.absent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attendance Rate:</span>
                      <span className="text-sky-600 font-medium">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Check-in Methods */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Manual Check-in</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* QR Scanner */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code</h3>
            <form action={handleAttendanceAction} className="flex gap-3">
              <input
                type="text"
                name="entryCode"
                placeholder="Scan or paste QR code"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <QRModalButton eventId={selectedEventId} buttonLabel="Check In (QR)" className="rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700" />
            </form>
          </div>

          {/* Entry Code */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Entry Code</h3>
            <form action={handleAttendanceAction} className="flex gap-3">
              <input
                type="text"
                name="entryCode"
                placeholder="Entry Code"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="submit"
                name="action"
                value="checkin_by_code"
                className="rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Check In
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Checked In</h2>
          {attendanceList.length === 0 ? (
            <p className="text-sm text-gray-600">No one checked in yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {attendanceList.map((a: any) => (
                <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{a.event?.title ?? 'Event'}</p>
                    <p className="text-xs text-gray-600">
                      {a.user?.full_name ?? 'User'} · {a.user?.email ?? 'No email'} · {a.entryCode ?? 'N/A'}
                    </p>
                    <p className="text-[11px] text-gray-600">Checked in at {new Date(a.checkedInAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Not Checked In</h2>
          {notCheckedIn.length === 0 ? (
            <p className="text-sm text-gray-600">All confirmed registrations are checked in.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {notCheckedIn.map((r: any) => (
                <div key={r.registrationId} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{r.event?.title ?? 'Event'}</p>
                      <p className="text-xs text-gray-600">
                        {r.user?.full_name ?? 'User'} · {r.user?.email ?? 'No email'} · {r.entryCode ?? 'N/A'}
                      </p>
                      <p className="text-[11px] text-gray-600">Confirmed registration</p>
                    </div>
                    <form action={handleAttendanceAction} className="mt-3 md:mt-0 md:ml-4 w-full md:w-auto">
                      <input type="hidden" name="registrationId" value={r.registrationId} />
                      <button
                        type="submit"
                        name="action"
                        value="checkin"
                        className="w-full rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        Check In
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
