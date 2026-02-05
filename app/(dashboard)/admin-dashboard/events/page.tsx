'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Search, Filter, Grid3X3, Menu, List } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminEventCard from './AdminEventCard';
import { getISTDateYYYYMMDD } from '@/lib/date';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('admin_events_view_mode');
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('admin_events_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events based on search term
    if (searchTerm.trim() === '') {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(event => 
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(event.event_date).getFullYear().toString().includes(searchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, events]);

  async function fetchEvents() {
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }

      // Get user email to check if admin
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      // Email check first: If the user's email is in the hardcoded list, they're admin
      const adminEmails = ['krshthakore@gmail.com', 'admin@university.edu']; // Update with your admin emails
      let isAdmin = false;
      
      if (userEmail && adminEmails.includes(userEmail)) {
        isAdmin = true;
      } else {
        // Role check second: If not in email list, checks if they have admin role in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        isAdmin = profile?.role === 'admin';
      }
      
      if (!isAdmin) {
        router.push('/');
        return;
      }

      // Fetch events with usage data
      const { data: eventsData } = await supabase
        .from('events')
        .select('id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,status,created_by,image_url')
        .order('event_date', { ascending: true });

      const { data: registrations } = await supabase
        .from('registrations')
        .select('event_id,status');

      const { data: organizers } = await supabase
        .from('profiles')
        .select('id,full_name');

      const usageMap = new Map<string, { pending: number; confirmed: number }>();
      for (const r of registrations ?? []) {
        const key = r.event_id as string;
        const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
        if (r.status === 'PENDING') entry.pending += 1;
        if (r.status === 'CONFIRMED') entry.confirmed += 1;
        usageMap.set(key, entry);
      }

      const orgMap = new Map<string, string>();
      for (const o of organizers ?? []) {
        orgMap.set(o.id as string, (o.full_name as string) ?? 'Organizer');
      }

      const eventsWithUsage = (eventsData ?? []).map((e) => {
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

      setEvents(eventsWithUsage);
      setFilteredEvents(eventsWithUsage);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEventAction(formData: FormData) {
    const action = formData.get('action') as string | null;
    const eventId = formData.get('eventId') as string | null;

    if (!action || !eventId) {
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user email to check if admin
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      // Email check first: If the user's email is in the hardcoded list, they're admin
      const adminEmails = ['krshthakore@gmail.com', 'admin@university.edu'];
      let isAdmin = false;
      
      if (userEmail && adminEmails.includes(userEmail)) {
        isAdmin = true;
      } else {
        // Role check second
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        isAdmin = profile?.role === 'admin';
      }
      
      if (!isAdmin) return;

      const { data: event } = await supabase
        .from('events')
        .select('id,status,is_registration_open')
        .eq('id', eventId)
        .single();

      if (!event) return;

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
      } else if (action === 'clone_event') {
        // Get the full event data including form fields
        const { data: fullEvent } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (!fullEvent) return;

        // Get form fields for the event
        const { data: formFields } = await supabase
          .from('event_form_fields')
          .select('*')
          .eq('id', eventId);

        // Create cloned event
        const clonedEventData = {
          title: `${fullEvent.title} (Copy)`,
          description: fullEvent.description,
          location: fullEvent.location,
          event_date: getISTDateYYYYMMDD(),
          start_time: fullEvent.start_time,
          end_time: fullEvent.end_time,
          capacity: fullEvent.capacity,
          is_registration_open: false,
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

        if (cloneError || !clonedEvent) return;

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

      // Refresh events
      await fetchEvents();
    } catch (error) {
      console.error('Error handling event action:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Manage events, approvals, registrations, and capacity.</p>
        </div>
        <div className="flex items-center gap-4">
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

          {/* View mode buttons */}
          <div className="filter-actions">
            <button
              className={`action-button ${
                viewMode === 'list' ? 'primary' : 'secondary'
              } mobile-hidden`}
              onClick={() => setViewMode('list')}
            >
              <List className="icon" />
            </button>
            <button
              className={`action-button ${
                viewMode === 'grid' ? 'primary' : 'secondary'
              } mobile-hidden`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="icon" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search events, location, organizer, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
        {searchTerm && ` (searching for "${searchTerm}")`}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No events found' : 'No events available'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'No events match your search criteria.' : 'There are no events in the system yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredEvents.map((event: any) => (
            <AdminEventCard key={event.id} event={event} onAction={handleEventAction} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}
