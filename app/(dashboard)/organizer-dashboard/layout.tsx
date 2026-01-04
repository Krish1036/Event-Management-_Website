import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import OrganizerNavItem from './OrganizerNavItem';

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

  return { user, profile };
}

export default async function OrganizerDashboardLayout({ children }: { children: ReactNode }) {
  await requireOrganizer();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/80 px-4 py-6 md:flex md:flex-col">
          <div className="mb-8 px-2">
            <h1 className="text-lg font-semibold tracking-tight text-white">Organizer Panel</h1>
            <p className="mt-1 text-[11px] text-slate-400">University Event Management</p>
          </div>

          <nav className="flex-1 space-y-1 text-sm">
            <OrganizerNavItem href="/organizer-dashboard" label="Dashboard" />
            <OrganizerNavItem href="/organizer-dashboard/events" label="My Events" />
            <OrganizerNavItem href="/organizer-dashboard/create-event" label="Create Event" />
            <OrganizerNavItem href="/organizer-dashboard/registrations" label="Registrations" />
            <OrganizerNavItem href="/organizer-dashboard/attendance" label="Attendance" />
            <OrganizerNavItem href="/organizer-dashboard/exports" label="Exports" />
          </nav>

          <form action="/api/organizer/logout" method="post" className="mt-6 border-t border-slate-800 pt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-md bg-red-900/30 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-900/50"
            >
              <span>Logout</span>
            </button>
          </form>
        </aside>

        <div className="flex w-full flex-1 flex-col md:pl-0">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 md:hidden">
            <div>
              <p className="text-xs font-medium text-slate-300">Organizer Panel</p>
              <p className="text-[11px] text-slate-500">Tap menu to navigate</p>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
