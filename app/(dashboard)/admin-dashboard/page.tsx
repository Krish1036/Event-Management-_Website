import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Users, Calendar, CheckCircle, IndianRupee, UserCheck, TrendingUp } from 'lucide-react';
import { getISTStartOfDayUTCISOString } from '@/lib/date';

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

  return { user, profile };
}

async function getAdminOverviewMetrics() {
  const supabase = getSupabaseServerClient();

  const [{ data: usersCount }, { data: events }, { count: registrationsCount }, { count: attendanceTodayCount }] =
    await Promise.all([
      supabase.rpc('get_total_users_count'),
      supabase
        .from('events')
        .select('id,status,event_date,capacity,is_paid')
        .order('event_date', { ascending: true }),
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', getISTStartOfDayUTCISOString())
    ]);

  const totalEvents = (events ?? []).length;
  const draftEvents = (events ?? []).filter((e) => e.status === 'draft').length;
  const approvedEvents = (events ?? []).filter((e) => e.status === 'approved').length;
  const cancelledEvents = (events ?? []).filter((e) => e.status === 'cancelled').length;

  const now = new Date();
  const upcomingEvents = (events ?? []).filter((e) => new Date(e.event_date as string) >= now).length;

  const totalCapacity = (events ?? []).reduce((sum, e) => sum + (e.capacity ?? 0), 0);

  // Capacity utilization placeholder (without heavy joins)
  const capacityUtilization = totalCapacity > 0 ? Math.min(100, Math.round(((registrationsCount ?? 0) / totalCapacity) * 100)) : 0;

  // Paid vs free events count
  const paidEvents = (events ?? []).filter((e) => e.is_paid === true).length;
  const freeEvents = (events ?? []).filter((e) => e.is_paid !== true).length;

  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

  return {
    usersCount: usersCount ?? 0,
    totalEvents,
    draftEvents,
    approvedEvents,
    cancelledEvents,
    upcomingEvents,
    registrationsCount: registrationsCount ?? 0,
    attendanceTodayCount: attendanceTodayCount ?? 0,
    capacityUtilization,
    paidEvents,
    freeEvents,
    paymentsEnabled
  };
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const metrics = await getAdminOverviewMetrics();

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Users Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL USERS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.usersCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Events Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">EVENTS (DRAFT / APPROVED / CANCELLED)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="mt-1 text-sm text-gray-500">{metrics.draftEvents} draft - {metrics.approvedEvents} approved - {metrics.cancelledEvents} cancelled</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Events Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">UPCOMING EVENTS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.upcomingEvents}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Total Registrations Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL REGISTRATIONS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.registrationsCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Today's Attendance Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TODAY'S ATTENDANCE</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.attendanceTodayCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Capacity Utilization Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">CAPACITY UTILIZATION</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.capacityUtilization}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Paid vs Free Events Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">PAID VS FREE EVENTS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.paidEvents}/{metrics.freeEvents}</p>
              <p className="mt-1 text-sm text-gray-500">{metrics.paidEvents} paid - {metrics.freeEvents} free</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment System Status Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Payment system status</p>
            <p className="mt-2 text-sm text-gray-600">
              {metrics.paymentsEnabled
                ? 'LIVE MODE – real payments are being processed.'
                : 'TEST MODE – payments are disabled or running in sandbox mode.'}
            </p>
          </div>
          <button className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
            metrics.paymentsEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}>
            {metrics.paymentsEnabled ? 'LIVE MODE' : 'TEST MODE'}
          </button>
        </div>
      </div>
    </div>
  );
}

