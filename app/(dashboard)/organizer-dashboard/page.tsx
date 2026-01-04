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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'organizer') {
    redirect('/');
  }

  return { user };
}

function OverviewCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-1 text-[11px] text-slate-400">{helper}</p> : null}
    </div>
  );
}

async function getOrganizerOverviewMetrics(organizerId: string) {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,status,event_date,capacity')
    .eq('created_by', organizerId)
    .order('event_date', { ascending: true });

  const eventIds = (events ?? []).map((e: any) => e.id as string);

  const [{ data: registrations }, { count: upcomingCount }] = await Promise.all([
    eventIds.length > 0
      ? supabase.from('registrations').select('event_id,status').in('event_id', eventIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', organizerId)
      .gte('event_date', new Date().toISOString().split('T')[0])
  ]);

  const totalEvents = (events ?? []).length;
  const draftEvents = (events ?? []).filter((e: any) => e.status === 'draft').length;
  const pendingEvents = (events ?? []).filter((e: any) => e.status === 'pending' || e.status === 'pending_approval').length;
  const approvedEvents = (events ?? []).filter((e: any) => e.status === 'approved').length;
  const cancelledEvents = (events ?? []).filter((e: any) => e.status === 'cancelled').length;

  const totalRegistrations = (registrations ?? []).length;

  const totalCapacity = (events ?? []).reduce((sum: number, e: any) => sum + (Number(e.capacity ?? 0) || 0), 0);
  const capacityUtilization =
    totalCapacity > 0 ? Math.min(100, Math.round((totalRegistrations / totalCapacity) * 100)) : 0;

  return {
    totalEvents,
    draftEvents,
    pendingEvents,
    approvedEvents,
    cancelledEvents,
    totalRegistrations,
    upcomingEvents: upcomingCount ?? 0,
    capacityUtilization
  };
}

export default async function OrganizerDashboardPage() {
  const { user } = await requireOrganizer();
  const metrics = await getOrganizerOverviewMetrics(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Organizer Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Your events and registration activity at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard label="Total events created" value={metrics.totalEvents} />
        <OverviewCard
          label="Event status counts"
          value={`${metrics.totalEvents}`}
          helper={`${metrics.draftEvents} draft • ${metrics.pendingEvents} pending • ${metrics.approvedEvents} approved • ${metrics.cancelledEvents} cancelled`}
        />
        <OverviewCard label="Total registrations (your events)" value={metrics.totalRegistrations} />
        <OverviewCard label="Upcoming events" value={metrics.upcomingEvents} />
        <OverviewCard label="Capacity usage" value={`${metrics.capacityUtilization}%`} />
      </div>
    </div>
  );
}
