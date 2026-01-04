import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Calendar, Users, ListChecks, Clock, PieChart, LayoutDashboard, PlusCircle, FileText, CheckCircle, Download, Bell, Settings } from 'lucide-react';
import { format, subDays } from 'date-fns';

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
    .select('role,full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'organizer') {
    redirect('/');
  }

  return { user, profile };
}

async function getOrganizerOverviewMetrics(organizerId: string) {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,status,event_date,capacity')
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('event_date', { ascending: true });

  const eventIds = (events ?? []).map((e: any) => e.id as string);

  const [{ data: registrations }, { count: upcomingCount }] = await Promise.all([
    eventIds.length > 0
      ? supabase.from('registrations').select('event_id,status,created_at').in('event_id', eventIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .eq('status', 'approved')
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

  // Get registration activity for the last 7 days
  const sevenDaysAgo = subDays(new Date(), 7);
  const registrationActivity = (registrations ?? [])
    .filter((r: any) => new Date(r.created_at) >= sevenDaysAgo)
    .reduce((acc: Record<string, number>, r: any) => {
      const date = format(new Date(r.created_at), 'MMM d');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

  // Fill missing days with 0
  const activityData = [];
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM d');
    activityData.push({
      date,
      count: registrationActivity[date] || 0
    });
  }

  return {
    totalEvents,
    draftEvents,
    pendingEvents,
    approvedEvents,
    cancelledEvents,
    totalRegistrations,
    upcomingEvents: upcomingCount ?? 0,
    capacityUtilization,
    activityData
  };
}

// Simple SVG Chart Component
function RegistrationChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + chartHeight * ratio}
            x2={width - padding}
            y2={padding + chartHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Area fill */}
        <polygon
          points={`${padding},${padding + chartHeight} ${points} ${width - padding},${padding + chartHeight}`}
          fill="url(#gradient)"
          opacity="0.3"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#3b82f6"
              className="hover:r-6 transition-all"
            />
          );
        })}
        
        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {d.date}
            </text>
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio) => {
          const value = Math.round(maxCount * ratio);
          return (
            <text
              key={ratio}
              x={padding - 10}
              y={padding + chartHeight * (1 - ratio) + 5}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {value}
            </text>
          );
        })}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default async function OrganizerDashboardPage() {
  const { user, profile } = await requireOrganizer();
  const metrics = await getOrganizerOverviewMetrics(user.id);

  const currentDate = new Date();
  const formattedDateTime = `${currentDate.getFullYear()}, ${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')} ${currentDate.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-bold text-gray-900">UnivEvents</span>
          </div>

          {/* Panel Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Organizer Panel</h2>
            <p className="text-sm text-gray-500">University Event Management</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>My Events</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Event</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Registrations</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Attendance</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Exports</span>
            </a>
          </nav>
        </div>

        {/* Purple gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-100 to-transparent pointer-events-none"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-6">
              {/* Date/Time */}
              <span className="text-sm text-gray-600">{formattedDateTime}</span>
              
              {/* Icons */}
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {profile?.full_name?.charAt(0) || 'O'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {profile?.full_name || 'Orlando Laurentius'}
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Organizer Overview</h1>
            <p className="mt-2 text-sm text-gray-600">Your events and registration activity at a glance</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            {/* Total Events Created */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
                  <p className="mt-1 text-xs text-gray-600">Total events created</p>
                </div>
              </div>
            </div>

            {/* Event Status Counts */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <ListChecks className="w-6 h-6 text-green-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
                  <p className="mt-1 text-xs text-gray-600">Event status counts</p>
                  <p className="mt-2 text-[10px] text-gray-500">
                    {metrics.draftEvents} draft • {metrics.pendingEvents} pending • {metrics.approvedEvents} approved • {metrics.cancelledEvents} cancelled
                  </p>
                </div>
              </div>
            </div>

            {/* Total Registrations */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <Users className="w-6 h-6 text-purple-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalRegistrations}</p>
                  <p className="mt-1 text-xs text-gray-600">Total registrations (your events)</p>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <Clock className="w-6 h-6 text-orange-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{metrics.upcomingEvents}</p>
                  <p className="mt-1 text-xs text-gray-600">Upcoming events</p>
                </div>
              </div>
            </div>

            {/* Capacity Usage */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <PieChart className="w-6 h-6 text-pink-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{metrics.capacityUtilization}%</p>
                  <p className="mt-1 text-xs text-gray-600">Capacity usage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Registration Activity Chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Registration Activity</h2>
            {metrics.activityData.some(d => d.count > 0) ? (
              <RegistrationChart data={metrics.activityData} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">No registration activity in the last 7 days</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
