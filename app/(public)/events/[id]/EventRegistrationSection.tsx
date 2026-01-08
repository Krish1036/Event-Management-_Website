"use client";

import { RegisterClient } from './RegisterClient';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
}

export function EventRegistrationSection({ eventId, registrationOpen, isLoggedIn, registrationFormFields }: { 
  eventId: string; 
  registrationOpen: boolean; 
  isLoggedIn: boolean;
  registrationFormFields?: RegistrationFormField[];
}) {
  if (!registrationOpen) return null;
  
  if (!isLoggedIn) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          🔐 Please login to register for this event
        </p>
      </div>
    );
  }
  
  return <RegisterClient eventId={eventId} formFields={registrationFormFields || []} />;
}
