'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from '../../admin-dashboard/create-event/EventBasicsSection';
import { CapacitySection } from '../../admin-dashboard/create-event/CapacitySection';
import { PricingSection } from '../../admin-dashboard/create-event/PricingSection';
import { FormBuilderSection } from '../../admin-dashboard/create-event/FormBuilderSection';
import { VisibilitySection } from '../../admin-dashboard/create-event/VisibilitySection';
import { ReviewSection } from '../../admin-dashboard/create-event/ReviewSection';
import { CreateEventProvider, useCreateEvent, FormField, EventData } from '../../admin-dashboard/create-event/CreateEventProvider';

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
  status: 'approved' | 'draft' | 'pending_approval' | 'cancelled';
  visibility?: 'public' | 'hidden';
  assigned_organizer: string | null;
  created_at: string;
  form_fields?: FormField[];
}

function mapInitialData(event: Event): Partial<EventData> {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    total_capacity: event.capacity,
    registration_status: event.is_registration_open ? 'open' : 'closed',
    auto_close_when_full: true,
    event_type: event.price > 0 ? 'paid' : 'free',
    price: event.price,
    currency: 'INR',
    form_fields: event.form_fields || [],
    visibility: (event.visibility ?? 'public') as any,
    save_mode: 'draft'
  };
}

function restrictClientFields(initialData: Event, current: EventData) {
  const status = initialData.status;
  const isApproved = status === 'approved';

  if (!isApproved) {
    return current;
  }

  return {
    ...current,
    total_capacity: initialData.capacity,
    event_date: initialData.event_date,
    start_time: initialData.start_time,
    end_time: initialData.end_time,
    event_type: initialData.price > 0 ? 'paid' : 'free',
    price: initialData.price,
    visibility: (initialData.visibility ?? 'public') as any
  };
}

function OrganizerEditEventFormContent({ initialData }: { initialData: Event }) {
  const { state, setSubmitting, toggleConfirmation, validateForm, updateField } = useCreateEvent();
  const router = useRouter();
  const [intent, setIntent] = useState<'save' | 'submit'>('save');

  const isApproved = initialData.status === 'approved';

  const openConfirm = (next: 'save' | 'submit') => {
    setIntent(next);
    toggleConfirmation();
  };

  const handleSubmit = async () => {
    const isValid = validateForm();
    if (!isValid) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const payload = restrictClientFields(initialData, state.data);

      const response = await fetch('/api/organizer/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: initialData.id,
          intent: intent === 'submit' ? 'submit_for_approval' : 'save',
          event: {
            title: payload.title,
            description: payload.description,
            location: payload.location,
            event_date: payload.event_date,
            start_time: payload.start_time,
            end_time: payload.end_time,
            capacity: payload.total_capacity,
            price: payload.event_type === 'paid' ? payload.price : 0,
            visibility: payload.visibility
          },
          form_fields: payload.form_fields
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to update event');
        return;
      }

      toast.success(intent === 'submit' ? 'Event submitted for approval' : 'Event updated successfully');
      router.push(`/organizer-dashboard/events?updated_event=${encodeURIComponent(initialData.id)}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const statusHelper = isApproved
    ? 'Approved event: you can only edit description, location, and registration form fields.'
    : 'Draft/Pending: you can edit all event details. You can submit for approval when ready.';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
        <p className="font-semibold text-white">Status: {initialData.status}</p>
        <p className="mt-1 text-[11px] text-slate-400">{statusHelper}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Basics</CardTitle>
          <CardDescription>Basic information about your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventBasicsSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity & Registration</CardTitle>
          <CardDescription>Set capacity and registration options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <CapacitySection />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Payment</CardTitle>
          <CardDescription>Configure pricing and payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <PricingSection />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Form Builder</CardTitle>
          <CardDescription>Customize the registration form</CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Visibility will take effect after approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <VisibilitySection />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>Review your changes before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewSection />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => openConfirm('save')} disabled={state.isSubmitting}>
          Save Changes
        </Button>
        {!isApproved && (
          <Button onClick={() => openConfirm('submit')} disabled={state.isSubmitting}>
            Submit for Approval
          </Button>
        )}
      </div>

      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm</CardTitle>
              <CardDescription>
                {intent === 'submit'
                  ? 'This event will be submitted for admin approval. Continue?'
                  : 'Save these changes now?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end space-x-4">
              <Button variant="outline" onClick={toggleConfirmation} disabled={state.isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toggleConfirmation();
                  handleSubmit();
                }}
                disabled={state.isSubmitting}
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

export default function OrganizerEditEventForm({ initialData }: { initialData: Event }) {
  return (
    <CreateEventProvider initialData={mapInitialData(initialData)}>
      <OrganizerEditEventFormContent initialData={initialData} />
    </CreateEventProvider>
  );
}
