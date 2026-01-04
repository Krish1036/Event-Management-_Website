'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from '../../admin-dashboard/create-event/EventBasicsSection';
import { CapacitySection } from '../../admin-dashboard/create-event/CapacitySection';
import { PricingSection } from '../../admin-dashboard/create-event/PricingSection';
import { FormBuilderSection } from '../../admin-dashboard/create-event/FormBuilderSection';
import { ReviewSection } from '../../admin-dashboard/create-event/ReviewSection';
import { CreateEventProvider, useCreateEvent } from '../../admin-dashboard/create-event/CreateEventProvider';

function OrganizerCreateEventFormContent() {
  const { state, setSubmitting, toggleConfirmation, validateForm, updateField } = useCreateEvent();
  const router = useRouter();
  const [intent, setIntent] = useState<'draft' | 'submit'>('draft');

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/organizer/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: {
            title: state.data.title,
            description: state.data.description,
            location: state.data.location,
            event_date: state.data.event_date,
            start_time: state.data.start_time,
            end_time: state.data.end_time,
            capacity: state.data.total_capacity,
            is_registration_open: false,
            price: state.data.event_type === 'paid' ? state.data.price : 0,
            save_mode: intent === 'submit' ? 'submit_for_approval' : 'draft'
          },
          form_fields: state.data.form_fields
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || 'Failed to create event. Please try again.';
        toast.error(message);
        return;
      }

      toast.success(intent === 'submit' ? 'Event submitted for approval' : 'Draft saved');
      const eventId = result.event?.id as string | undefined;
      if (eventId) {
        router.push(`/organizer-dashboard/events?new_event=${encodeURIComponent(eventId)}`);
      } else {
        router.push('/organizer-dashboard/events');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmation = (nextIntent: 'draft' | 'submit') => {
    setIntent(nextIntent);
    updateField('save_mode', 'draft');
    toggleConfirmation();
  };

  return (
    <div className="space-y-6">
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Event Basics</CardTitle>
          <CardDescription className="text-gray-500">Basic information about your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventBasicsSection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Capacity & Registration</CardTitle>
          <CardDescription className="text-gray-500">Set capacity and registration options</CardDescription>
        </CardHeader>
        <CardContent>
          <CapacitySection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Pricing & Payment</CardTitle>
          <CardDescription className="text-gray-500">Configure pricing and payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingSection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Registration Form Builder</CardTitle>
          <CardDescription className="text-gray-500">Customize the registration form</CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderSection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Review</CardTitle>
          <CardDescription className="text-gray-500">Review your event details before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewSection variant="light" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={() => openConfirmation('draft')}
          disabled={state.isSubmitting}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Save Draft
        </Button>
        <Button 
          onClick={() => openConfirmation('submit')} 
          disabled={state.isSubmitting}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Submit for Approval
        </Button>
      </div>

      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card variant="light" className="w-full max-w-md border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-black">Confirm</CardTitle>
              <CardDescription className="text-gray-500">
                {intent === 'submit'
                  ? 'This event will be submitted for admin approval. Continue?'
                  : 'This event will be saved as a draft. Continue?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end space-x-3">
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
                disabled={state.isSubmitting}
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

export default function OrganizerCreateEventForm() {
  return (
    <CreateEventProvider
      initialData={{
        save_mode: 'draft',
        visibility: 'public',
        registration_status: 'closed'
      }}
    >
      <OrganizerCreateEventFormContent />
    </CreateEventProvider>
  );
}
