import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Settings, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, Crown } from 'lucide-react';

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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user };
}

async function getEventsWithFormFields() {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,title,status,created_by')
    .eq('status', 'approved')
    .order('title', { ascending: true });

  // Get form fields for each event
  const eventsWithFields = await Promise.all(
    (events ?? []).map(async (event: any) => {
      const { data: formFields } = await supabase
        .from('event_form_fields')
        .select('id,label,field_type,required,options')
        .eq('event_id', event.id)
        .order('created_at');

      return {
        ...event,
        registration_form_fields: formFields || []
      };
    })
  );

  return eventsWithFields;
}

async function handleFormFieldAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const eventId = formData.get('eventId') as string | null;
  const fieldId = formData.get('fieldId') as string | null;

  if (!action || !eventId) {
    redirect('/admin-dashboard/form-control');
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  const { data: event } = await supabase
    .from('events')
    .select('id,created_by')
    .eq('id', eventId)
    .single();

  if (!event) {
    redirect('/admin-dashboard/form-control');
  }

  let logAction = '';

  if (action === 'disable_field' && fieldId) {
    // Disable unsafe field - update event_form_fields table
    await supabase
      .from('event_form_fields')
      .update({ 
        disabled: true, 
        disabled_by: user.id, 
        disabled_at: new Date().toISOString() 
      })
      .eq('id', fieldId)
      .eq('event_id', eventId);
    
    logAction = 'FORM_FIELD_DISABLE';
  } else if (action === 'enable_field' && fieldId) {
    // Enable previously disabled field
    await supabase
      .from('event_form_fields')
      .update({ 
        disabled: false, 
        disabled_by: null, 
        disabled_at: null 
      })
      .eq('id', fieldId)
      .eq('event_id', eventId);
    
    logAction = 'FORM_FIELD_ENABLE';
  } else if (action === 'override_field_required' && fieldId) {
    // Override field to make it required (safety)
    await supabase
      .from('event_form_fields')
      .update({ 
        required: true, 
        overridden_by: user.id, 
        overridden_at: new Date().toISOString() 
      })
      .eq('id', fieldId)
      .eq('event_id', eventId);
    
    logAction = 'FORM_FIELD_OVERRIDE_REQUIRED';
  } else if (action === 'remove_field_override' && fieldId) {
    // Remove override - restore original required status
    const { data: field } = await supabase
      .from('event_form_fields')
      .select('original_required')
      .eq('id', fieldId)
      .single();
    
    await supabase
      .from('event_form_fields')
      .update({ 
        required: field?.original_required || false, 
        overridden_by: null, 
        overridden_at: null 
      })
      .eq('id', fieldId)
      .eq('event_id', eventId);
    
    logAction = 'FORM_FIELD_REMOVE_OVERRIDE';
  }

  await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action: logAction,
    details: {
      event_id: eventId,
      field_id: fieldId,
      action: action
    }
  });

  redirect('/admin-dashboard/form-control');
}

interface SearchParams {
  event?: string;
}

export default async function AdminFormControlPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const events = await getEventsWithFormFields();
  const selectedEventId = searchParams?.event;

  const selectedEvent = events.find(event => event.id === selectedEventId) || events[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Control</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage registration form fields, ensure data safety, and override unsafe configurations.
          </p>
        </div>
      </div>

      {/* Event selector */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Event
          </CardTitle>
          <CardDescription>
            Choose an event to manage its registration form fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="w-full max-w-xs">
            <Select name="event" defaultValue={selectedEvent?.id || ''}>
              <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                <SelectValue placeholder="Select event" className="text-black" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                <SelectItem value="all" className="text-black hover:bg-gray-100">All Events</SelectItem>
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="mt-3 bg-purple-600 text-white hover:bg-purple-700">
              View Form Fields
            </Button>
          </form>
        </CardContent>
      </Card>

      {!selectedEvent ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Selected</h3>
              <p className="text-gray-500">
                Select an event to view its registration form fields.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Event info */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h2>
                  <p className="text-sm text-gray-500">
                    Registration form fields: {selectedEvent.registration_form_fields?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form fields */}
          {(!selectedEvent.registration_form_fields || selectedEvent.registration_form_fields.length === 0) ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Fields</h3>
                  <p className="text-gray-500">
                    No custom registration fields configured for this event.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Registration Fields</h3>
                <Badge variant="outline">
                  {selectedEvent.registration_form_fields.length} fields
                </Badge>
              </div>
              {selectedEvent.registration_form_fields.map((field: any, index: number) => (
                <Card 
                  key={field.id || index}
                  className={`bg-white hover:shadow-md transition-shadow ${
                    field.disabled ? 'border-red-200 bg-red-50 opacity-75' : 'border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-lg font-semibold text-gray-900">{field.label}</h4>
                          <Badge className={
                            field.field_type === 'text' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            field.field_type === 'email' ? 'bg-green-100 text-green-800 border-green-200' :
                            field.field_type === 'phone' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            field.field_type === 'number' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                            field.field_type === 'select' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            field.field_type === 'file' ? 'bg-pink-100 text-pink-800 border-pink-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }>
                            {field.field_type}
                          </Badge>
                          {field.required && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              REQUIRED
                            </Badge>
                          )}
                          {field.disabled && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <Lock className="w-3 h-3 mr-1" />
                              DISABLED
                            </Badge>
                          )}
                          {field.overridden_by && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              <Crown className="w-3 h-3 mr-1" />
                              OVERRIDDEN
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>No placeholder configured</p>
                          
                          {field.options && field.options.length > 0 && (
                            <div>
                              <span className="font-medium">Options:</span> {field.options.join(', ')}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Field ID: {field.id || `field-${index}`}</div>
                            {field.disabled && (
                              <div>Disabled by admin at {new Date(field.disabled_at).toLocaleString()}</div>
                            )}
                            {field.overridden_by && (
                              <div>Overridden by admin at {new Date(field.overridden_at).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={handleFormFieldAction}>
                          <input type="hidden" name="eventId" value={selectedEvent.id} />
                          <input type="hidden" name="fieldId" value={field.id || `field-${index}`} />
                          
                          {field.disabled ? (
                            <Button
                              type="submit"
                              name="action"
                              value="enable_field"
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              Enable Field
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              name="action"
                              value="disable_field"
                              size="sm"
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Disable Field
                            </Button>
                          )}
                          
                          {!field.required && !field.overridden_by && (
                            <Button
                              type="submit"
                              name="action"
                              value="override_field_required"
                              size="sm"
                              className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Make Required
                            </Button>
                          )}
                          
                          {field.overridden_by && (
                            <Button
                              type="submit"
                              name="action"
                              value="remove_field_override"
                              size="sm"
                              variant="outline"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Remove Override
                            </Button>
                          )}
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Safety guidelines */}
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Form Control Guidelines:</h4>
                  <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                    <li><strong>Disable Field:</strong> Prevent users from filling potentially unsafe fields</li>
                    <li><strong>Make Required:</strong> Override organizer settings to ensure critical data collection</li>
                    <li><strong>Enable Field:</strong> Restore previously disabled fields</li>
                    <li><strong>Remove Override:</strong> Revert to original organizer configuration</li>
                    <li>All actions are logged with full audit trail for accountability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
