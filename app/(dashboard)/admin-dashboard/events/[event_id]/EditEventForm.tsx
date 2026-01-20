'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from '../../create-event/EventBasicsSection';
import { CapacitySection } from '../../create-event/CapacitySection';
import { PricingSection } from '../../create-event/PricingSection';
import { FormBuilderSection } from '../../create-event/FormBuilderSection';
import { VisibilitySection } from '../../create-event/VisibilitySection';
import { OrganizerSection } from '../../create-event/OrganizerSection';
import { CreateEventProvider, useCreateEvent, FormField, EventData } from '../../create-event/CreateEventProvider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, ArrowRight, Calendar } from 'lucide-react';
import { updateEventAction } from './edit/actions';

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
  updated_at?: string;
  form_fields?: FormField[];
  pricing_type?: 'free' | 'paid' | 'custom';
  pricing_dropdown_label?: string | null;
  pricing_options?: Array<{
    id: string;
    label: string;
    price: number;
  }>;
}

type Organizer = {
  id: string;
  full_name: string;
  email: string;
};

interface EditEventFormProps {
  initialData: Event;
  organizers: Organizer[];
}

function EditEventFormContent({ initialData, organizers }: EditEventFormProps) {
  const { state, setSubmitting, toggleConfirmation, validateForm } = useCreateEvent();
  const router = useRouter();
  const logPrefix = '[EDIT_EVENT:client]';

  // Map initial event data to form data structure
  const mapInitialData = (event: Event): Partial<EventData> => ({
    title: event.title,
    description: event.description,
    location: event.location,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    total_capacity: event.capacity,
    registration_status: event.is_registration_open ? 'open' : 'closed',
    auto_close_when_full: true, // Default
    event_type: event.pricing_type || (event.price > 0 ? 'paid' : 'free'),
    price: event.price,
    currency: 'INR', // Default
    form_fields: event.form_fields || [],
    visibility: event.visibility ?? 'public',
    save_mode: event.status === 'approved' ? 'publish' : 'draft',
    assigned_organizer: event.assigned_organizer,
    image_url: event.image_url || null,
    pricing_dropdown_label: event.pricing_dropdown_label || undefined,
    pricing_options: event.pricing_options || [],
  });

  const handleSubmit = async () => {
    console.log(logPrefix, 'submit.clicked', { eventId: initialData.id });

    const isValid = validateForm();
    console.log(logPrefix, 'validateForm', {
      isValid,
      errorsCount: Object.keys(state.errors ?? {}).length
    });

    if (!isValid) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      console.log(logPrefix, 'submit.payload', {
        eventId: initialData.id,
        titleLen: (state.data.title ?? '').length,
        event_date: state.data.event_date,
        start_time: state.data.start_time,
        end_time: state.data.end_time,
        capacity: state.data.total_capacity,
        status: state.data.save_mode,
        visibility: state.data.visibility,
        assigned_organizer: state.data.assigned_organizer ?? null,
        formFieldsCount: (state.data.form_fields ?? []).length
      });

      const result = await updateEventAction({
        eventId: initialData.id,
        event: {
          title: state.data.title,
          description: state.data.description,
          location: state.data.location,
          event_date: state.data.event_date,
          start_time: state.data.start_time,
          end_time: state.data.end_time,
          capacity: state.data.total_capacity,
          is_registration_open: state.data.registration_status === 'open',
          price: state.data.event_type === 'paid' ? state.data.price : 0,
          pricing_type: state.data.event_type,
          pricing_dropdown_label: state.data.event_type === 'custom' ? state.data.pricing_dropdown_label : null,
          status: state.data.save_mode === 'publish' ? 'approved' : 'draft',
          visibility: state.data.visibility,
          assigned_organizer: state.data.assigned_organizer || null,
        },
        pricing_options: state.data.event_type === 'custom' ? state.data.pricing_options : [],
        form_fields: state.data.form_fields,
      });

      console.log(logPrefix, 'submit.result', result);

      if (!result.success) {
        const message = (result as any).error || 'Failed to update event. Please try again.';
        toast.error(message);
        return;
      }

      toast.success('Event updated successfully');
      router.push(`/admin-dashboard/events?updated_event=${encodeURIComponent(initialData.id)}`);
    } catch (error) {
      console.error('Error updating event:', error);
      console.log(logPrefix, 'submit.exception', {
        message: (error as any)?.message ?? String(error)
      });
      toast.error('Failed to update event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate differences for review modal
  const getDifferences = () => {
    const original = mapInitialData(initialData);
    const current = state.data;
    const differences: Array<{ field: string; label: string; original: any; current: any; type: 'text' | 'boolean' | 'number' }> = [];

    const fields: Array<{ key: keyof EventData; label: string; type: 'text' | 'boolean' | 'number' }> = [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'event_date', label: 'Event Date', type: 'text' },
      { key: 'start_time', label: 'Start Time', type: 'text' },
      { key: 'end_time', label: 'End Time', type: 'text' },
      { key: 'total_capacity', label: 'Capacity', type: 'number' },
      { key: 'registration_status', label: 'Registration Status', type: 'text' },
      { key: 'event_type', label: 'Event Type', type: 'text' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'visibility', label: 'Visibility', type: 'text' },
      { key: 'save_mode', label: 'Save Mode', type: 'text' },
      { key: 'form_fields', label: 'Form Fields', type: 'text' },
    ];

    fields.forEach(({ key, label, type }) => {
      const originalValue = original[key];
      const currentValue = current[key];
      
      if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) {
        differences.push({
          field: key,
          label,
          original: originalValue,
          current: currentValue,
          type
        });
      }
    });

    return differences;
  };

  const differences = getDifferences();
  const hasChanges = differences.length > 0;

  return (
    <div className="space-y-6">
      {/* Event Image Display - Using same logic as AdminEventCard */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
              {initialData.image_url ? (
                <>
                  <img 
                    src={initialData.image_url} 
                    alt={initialData.title}
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      console.log('✅ Admin Edit: Event image loaded successfully:', initialData.image_url);
                    }}
                    onError={(e) => {
                      console.error('❌ Admin Edit: Event image failed to load:', {
                        url: initialData.image_url,
                        eventTitle: initialData.title,
                        eventId: initialData.id,
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Event Image</h3>
            <p className="text-sm text-gray-600">
              {initialData.image_url ? 'Image is displayed above' : 'No image uploaded yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Helper Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
        <p className="font-semibold text-gray-900">Status: {initialData.status}</p>
        <p className="mt-1 text-[11px] text-gray-600">
          {initialData.status === 'approved' 
            ? 'Approved event: you can edit all event details.' 
            : 'Draft/Pending: you can edit all event details. You can publish when ready.'}
        </p>
      </div>

      {/* Section 1: Event Basics */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Event Basics</CardTitle>
          <CardDescription className="text-gray-500">Basic information about your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventBasicsSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 2: Capacity & Registration */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Capacity & Registration</CardTitle>
          <CardDescription className="text-gray-500">Set capacity and registration options</CardDescription>
        </CardHeader>
        <CardContent>
          <CapacitySection variant="light" />
        </CardContent>
      </Card>

      {/* Section 3: Pricing & Payment */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Pricing & Payment</CardTitle>
          <CardDescription className="text-gray-500">Configure pricing and payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 4: Registration Form Builder */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Registration Form Builder</CardTitle>
          <CardDescription className="text-gray-500">Customize registration form</CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 5: Visibility & Publishing */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Visibility</CardTitle>
          <CardDescription className="text-gray-500">Control event visibility in public listings</CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilitySection variant="light" />
        </CardContent>
      </Card>

      {/* Section 6: Organizer Assignment */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Organizer Assignment</CardTitle>
          <CardDescription className="text-gray-500">Assign an organizer (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizerSection organizers={organizers} />
        </CardContent>
      </Card>

      {/* Primary submit action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={toggleConfirmation} disabled={state.isSubmitting || !hasChanges}>
          Save Changes
        </Button>
        <Button 
          onClick={toggleConfirmation} 
          disabled={state.isSubmitting || !hasChanges}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {state.isSubmitting ? 'Updating Event...' : hasChanges ? 'Update Event' : 'No Changes to Save'}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card variant="light" className="w-full max-w-md border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-black">Confirm</CardTitle>
              <CardDescription className="text-gray-500">
                Save these changes now?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={toggleConfirmation} 
                disabled={state.isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={state.isSubmitting || !hasChanges}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {state.isSubmitting ? 'Saving...' : 'Confirm'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function EditEventForm({ initialData, organizers }: EditEventFormProps) {
  const mappedInitialData = {
    title: initialData.title,
    description: initialData.description,
    location: initialData.location,
    event_date: initialData.event_date,
    start_time: initialData.start_time,
    end_time: initialData.end_time,
    total_capacity: initialData.capacity,
    registration_status: initialData.is_registration_open ? ('open' as const) : ('closed' as const),
    auto_close_when_full: true,
    event_type: initialData.price > 0 ? 'paid' as const : 'free' as const,
    price: initialData.price,
    currency: 'INR',
    form_fields: initialData.form_fields || [],
    visibility: initialData.visibility ?? 'public',
    save_mode: initialData.status === 'approved' ? 'publish' as const : 'draft' as const,
    assigned_organizer: initialData.assigned_organizer ?? null,
    image_url: initialData.image_url || null,
  };

  return (
    <CreateEventProvider initialData={mappedInitialData}>
      <EditEventFormContent initialData={initialData} organizers={organizers} />
    </CreateEventProvider>
  );
}
