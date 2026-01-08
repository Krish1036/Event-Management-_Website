import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, Grid3X3, Menu } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminEventCard from './AdminEventCard';

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

async function getEventsWithUsage() {
  const supabase = getSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,status,created_by,image_url')
    .order('event_date', { ascending: true });

  const { data: registrations } = await supabase
    .from('registrations')
    .select('event_id,status');

  const usageMap = new Map<string, { pending: number; confirmed: number }>();
  for (const r of registrations ?? []) {
    const key = r.event_id as string;
    const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
    if (r.status === 'PENDING') entry.pending += 1;
    if (r.status === 'CONFIRMED') entry.confirmed += 1;
    usageMap.set(key, entry);
  }

  const { data: organizers } = await supabase
    .from('profiles')
    .select('id,full_name');

  const orgMap = new Map<string, string>();
  for (const o of organizers ?? []) {
    orgMap.set(o.id as string, (o.full_name as string) ?? 'Organizer');
  }

  return (events ?? []).map((e) => {
    const usage = usageMap.get(e.id as string) ?? { pending: 0, confirmed: 0 };
    const total = usage.pending + usage.confirmed;
    const capacity = e.capacity ?? 0;
    const utilization = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;
    const seatsLeft = Math.max(0, capacity - total);

    return {
      ...e,
      organizerName: orgMap.get(e.created_by as string) ?? 'Unknown',
      pendingCount: usage.pending,
      confirmedCount: usage.confirmed,
      utilization,
      seatsLeft
    };
  });
}

