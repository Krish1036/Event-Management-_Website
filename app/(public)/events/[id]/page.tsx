import { getSupabaseServerClient } from '@/lib/supabase-server';
import { RegisterClient } from './RegisterClient';
import { EventRegistrationSection } from './EventRegistrationSection';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getEventWithCapacity(id: string) {
  const supabase = getSupabaseServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,is_paid,price,status')
    .eq('id', id)
    .single();

  if (!event || event.status !== 'approved') {
    return null;
  }

  const { data: formFields } = await supabase
    .from('event_form_fields')
    .select('id,label,field_type,required,options,disabled')
    .eq('event_id', id)
    .order('created_at');

  const activeFormFields = (formFields || []).filter((field: any) => !field.disabled);
  const serializedFormFields = JSON.parse(JSON.stringify(activeFormFields));

  const { data: registrationCount } = await supabase
    .rpc('count_event_registrations', { event_uuid: id });

  const used = registrationCount ?? 0;
  const remaining = Math.max(0, (event.capacity as number) - used);

  return { event, remaining, used, registration_form_fields: serializedFormFields };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const result = await getEventWithCapacity(params.id);
  if (!result) {
    redirect('/events');
  }

  const { event, remaining, used, registration_form_fields } = result as any;

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const registrationOpen = event.is_registration_open && remaining > 0;

  return (
    <div className="min-h-screen bg-[#F3F9F9] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Information */}
          <div className="lg:col-span-2">
            <Card variant="light" className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-gray-900 break-words">{event.title}</CardTitle>
                <div 
                  className="text-gray-600 mt-3 leading-relaxed break-words prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: event.description || 'No description available' }}
                />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 hover:bg-purple-200">
                    📅 {new Date(event.event_date as string).toLocaleDateString()} {event.start_time}–{event.end_time}
                  </div>
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200">
                    📍 {event.location}
                  </div>
                  <div className={event.is_paid ? "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200" : "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200"}>
                    {event.is_paid ? `💰 Paid • ₹${event.price}` : '🆓 Free event'}
                    {!PAYMENTS_ENABLED && event.is_paid && ' · payments disabled (test mode)'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Section */}
          <div className="lg:col-span-1">
            <Card variant="light" className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Event Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capacity Section - Always visible */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Capacity</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {used}/{event.capacity} used
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((used / event.capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {remaining > 0 ? `${remaining} seats left` : 'Event is full'}
                  </p>
                </div>

                {/* Registration Status */}
                <div className="flex items-center justify-center">
                  <div className={registrationOpen ? "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700" : "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700"}>
                    {registrationOpen ? '✓ Registration open' : '✗ Registration closed'}
                  </div>
                </div>

                {/* Registration Form - Only show if registration is open */}
                {event.is_registration_open && (
                  <EventRegistrationSection 
                    eventId={event.id as string} 
                    registrationOpen={registrationOpen} 
                    isLoggedIn={isLoggedIn}
                    registrationFormFields={registration_form_fields}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
