import { getSupabaseServerClient } from '@/lib/supabase-server';
import EditEventForm from '../EditEventForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  price: number;
  image_url?: string;
  status: 'draft' | 'published' | 'cancelled';
  registration_deadline?: string;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

export default async function EditEventPage({
  params
}: {
  params: { event_id: string };
}) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

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

  const eventId = params.event_id;

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

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

      <EditEventForm initialData={event as Event} />
    </div>
  );
}
