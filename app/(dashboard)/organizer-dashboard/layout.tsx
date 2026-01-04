import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import OrganizerHeader from './OrganizerHeader';
import OrganizerSidebar from './OrganizerSidebar';

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
        <OrganizerSidebar />
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
