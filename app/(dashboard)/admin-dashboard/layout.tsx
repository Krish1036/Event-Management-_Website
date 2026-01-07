import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

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
    .select('role,full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user, profile };
}

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md relative min-h-screen overflow-y-auto border-r border-gray-200">
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <AdminHeader userName={profile?.full_name || 'Admin'} />
        
        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