async function handleEventAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const eventId = formData.get('eventId') as string | null;

  if (!action || !eventId) {
    redirect('/admin-dashboard/events');
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
    .select('id,status,is_registration_open')
    .eq('id', eventId)
    .single();

  if (!event) {
    redirect('/admin-dashboard/events');
  }

  const updates: Record<string, any> = {};
  let logAction = '';

  if (action === 'approve') {
    updates.status = 'approved';
    logAction = 'EVENT_APPROVE';
  } else if (action === 'cancel') {
    updates.status = 'cancelled';
    updates.is_registration_open = false;
    logAction = 'EVENT_CANCEL';
  } else if (action === 'open_reg') {
    updates.is_registration_open = true;
    logAction = 'EVENT_OPEN_REG';
  } else if (action === 'close_reg') {
    updates.is_registration_open = false;
    logAction = 'EVENT_CLOSE_REG';
  } else if (action === 'emergency_disable') {
    updates.status = 'cancelled';
    updates.is_registration_open = false;
    logAction = 'EVENT_EMERGENCY_DISABLE';
  } else if (action === 'edit_event') {
    const title = formData.get('title') as string | null;
    const event_date = formData.get('event_date') as string | null;
    const start_time = formData.get('start_time') as string | null;
    const end_time = formData.get('end_time') as string | null;
    const location = formData.get('location') as string | null;
    const capacity = formData.get('capacity') as string | null;

    if (title) updates.title = title;
    if (event_date) updates.event_date = event_date;
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (location) updates.location = location;
    if (capacity) updates.capacity = parseInt(capacity, 10);
    
    logAction = 'EVENT_EDIT';
  } else if (action === 'manual_override') {
    const userEmail = formData.get('userEmail') as string | null;
    
    if (!userEmail) {
      redirect('/admin-dashboard/events');
    }

    // Find user by email
    const { data: user } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('email', userEmail)
      .single();

    if (!user) {
      redirect('/admin-dashboard/events');
    }

    // Generate manual entry code
    const entryCode = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create manual registration
    await supabase.from('registrations').insert({
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
      entry_code: entryCode
    });

    // Log manual override immediately
    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'REG_MANUAL_OVERRIDE',
      details: {
        event_id: eventId,
        user_email: userEmail,
        entry_code: entryCode
      }
    });

    logAction = 'REG_MANUAL_OVERRIDE';
  } else if (action === 'force_close_capacity') {
    updates.is_registration_open = false;
    logAction = 'EVENT_FORCE_CLOSE_CAPACITY';
  } else if (action === 'clone_event') {
    // Get the full event data including form fields
    const { data: fullEvent } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!fullEvent) {
      redirect('/admin-dashboard/events');
    }

    // Get form fields for the event
    const { data: formFields } = await supabase
      .from('event_form_fields')
      .select('*')
      .eq('event_id', eventId);

    // Create cloned event
    const clonedEventData = {
      title: `${fullEvent.title} (Copy)`,
      description: fullEvent.description,
      location: fullEvent.location,
      event_date: new Date().toISOString().split('T')[0], // Set to today
      start_time: fullEvent.start_time,
      end_time: fullEvent.end_time,
      capacity: fullEvent.capacity,
      is_registration_open: false, // Start with registration closed
      status: 'draft',
      price: fullEvent.price,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const { data: clonedEvent, error: cloneError } = await supabase
      .from('events')
      .insert(clonedEventData)
      .select()
      .single();

    if (cloneError || !clonedEvent) {
      redirect('/admin-dashboard/events');
    }

    // Clone form fields if they exist
    if (formFields && formFields.length > 0) {
      const clonedFormFields = formFields.map(field => ({
        event_id: clonedEvent.id,
        label: field.label,
        field_type: field.field_type,
        required: field.required,
        options: field.options,
        disabled: false,
        original_required: field.original_required,
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('event_form_fields')
        .insert(clonedFormFields);
    }

    // Log clone action
    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'EVENT_CLONE',
      details: {
        original_event_id: eventId,
        cloned_event_id: clonedEvent.id,
        original_title: fullEvent.title,
        cloned_title: clonedEventData.title
      }
    });

    logAction = 'EVENT_CLONE';
  } else if (action === 'delete') {
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'EVENT_DELETE',
      details: {
        event_id: eventId
      }
    });

    logAction = 'EVENT_DELETE';
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: logAction,
      details: {
        event_id: event.id,
        previous_status: event.status,
        previous_is_registration_open: event.is_registration_open,
        updates
      }
    });
  }

  redirect('/admin-dashboard/events');
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await requireAdmin();
  const events = await getEventsWithUsage();
  const highlightEventId = typeof searchParams?.new_event === 'string' ? searchParams?.new_event : 
                          typeof searchParams?.updated_event === 'string' ? searchParams?.updated_event : undefined;

  return (
    <div className="space-y-6">
      {/* Header with search and controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Manage events, approvals, registrations, and capacity.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search event, location, etc"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm w-64"
            />
          </div>

          {/* Filter button */}
          <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <Filter className="w-4 h-4 text-white" />
          </button>

          {/* Category dropdown */}
          <Select>
            <SelectTrigger className="w-32 border-gray-300 text-sm">
              <SelectValue placeholder="All Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="meetup">Meetup</SelectItem>
              <SelectItem value="webinar">Webinar</SelectItem>
            </SelectContent>
          </Select>

          {/* Month dropdown */}
          <Select>
            <SelectTrigger className="w-28 border-gray-300 text-sm">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Grid view button */}
          <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <Grid3X3 className="w-4 h-4 text-white" />
          </button>

          {/* Menu button */}
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No events found.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event: any) => (
            <div key={event.id}>
              <AdminEventCard event={event} />
              {/* Action Buttons */}
              <div className="px-6 pb-6 -mt-4">
                <form action={handleEventAction} className="flex flex-wrap gap-3">
                  <input type="hidden" name="eventId" value={event.id} />
                  
                  {/* Preview Button */}
                  <Link
                    href={`/admin-dashboard/events/${event.id}/preview`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Preview
                  </Link>
                  
                  {/* Edit Event Button */}
                  <Link
                    href={`/admin-dashboard/events/${event.id}/edit`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Edit Event
                  </Link>
                  
                  {/* Clone Event Button */}
                  <button
                    type="submit"
                    name="action"
                    value="clone_event"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Clone Event
                  </button>
                  
                  {/* Close/Open Registrations Button */}
                  <button
                    type="submit"
                    name="action"
                    value={event.is_registration_open ? 'close_reg' : 'open_reg'}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    {event.is_registration_open ? 'Close Registrations' : 'Open Registrations'}
                  </button>
                  
                  {/* Cancel Event Button */}
                  <button
                    type="submit"
                    name="action"
                    value="cancel"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Cancel Event
                  </button>
                  
                  {/* Delete Event Button */}
                  <button
                    type="submit"
                    name="action"
                    value="delete"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Delete Event
                  </button>
                  
                  {/* Approve Button (if pending) */}
                  {event.status === 'pending_approval' && (
                    <button
                      type="submit"
                      name="action"
                      value="approve"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Approve Event
                    </button>
                  )}
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
