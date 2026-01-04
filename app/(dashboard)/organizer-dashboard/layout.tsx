import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { Calendar, LayoutDashboard, PlusCircle, FileText, CheckCircle, Download } from 'lucide-react';
import Link from 'next/link';
import OrganizerHeader from './OrganizerHeader';

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

  return (
    <div className="min-h-screen bg-[#F3F9F9] flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-indigo-50 via-violet-50 to-orange-50 shadow-md relative min-h-screen overflow-y-auto">
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
            <p className="text-sm text-gray-600">University Event Management</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link
              href="/organizer-dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/organizer-dashboard/events"
              className="flex items-center gap-3 px-4 py-3 bg-purple-200 text-gray-900 rounded-lg"
            >
              <Calendar className="w-5 h-5" />
              <span>My Events</span>
            </Link>
            <Link
              href="/organizer-dashboard/create-event"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Event</span>
            </Link>
            <Link
              href="/organizer-dashboard/registrations"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Registrations</span>
            </Link>
            <Link
              href="/organizer-dashboard/attendance"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Attendance</span>
            </Link>
            <Link
              href="/organizer-dashboard/exports"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Exports</span>
            </Link>
          </nav>
        </div>

        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <OrganizerHeader userName={profile?.full_name || 'Organizer'} />
        
        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
