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
    .select('id,title,event_date')
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`)
    .order('title', { ascending: true });

  return data ?? [];
}

export default async function OrganizerExportsPage() {
  const { user } = await requireOrganizer();
  const events = await getOrganizerEvents(user.id);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Exports</h1>
        <p className="mt-1 text-sm text-gray-600">Export data for your events (CSV). Payment details are read-only.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <form action="/api/organizer/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="registrations" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Registrations</h2>
            <p className="text-xs text-gray-600">Export registrations for your events, including payment fields.</p>
            <div>
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                Export CSV
              </button>
            </div>
          </div>
        </form>

        <form action="/api/organizer/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="attendance" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Attendance</h2>
            <p className="text-xs text-gray-600">Export attendance records with timestamps.</p>
            <div>
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                Export CSV
              </button>
            </div>
          </div>
        </form>

        <form action="/api/organizer/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="payments" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Payments (Read-only)</h2>
            <p className="text-xs text-gray-600">Export payment details for registrations in your events.</p>
            <div>
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                Export CSV
              </button>
            </div>
          </div>
        </form>

        <form action="/api/organizer/exports" method="post" className="col-span-full rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="event_detailed" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Event Detailed Export</h2>
              <p className="text-xs text-gray-600">Export a single event with registrations, custom responses, and payment fields.</p>
            </div>

            <div className="flex gap-3 items-center w-full md:w-auto">
              <select
                name="eventId"
                className="flex-1 md:flex-none rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700"
                defaultValue={events[0]?.id ?? ''}
              >
                <option value="" disabled>
                  Select event
                </option>
                {events.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                    {event.event_date ? ` • ${new Date(event.event_date as string).toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>

              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                Export Event CSV
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p className="font-semibold text-gray-900 mb-3">Export Information:</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-600" />
            <span>Exports are scoped to your events only.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-600" />
            <span>All exports are CSV, compatible with Excel.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-600" />
            <span>Payment fields are read-only.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-600" />
            <span>Event detailed export includes registrations, custom responses, and payment fields.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
