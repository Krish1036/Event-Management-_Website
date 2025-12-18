"use client";

import { useState } from 'react';
import { toast } from 'sonner';

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

export function RegisterClient({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const endpoint = PAYMENTS_ENABLED ? '/api/register-event' : '/api/register-event-test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to register');
      }

      if (data.free || !PAYMENTS_ENABLED) {
        toast.success('Registration confirmed for free event');
        if (data.registration_id) {
          window.location.href = `/tickets/${data.registration_id}`;
        }
        return;
      }

      const options: any = {
        key: data.razorpay_key,
        amount: data.amount * 100,
        currency: 'INR',
        order_id: data.order_id,
        name: 'University Events',
        description: 'Event registration',
        handler: function () {
          toast.success('Payment completed. Awaiting confirmation.');
        },
        modal: {
          ondismiss: function () {
            toast('You can reopen your ticket later once payment is processed.');
          }
        }
      };

      // @ts-expect-error Razorpay is loaded globally by checkout.js script
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRegister}
      disabled={loading}
      className="inline-flex items-center justify-center rounded bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
    >
      {loading ? 'Processing…' : 'Register'}
    </button>
  );
}
