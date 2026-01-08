'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MoreVertical, Edit, Users, Trash2, Calendar, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Event {
  id: string;
  title: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'cancelled';
  visibility?: 'public' | 'hidden';
  created_by: string;
  assigned_organizer?: string;
  image_url?: string | null;
}

interface EventCardProps {
  event: Event;
  onDelete: (eventId: string) => void;
}

function EventCard({ event, onDelete }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
      case 'published':
        return 'Published';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const canDelete = event.status === 'draft' || event.status === 'pending_approval';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Event Image */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
            {event.image_url ? (
              <>
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log('Image loaded successfully:', event.image_url);
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', event.image_url);
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className={`w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden`}>
                  <Calendar className="w-8 h-8 text-purple-400" />
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-purple-400" />
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {event.title}
          </h3>
          <div className="mt-1 space-y-1">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(event.event_date)}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1" />
              {event.location || 'No location specified'}
            </div>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-100 rounded-md">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white !important border-gray-200 shadow-lg z-[9999]">
              <DropdownMenuItem asChild>
                <Link 
                  href={`/organizer-dashboard/events/${event.id}/edit`}
                  className="flex items-center gap-2 w-full px-2 py-2 text-gray-700 hover:bg-gray-100 focus:text-gray-900 focus:bg-gray-100 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  href={`/organizer-dashboard/registrations?event_id=${event.id}`}
                  className="flex items-center gap-2 w-full px-2 py-2 text-gray-700 hover:bg-gray-100 focus:text-gray-900 focus:bg-gray-100 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  View Registrations
                </Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(event.id)}
                    className="flex items-center gap-2 px-2 py-2 text-red-600 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface MyEventsClientProps {
  events: Event[];
}

export default function MyEventsClient({ events }: MyEventsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Debug: Log events data to see what image URLs we have
  console.log('Events data:', events.map(e => ({ 
    id: e.id, 
    title: e.title, 
    image_url: e.image_url,
    hasImage: !!e.image_url 
  })));

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      const response = await fetch(`/api/organizer/events/${eventToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Redirect to refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting event:', error);
      // Show error message (you could add a toast notification here)
    } finally {
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your events and registration activity at a glance
          </p>
        </div>
        <Link
          href="/organizer-dashboard/create-event"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Event
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
            <SelectValue placeholder="All events" className="text-black" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
            <SelectItem value="all" className="text-black hover:bg-gray-100">All events</SelectItem>
            <SelectItem value="draft" className="text-black hover:bg-gray-100">Draft</SelectItem>
            <SelectItem value="pending_approval" className="text-black hover:bg-gray-100">Pending approval</SelectItem>
            <SelectItem value="approved" className="text-black hover:bg-gray-100">Approved / Published</SelectItem>
            <SelectItem value="cancelled" className="text-black hover:bg-gray-100">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {events.length === 0 ? "You haven't created any events yet." : "No events match your filters."}
          </h3>
          <p className="text-gray-500 mb-4">
            {events.length === 0 ? "Get started by creating your first event." : "Try adjusting your search or filter criteria."}
          </p>
          {events.length === 0 && (
            <Link
              href="/organizer-dashboard/create-event"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Event
            </h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete the draft event. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
