"use client";

import { RegisterClient } from './RegisterClient';

export function EventRegistrationSection({ eventId, registrationOpen, isLoggedIn }: { 
  eventId: string; 
  registrationOpen: boolean; 
  isLoggedIn: boolean;
}) {
  if (!registrationOpen) return null;
  
  if (!isLoggedIn) {
    return (
      <p className="text-[11px] text-slate-400">Login to register for this event.</p>
    );
  }
  
  return <RegisterClient eventId={eventId} />;
}
