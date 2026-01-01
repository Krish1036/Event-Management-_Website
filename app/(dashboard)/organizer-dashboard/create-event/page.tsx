import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import OrganizerCreateEventForm from './OrganizerCreateEventForm';

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

export default async function OrganizerCreateEventPage() {
  await requireOrganizer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Create Event</h1>
        <p className="mt-1 text-sm text-slate-400">Create your event as a draft, then submit it for approval.</p>
      </div>

      <OrganizerCreateEventForm />
    </div>
  );
}
