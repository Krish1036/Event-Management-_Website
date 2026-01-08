import { getSupabaseServerClient } from '@/lib/supabase-server';
import { TicketQr } from '@/components/TicketQr';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getTicket(registrationId: string) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: registration } = await supabase
    .from('registrations')
    .select('id,status,entry_code,event_id')
    .eq('id', registrationId)
    .single();

  if (!registration) return null;

  const { data: event } = await supabase
    .from('events')
    .select('title,location,event_date,start_time,end_time,is_paid,price')
    .eq('id', registration.event_id)
    .single();

  return { registration, event };
}

import { signPayload } from '@/lib/qr';

export default async function TicketPage({ params }: { params: { registrationId: string } }) {
  const data = await getTicket(params.registrationId);

  if (!data) {
    redirect('/');
  }

  const { registration, event } = data as any;

  // sign a token for the ticket (if secret configured this will be HMAC-signed)
  const qrData = signPayload({ registration_id: registration.id });

  const status = registration.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED';

  const statusLabel =
    status === 'CONFIRMED' ? 'Confirmed' : status === 'PENDING' ? 'Payment processing' : 'Cancelled';

  return (
    <div className="min-h-screen bg-[#F3F9F9] p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Event Ticket</h1>
              <p className="text-gray-600">Present this QR code at the venue for check-in.</p>
            </div>
            <div className={status === 'CONFIRMED' 
              ? "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-green-100 text-green-800"
              : status === 'PENDING'
              ? "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-amber-100 text-amber-800"
              : "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-red-100 text-red-800"
            }>
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Information */}
          <div className="lg:col-span-2">
            <Card variant="light" className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">📍</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-gray-900">{event.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Date & Time</p>
                      <p className="text-gray-900">
                        {new Date(event.event_date as string).toLocaleDateString()} {event.start_time}–{event.end_time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-semibold">💰</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ticket Type</p>
                      <p className="text-gray-900">
                        {event.is_paid ? `Paid • ₹${event.price}` : 'Free event'}
                        {!PAYMENTS_ENABLED && event.is_paid && ' · payments disabled (test mode)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Entry Code */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Entry Code</p>
                      <p className="text-lg font-mono font-bold text-gray-900">{registration.entry_code || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        This code can be used for manual check-in if QR scanning is unavailable.
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-lg">#</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <Card variant="light" className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 text-center">Check-in QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-inner">
                  <TicketQr data={qrData} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">Scan this code at the venue</p>
                  <p className="text-xs text-gray-500">for quick and easy check-in</p>
                </div>
                
                {/* Action Buttons */}
                <div className="w-full space-y-2 pt-4">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    Download Ticket
                  </Button>
                  <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                    Share Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-8 text-center">
          <Card variant="light" className="shadow-sm bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-amber-600">⚠️</span>
                <p className="text-sm text-amber-800">
                  Please arrive 15 minutes early and have this QR code ready for scanning.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
