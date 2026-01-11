import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicNavbar from '../../(public)/PublicNavbar';
import '../../(public)/EventsDashboard.css';

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

async function leaveEventAction(formData: FormData) {
  'use server';

  const registrationId = formData.get('registrationId') as string | null;
  if (!registrationId) {
    redirect('/dashboard');
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: registration } = await supabase
    .from('registrations')
    .select('id,user_id,status')
    .eq('id', registrationId)
    .single();

  if (!registration || registration.user_id !== user.id || registration.status === 'CANCELLED') {
    redirect('/dashboard');
  }

  await supabase
    .from('registrations')
    .update({ status: 'CANCELLED' })
    .eq('id', registrationId)
    .eq('user_id', user.id);

  redirect('/dashboard');
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
    <div className="dashboard-container">
      <PublicNavbar />
      
      {/* Main Content */}
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="breadcrumb">Dashboard / My Registrations</div>
          <h1 className="page-title">My Registrations</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="light" className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{registrations.length}</div>
            </CardContent>
          </Card>
          
          <Card variant="light" className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {registrations.filter(r => r.status === 'CONFIRMED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card variant="light" className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {registrations.filter(r => r.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registrations List */}
        <Card variant="light" className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Your Event Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">You have not registered for any events yet.</div>
                <Link href="/events">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Browse Events
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((r: any) => (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {r.event?.title ?? 'Event'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                            📅 {r.event?.event_date
                              ? new Date(r.event.event_date as string).toLocaleDateString()
                              : 'Date TBA'}
                            </div>
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                            {r.event?.is_paid ? `💰 Paid • ₹${r.event.price}` : '🆓 Free'}
                            {!PAYMENTS_ENABLED && r.event?.is_paid && ' · payments disabled (test mode)'}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          Registered on {new Date(r.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className={r.status === 'CONFIRMED' 
                          ? "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800"
                          : r.status === 'PENDING'
                          ? "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800"
                          : "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800"
                        }>
                          {r.status}
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/tickets/${r.id}`}>
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                              View QR Code
                            </Button>
                          </Link>
                          
                          {r.status !== 'CANCELLED' && (
                            <form action={leaveEventAction}>
                              <input type="hidden" name="registrationId" value={r.id} />
                              <Button
                                type="submit"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                Leave Event
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
