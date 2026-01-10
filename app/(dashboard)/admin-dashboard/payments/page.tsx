import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DollarSign, Calendar, Users, Filter, Search, Info, AlertTriangle } from 'lucide-react';

export const revalidate = 0;

async function requireAdmin() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { user };
}

async function getPaymentsData(statusFilter: string | null, eventFilter: string | null) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('payments')
    .select(
      `id,amount,status,razorpay_order_id,razorpay_payment_id,razorpay_signature,created_at,
       registration:registrations(id,status,entry_code,event_id,user_id),
       event:events(id,title,is_paid,price),
       user:profiles(id,full_name)`
    )
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (eventFilter && eventFilter !== 'all') {
    query = query.eq('event_id', eventFilter);
  }

  const { data } = await query;
  return data ?? [];
}

async function getEvents() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('events')
    .select('id,title')
    .eq('is_paid', true)
    .order('title', { ascending: true });
  return data ?? [];
}

interface SearchParams {
  status?: string;
  event?: string;
}

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const statusFilter = searchParams?.status ?? 'all';
  const eventFilter = searchParams?.event ?? 'all';
  
  const [payments, events] = await Promise.all([
    getPaymentsData(statusFilter, eventFilter),
    getEvents()
  ]);

  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

  // Detect payment success but missing registration
  const suspiciousPayments = payments.filter(
    (p: any) => p.status === 'SUCCESS' && (!p.registration || p.registration?.status !== 'CONFIRMED')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all payments, filter by status and event, and detect payment anomalies.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter payments by status and event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select name="status" defaultValue={statusFilter}>
                <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="All Status" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Status</SelectItem>
                  <SelectItem value="CREATED" className="text-black hover:bg-gray-100">Created</SelectItem>
                  <SelectItem value="SUCCESS" className="text-black hover:bg-gray-100">Success</SelectItem>
                  <SelectItem value="FAILED" className="text-black hover:bg-gray-100">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
              <Select name="event" defaultValue={eventFilter}>
                <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="All Events" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Events</SelectItem>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-2"
              >
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment mode banner */}
      <Card className={`border-l-4 ${
        paymentsEnabled
          ? 'border-l-green-500 bg-green-50'
          : 'border-l-amber-500 bg-amber-50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                paymentsEnabled ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                <Info className={`w-5 h-5 ${
                  paymentsEnabled ? 'text-green-600' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payment system status</p>
                <p className="text-sm text-gray-600">
                  {paymentsEnabled
                    ? 'LIVE MODE – real payments are being processed.'
                    : 'TEST MODE – payments are disabled or running in sandbox mode.'}
                </p>
              </div>
            </div>
            <Badge className={
              paymentsEnabled 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }>
              {paymentsEnabled ? 'Live mode' : 'Test mode'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Suspicious payments warning */}
      {suspiciousPayments.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Suspicious payments detected</p>
                <p className="text-sm text-gray-600">
                  {suspiciousPayments.length} payment(s) marked as SUCCESS but registration is missing or not confirmed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-500">
                No payments match your current filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment: any) => {
            const isSuspicious = payment.status === 'SUCCESS' && (!payment.registration || payment.registration?.status !== 'CONFIRMED');
            
            return (
              <Card 
                key={payment.id}
                className={`hover:shadow-md transition-shadow ${
                  isSuspicious ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            ₹{payment.amount}
                          </h3>
                        </div>
                        <Badge className={
                          payment.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : payment.status === 'FAILED'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }>
                          {payment.status}
                        </Badge>
                        {isSuspicious && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Suspicious
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {payment.event?.title ?? 'Event'} · {payment.user?.full_name ?? 'User'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Registration: {payment.registration?.entry_code ?? 'Missing'}
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          {payment.razorpay_order_id && (
                            <p>Order ID: {payment.razorpay_order_id}</p>
                          )}
                          {payment.razorpay_payment_id && (
                            <p>Payment ID: {payment.razorpay_payment_id}</p>
                          )}
                          <p>Created: {new Date(payment.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.registration && (
                        <Badge variant="outline" className="text-xs">
                          Reg #{payment.registration.id.slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
