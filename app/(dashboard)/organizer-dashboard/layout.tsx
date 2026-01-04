import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { Calendar, LayoutDashboard, PlusCircle, FileText, CheckCircle, Download, Bell, Settings } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

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

export default async function OrganizerDashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireOrganizer();

  const currentDate = new Date();
  const formattedDateTime = `${currentDate.getFullYear()}, ${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')} ${currentDate.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md relative">
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
            <Link
              href="/organizer-dashboard"
              className="flex items-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/organizer-dashboard/events"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>My Events</span>
            </Link>
            <Link
              href="/organizer-dashboard/create-event"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Event</span>
            </Link>
            <Link
              href="/organizer-dashboard/registrations"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Registrations</span>
            </Link>
            <Link
              href="/organizer-dashboard/attendance"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Attendance</span>
            </Link>
            <Link
              href="/organizer-dashboard/exports"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Exports</span>
            </Link>
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

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
