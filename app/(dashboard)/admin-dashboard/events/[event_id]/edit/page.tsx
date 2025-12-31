import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import EditEventForm from '../EditEventForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  image_url?: string;
  status: 'approved' | 'draft' | 'cancelled';
  visibility?: 'public' | 'hidden';
  registration_deadline?: string;
  assigned_organizer: string | null;
  created_at: string;
  form_fields?: any[];
}

type Organizer = {
  id: string;
  full_name: string;
  email: string;
};

export default async function EditEventPage({
  params
}: {
  params: { event_id: string };
}) {
  const logPrefix = '[EDIT_EVENT:page]';
  console.log(logPrefix, 'start', { eventId: params?.event_id });

  const supabase = getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  console.log(logPrefix, 'auth.getUser', {
    hasUser: !!user,
    userId: user?.id ?? null
  });

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-4">Not authenticated</p>
              <Link href="/admin">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log(logPrefix, 'profiles.role', {
    userId: user.id,
    role: (profile as any)?.role ?? null
  });

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-4">Not authorized</p>
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventId = params.event_id;

  console.log(logPrefix, 'fetch.event', { eventId });

  const { data: event, error } = await admin
    .from('events')
    .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,price,status,assigned_organizer,created_at')
    .eq('id', eventId)
    .single();

  console.log(logPrefix, 'fetch.event.result', {
    found: !!event,
    error: error?.message ?? null
  });

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <Link href="/admin-dashboard/events">
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

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600 mb-4">Event Not Found</h2>
              <Link href="/admin-dashboard/events">
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

  const { data: formFields } = await admin
    .from('event_form_fields')
    .select('id,label,field_type,required,options,disabled,original_required')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  console.log(logPrefix, 'fetch.formFields', {
    count: (formFields ?? []).length
  });

  const { data: organizers } = await admin
    .from('profiles')
    .select('id,full_name,email')
    .eq('role', 'organizer')
    .order('full_name');

  console.log(logPrefix, 'fetch.organizers', {
    count: (organizers ?? []).length
  });

  const initialData = {
    ...(event as any),
    form_fields: formFields ?? [],
    visibility: 'public'
  };

  console.log(logPrefix, 'render', {
    eventId,
    formFieldsCount: (formFields ?? []).length,
    organizersCount: (organizers ?? []).length
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <p className="text-gray-600">Modify event details and settings</p>
        </div>
      </div>

      <EditEventForm initialData={initialData as Event} organizers={(organizers ?? []) as Organizer[]} />
    </div>
  );
}
