import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 0;

async function requireAdmin() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user };
}

export default async function AdminEventPreviewPage({
  params
}: {
  params: { event_id: string };
}) {
  const { user } = await requireAdmin();

  const admin = getSupabaseAdminClient();
  const eventId = params.event_id;

  let event: any = null;
  let organizer: any = null;
  let formFields: any[] = [];
  let fetchError: string | null = null;

  try {
    const { data: eventData, error: eventError } = await admin
      .from('events')
      .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,price,is_paid,status,created_by,assigned_organizer,created_at,visibility')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('[AdminEventPreview] event fetch error', eventError);
      fetchError = 'Failed to load event data';
    } else if (!eventData) {
      fetchError = 'Event not found';
    } else {
      event = eventData;

      const { data: organizerData } = await admin
        .from('profiles')
        .select('id,full_name')
        .eq('id', (event.created_by as string) ?? '')
        .single();

      organizer = organizerData;

      const { data: fieldsData } = await admin
        .from('event_form_fields')
        .select('id,label,field_type,required,options,disabled,original_required')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      formFields = fieldsData ?? [];
    }
  } catch (e: any) {
    console.error('[AdminEventPreview] unexpected error', e);
    fetchError = 'Unexpected error loading preview';
  }

  const activeFields = formFields.filter((f: any) => !f.disabled);
  const disabledFields = formFields.filter((f: any) => !!f.disabled);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/events">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Preview Event</h1>
            <p className="text-sm text-slate-400">Review full details before approving.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin-dashboard/events/${eventId}/edit`}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            Edit
          </Link>
        </div>
      </div>

      {fetchError && (
        <Card className="border-red-800 bg-red-950/30">
          <CardHeader>
            <CardTitle className="text-red-300">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-200">
            <p>{fetchError}</p>
            <div className="mt-4">
              <Link href="/admin-dashboard/events">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!fetchError && event && (
        <>
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-200">
              {event.status}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ${
                event.is_registration_open
                  ? 'bg-emerald-800/50 text-emerald-200'
                  : 'bg-red-800/40 text-red-200'
              }`}
            >
              {event.is_registration_open ? 'Registrations Open' : 'Registrations Closed'}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-200">
              {event.is_paid ? `Paid • ₹${event.price}` : 'Free'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-slate-400 text-xs">Title</p>
              <p className="font-medium text-slate-100">{event.title}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Organizer</p>
              <p className="font-medium text-slate-100">{(organizer as any)?.full_name ?? 'Unknown'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Date</p>
              <p className="font-medium text-slate-100">{new Date(event.event_date as string).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Time</p>
              <p className="font-medium text-slate-100">
                {event.start_time} - {event.end_time}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Location</p>
              <p className="font-medium text-slate-100">{event.location || 'No location'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Capacity</p>
              <p className="font-medium text-slate-100">{event.capacity}</p>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs">Description</p>
            <p className="text-slate-200 whitespace-pre-wrap">{event.description || 'No description'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Registration Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeFields.length === 0 && disabledFields.length === 0 ? (
            <p className="text-sm text-slate-400">No form fields configured.</p>
          ) : (
            <div className="space-y-3">
              {activeFields.length > 0 && (
                <div className="space-y-2">
                  {activeFields.map((field: any) => (
                    <div key={field.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{field.label}</p>
                        <span className="text-[11px] text-slate-400">
                          {field.field_type}
                          {' • '}
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      {Array.isArray(field.options) && field.options.length > 0 && (
                        <p className="mt-1 text-xs text-slate-400">Options: {field.options.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {disabledFields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">Disabled Fields</p>
                  {disabledFields.map((field: any) => (
                    <div key={field.id} className="rounded-lg border border-slate-800 bg-slate-950/20 p-3 opacity-70">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{field.label}</p>
                        <span className="text-[11px] text-slate-400">
                          {field.field_type}
                          {' • '}
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={`/admin-dashboard/events/${eventId}/edit`}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            Edit Event
          </Link>
          <Link
            href="/admin-dashboard/events"
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
          >
            Back
          </Link>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
