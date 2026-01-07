import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ViewTicketButton } from './ViewTicketButton';
import { Search, Filter, Grid3X3, List, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

async function getRegistrations(search: string | null, eventId: string | null, status: string | null, paymentType: string | null, sourceType: string | null) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('registrations')
    .select(
      `id,status,entry_code,created_at,event_id,user_id,
       event:events(id,title,is_paid,price),
       user:profiles(id,full_name,email)`
    )
    .order('created_at', { ascending: false });

  // Apply filters
  if (eventId && eventId !== 'all') {
    query = query.eq('event_id', eventId);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (paymentType && paymentType !== 'all') {
    if (paymentType === 'paid') {
      query = query.eq('event.is_paid', true);
    } else if (paymentType === 'free') {
      query = query.eq('event.is_paid', false);
    }
  }

  if (sourceType && sourceType !== 'all') {
    if (sourceType === 'manual') {
      query = query.like('entry_code', 'MANUAL-%');
    } else if (sourceType === 'auto') {
      query = query.not('entry_code', 'like', 'MANUAL-%');
    }
  }

  if (search && search.trim().length > 0) {
    // Search by entry code, user full name, or email using the underlying profiles table
    query = query.or(
      `entry_code.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`
    ) as any;
  }

  const { data } = await query;
  return data ?? [];
}

async function registrationsAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const registrationId = formData.get('registrationId') as string | null;

  if (!action || !registrationId) {
    redirect('/admin-dashboard/registrations');
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

  const { data: registration } = await supabase
    .from('registrations')
    .select('id,status,entry_code,event_id,user_id')
    .eq('id', registrationId)
    .single();

  if (!registration) {
    redirect('/admin-dashboard/registrations');
  }

  let newStatus: 'CONFIRMED' | 'CANCELLED' | null = null;
  let logAction = '';

  if (action === 'confirm') {
    newStatus = 'CONFIRMED';
    logAction = 'REG_CONFIRM';
  } else if (action === 'cancel') {
    newStatus = 'CANCELLED';
    logAction = 'REG_CANCEL';
  } else if (action === 'force_confirm') {
    newStatus = 'CONFIRMED';
    logAction = 'REG_FORCE_CONFIRM';
  }

  if (newStatus) {
    await supabase
      .from('registrations')
      .update({ status: newStatus })
      .eq('id', registrationId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: logAction,
      details: {
        registration_id: registration.id,
        event_id: registration.event_id,
        user_id: registration.user_id,
        previous_status: registration.status,
        new_status: newStatus
      }
    });
  }

  redirect('/admin-dashboard/registrations');
}

async function getEvents() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('events')
    .select('id,title')
    .order('title', { ascending: true });
  return data ?? [];
}

interface SearchParams {
  search?: string;
  event?: string;
  status?: string;
  paymentType?: string;
  sourceType?: string;
}

export default async function AdminRegistrationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const search = searchParams?.search ?? null;
  const eventId = searchParams?.event ?? null;
  const status = searchParams?.status ?? null;
  const paymentType = searchParams?.paymentType ?? null;
  const sourceType = searchParams?.sourceType ?? null;
  
  const [registrations, events] = await Promise.all([
    getRegistrations(search, eventId, status, paymentType, sourceType),
    getEvents()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Registrations</h1>
          <p className="mt-1 text-sm text-slate-400">
            View and manage registrations. Confirm, cancel, and inspect tickets.
          </p>
        </div>
      </div>

      {/* Top Search and Filter Bar */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <form className="w-full">
            <input
              type="text"
              name="search"
              defaultValue={search ?? ''}
              placeholder="Search by name, email, or entry code"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </form>
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

        {/* View toggle buttons */}
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <Grid3X3 className="w-4 h-4 text-white" />
          </button>
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <List className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
            <Select name="event" defaultValue={eventId ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select name="status" defaultValue={status ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
            <Select name="paymentType" defaultValue={paymentType ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <Select name="sourceType" defaultValue={sourceType ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {registrations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No registrations found.</p>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg: any) => (
            <div
              key={reg.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
            >
              <div className="flex justify-between items-start mb-4">
                {/* Event Name and Status */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {reg.event?.title ?? 'Event'}
                  </h2>
                  
                  {/* Status Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      reg.status === 'CONFIRMED' 
                        ? 'bg-green-100 text-green-800' 
                        : reg.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reg.status}
                    </span>
                  </div>
                  
                  {/* Registrant Details */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{reg.user?.full_name ?? 'User'}</span>
                    {' - '}
                    <span>{reg.user?.email ?? 'No email'}</span>
                    {' - '}
                    <span>Entry code: {reg.entry_code ?? 'N/A'}</span>
                  </div>
                  
                  {/* Registration Date */}
                  <div className="text-sm text-gray-500">
                    Registered on {new Date(reg.created_at).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric', 
                      year: 'numeric'
                    })}, {new Date(reg.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <form action={registrationsAction} className="flex gap-3">
                  <input type="hidden" name="registrationId" value={reg.id} />
                  
                  {/* Cancel Button */}
                  {reg.status !== 'CANCELLED' && (
                    <button
                      type="submit"
                      name="action"
                      value="cancel"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  
                  {/* Confirm Button (if not confirmed) */}
                  {reg.status !== 'CONFIRMED' && (
                    <button
                      type="submit"
                      name="action"
                      value="confirm"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Confirm
                    </button>
                  )}
                </form>
                
                {/* View Ticket Button */}
                <ViewTicketButton registration={reg} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
