import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Calendar, Users, ListChecks, Clock, PieChart } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

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

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  helper, 
  bgGradient 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  helper?: string; 
  bgGradient?: string;
}) {
  const gradients = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    orange: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    pink: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  };
  
  const iconColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    pink: 'text-pink-400',
  };
  
  const selectedGradient = bgGradient ? gradients[bgGradient as keyof typeof gradients] : gradients.blue;
  const selectedIconColor = bgGradient ? iconColors[bgGradient as keyof typeof iconColors] : iconColors.blue;
  
  return (
    <div className={`rounded-xl border ${selectedGradient} bg-slate-900/40 p-6 backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <Icon className={`h-6 w-6 ${selectedIconColor}`} />
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-300">{label}</p>
          {helper && <p className="mt-2 text-[10px] text-slate-400">{helper}</p>}
        </div>
      </div>
    </div>
  );
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
            stroke="#475569"
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
          stroke="#06b6d4"
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
              fill="#06b6d4"
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
              className="text-xs fill-slate-400"
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
              className="text-xs fill-slate-400"
            >
              {value}
            </text>
          );
        })}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default async function OrganizerDashboardPage() {
  const { user } = await requireOrganizer();
  const metrics = await getOrganizerOverviewMetrics(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Organizer Overview</h1>
        <p className="mt-2 text-sm text-slate-400">Your events and registration activity at a glance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={Calendar}
          label="Total events created"
          value={metrics.totalEvents}
          bgGradient="blue"
        />
        <MetricCard
          icon={ListChecks}
          label="Event status counts"
          value={metrics.totalEvents}
          helper={`${metrics.draftEvents} draft • ${metrics.pendingEvents} pending • ${metrics.approvedEvents} approved • ${metrics.cancelledEvents} cancelled`}
          bgGradient="purple"
        />
        <MetricCard
          icon={Users}
          label="Total registrations (your events)"
          value={metrics.totalRegistrations}
          bgGradient="green"
        />
        <MetricCard
          icon={Clock}
          label="Upcoming events"
          value={metrics.upcomingEvents}
          bgGradient="orange"
        />
        <MetricCard
          icon={PieChart}
          label="Capacity usage"
          value={`${metrics.capacityUtilization}%`}
          bgGradient="pink"
        />
      </div>
      
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold tracking-tight text-white mb-6">Event Registration Activity</h2>
        {metrics.activityData.some(d => d.count > 0) ? (
          <RegistrationChart data={metrics.activityData} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No registration activity in the last 7 days</p>
          </div>
        )}
      </div>
    </div>
  );
}
