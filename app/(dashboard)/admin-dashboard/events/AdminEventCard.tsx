'use client';

import { Calendar } from 'lucide-react';

interface AdminEventCardProps {
  event: any;
}

export default function AdminEventCard({ event }: AdminEventCardProps) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
    >
      <div className="flex justify-between items-start mb-4">
        {/* Event Image */}
        <div className="flex-shrink-0 mr-4">
          <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
            {event.image_url ? (
              <>
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log('✅ Admin: Image loaded successfully:', event.image_url);
                  }}
                  onError={(e) => {
                    console.error('❌ Admin: Image failed to load:', {
                      url: event.image_url,
                      eventTitle: event.title,
                      eventId: event.id,
                      error: e
                    });
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.classList.remove('hidden');
                    }
                  }}
                />
                <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden">
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

        {/* Event Title and Details */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>
          <p className="text-gray-600 text-sm">
            {event.location || 'No location'} - {new Date(event.event_date).toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: 'numeric' 
            })} - {event.start_time} - {event.end_time}
          </p>
          <div className="mt-2">
            <span className="text-sm text-gray-600">Organizer: </span>
            <span className="text-sm font-medium text-gray-900">{event.organizerName}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-col gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            event.status === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : event.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : event.status === 'draft'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {event.status === 'approved' ? 'APPROVED' : 
             event.status === 'cancelled' ? 'CANCELLED' :
             event.status === 'draft' ? 'DRAFT' : 
             event.status.toUpperCase()}
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            event.is_registration_open
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {event.is_registration_open ? 'REGISTRATIONS OPEN' : 'REGISTRATIONS CLOSED'}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Capacity / Seats Left</p>
          <p className="text-lg font-semibold text-gray-900">{event.capacity ?? 0} / {event.seatsLeft}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Registrations</p>
          <p className="text-lg font-semibold text-gray-900">{event.confirmedCount} confirmed, {event.pendingCount} pending</p>
        </div>
      </div>

      {/* Action Buttons - This part will be handled by the parent component */}
      <div className="flex flex-wrap gap-3">
        {/* This will be populated by the parent component */}
      </div>
    </div>
  );
}
