import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import OrganizerEditEventForm from '../OrganizerEditEventForm';

export const revalidate = 0;

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  is_registration_open: boolean;
  price: number;
  status: 'approved' | 'draft' | 'pending_approval' | 'cancelled';
  visibility?: 'public' | 'hidden';
  assigned_organizer: string | null;
  created_by: string | null;
  created_at: string;
  form_fields?: any[];
}

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

export default async function OrganizerEditEventPage({ params }: { params: { event_id: string } }) {
  const { user } = await requireOrganizer();

  const admin = getSupabaseAdminClient();

  const { data: event, error } = await admin
    .from('events')
    .select(
      'id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,price,status,visibility,assigned_organizer,created_by,created_at'
    )
    .eq('id', params.event_id)
    .single();

  if (error || !event) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-4">{error?.message ?? 'Event not found'}</p>
              <Link href="/organizer-dashboard/events">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwned = (event.created_by === user.id || event.assigned_organizer === user.id) && !!event.created_by;
  if (!isOwned) {
    redirect('/');
  }

  const { data: formFields } = await admin
    .from('event_form_fields')
    .select('id,label,field_type,required,options,disabled,original_required')
    .eq('event_id', event.id)
    .order('created_at', { ascending: true });

  const initialData: Event = {
    ...(event as any),
    form_fields: formFields ?? []
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/organizer-dashboard/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <p className="text-gray-600">Update details based on approval status</p>
        </div>
      </div>

      <OrganizerEditEventForm initialData={initialData} />
    </div>
  );
}
