import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PublicNavbar from '../(public)/PublicNavbar';
import '../(public)/EventsDashboard.css';

export const revalidate = 0;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getParticipantDashboard() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, registrations: [] };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,role')
    .eq('id', user.id)
    .single();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id,status,entry_code,event_id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: events } = await supabase
    .from('events')
    .select('id,title,event_date,is_paid,price')
    .in(
      'id',
      (registrations ?? []).map((r) => r.event_id)
    );

  const eventsById = new Map<string, any>();
  for (const ev of events ?? []) {
    eventsById.set(ev.id, ev);
  }

  const enriched = (registrations ?? []).map((r) => ({
    ...r,
    event: eventsById.get(r.event_id)
  }));

  return { user, profile, registrations: enriched };
}

export default async function DashboardPage() {
  const { user, profile, registrations } = await getParticipantDashboard();

  if (!user) {
    redirect('/login');
  }

  if (profile?.role === 'organizer' || profile?.role === 'admin') {
    // Organizer/admin dashboards will be implemented separately.
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50">
      <PublicNavbar />
      
      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">My registrations</h1>
            <p className="text-sm text-gray-600">View and access your event tickets.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {registrations.length === 0 && (
            <p className="text-gray-500">You have not registered for any events yet.</p>
          )}
          {registrations.map((r: any) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between shadow-lg"
            >
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{r.event?.title ?? 'Event'}</h2>
                <p className="text-xs text-gray-600">
                  {r.event?.event_date
                    ? new Date(r.event.event_date as string).toLocaleDateString()
                    : 'Date TBA'}{' '}
                  {r.event?.is_paid ? `• Paid • ₹${r.event.price}` : '• Free'}
                  {!PAYMENTS_ENABLED && r.event?.is_paid && ' · payments disabled (test mode)'}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Registered on {new Date(r.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}</p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                    r.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-800'
                      : r.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {r.status}
                </span>
                <Link
                  href={`/tickets/${r.id}`}
                  className="inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400 bg-white"
                >
                  View ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
