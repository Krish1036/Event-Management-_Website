"use client";

import { RegisterClient } from './RegisterClientNew';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
}

interface PricingOption {
  id: string;
  label: string;
  price: number;
}

export function EventRegistrationSection({ 
  eventId, 
  registrationOpen, 
  isLoggedIn, 
  registrationFormFields, 
  event, 
  pricingOptions 
}: { 
  eventId: string; 
  registrationOpen: boolean; 
  isLoggedIn: boolean;
  registrationFormFields?: RegistrationFormField[];
  event?: any;
  pricingOptions?: PricingOption[] | null;
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
  
  return <RegisterClient eventId={eventId} formFields={registrationFormFields || []} event={event} pricingOptions={pricingOptions} />;
}
