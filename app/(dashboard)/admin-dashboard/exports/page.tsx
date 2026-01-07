import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Users, Calendar, DollarSign, FileText, Settings, Database } from 'lucide-react';

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

async function getApprovedEvents() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('events')
    .select('id,title,event_date')
    .eq('status', 'approved')
    .order('title', { ascending: true });

  return data ?? [];
}
export default async function AdminExportsPage() {
  await requireAdmin();
  const events = await getApprovedEvents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Export data as CSV files compatible with Excel. All exports are logged.
          </p>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Registrations Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="registrations" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Registrations</h3>
                  <p className="text-sm text-gray-600">
                    Export all registrations with user and event details.
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Attendance Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="attendance" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Attendance</h3>
                  <p className="text-sm text-gray-600">
                    Export all attendance records with check-in times.
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Manual Registrations Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="manual_registrations" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manual Registrations</h3>
                  <p className="text-sm text-gray-600">
                    Export only manually created registrations.
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-600 text-white hover:bg-amber-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payments Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="payments" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
                  <p className="text-sm text-gray-600">
                    Export all payment records with Razorpay details.
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 text-white hover:bg-purple-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="users" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Database className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                  <p className="text-sm text-gray-600">
                    Export all user profiles with roles.
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Event Detailed Export */}
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form action="/api/admin/exports" method="post" className="space-y-4">
              <input type="hidden" name="exportType" value="event_detailed" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Event Detailed Export</h3>
                  <p className="text-sm text-gray-600">
                    Export a single event with all registrations and custom field responses.
                  </p>
                </div>
              </div>
              <Select name="eventId" defaultValue={events[0]?.id ?? ''}>
                <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="Select event" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Events</SelectItem>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                      {event.title}
                      {event.event_date
                        ? ` • ${new Date(event.event_date as string).toLocaleDateString()}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                className="w-full bg-red-600 text-white hover:bg-red-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Event CSV
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Info section */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Export Information:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>All exports are in CSV format, compatible with Microsoft Excel</li>
                <li>Files include proper headers and formatted data</li>
                <li>Special characters are properly escaped for Excel compatibility</li>
                <li>Exports are logged in audit logs for compliance</li>
                <li>Filenames include date: {`export-type-YYYY-MM-DD.csv`}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
