import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Users, Calendar, DollarSign, Settings, Wrench, Plus } from 'lucide-react';

const GANPAT_INSTITUTES = [
  "U. V. Patel College of Engineering",
  "Institute of Computer Technology",
  "Institute of Technology",
  "B. S. Patel Polytechnic",
  "Institute of Pharmacy",
  "Shree S. K. Patel College of Pharmaceutical Education & Research",
  "V. M. Patel College of Management Studies",
  "Acharya Motibhai Patel Institute of Computer Studies",
  "Mehsana Urban Institute of Sciences (MUIS)",
  "Department of Computer Science",
  "Department of Social Work",
  "Institute of Architecture",
  "Institute of Design & Architecture",
  "Kumud & Bhupesh Institute of Nursing",
  "Institute of Physiotherapy",
  "Kantaben Kashiram Institute of Agricultural Sciences & Research (KKIASR)",
  "Centre for Applied Sciences & Technology",
  "Japan–India Institute for Manufacturing (JIM)",
  "Centre for Advanced Research Studies (CARS)"
];

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

async function getSuspiciousPayments() {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('payments')
    .select(
      `id,amount,status,razorpay_order_id,razorpay_payment_id,created_at,
       registration:registrations(id,status,entry_code,event_id,user_id),
       event:events(id,title,is_paid,price),
       user:profiles(id,full_name,email)`
    )
    .eq('status', 'SUCCESS')
    .order('created_at', { ascending: false });

  return (data ?? []).filter(
    (p: any) => !p.registration || p.registration.length === 0 || p.registration[0]?.status !== 'CONFIRMED'
  );
}

async function handleManualFix(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const paymentId = formData.get('paymentId') as string | null;
  const userEmail = formData.get('userEmail') as string | null;
  const eventId = formData.get('eventId') as string | null;
  const userName = formData.get('userName') as string | null;
  const offlineEventId = formData.get('offlineEventId') as string | null;
  const offlineUserName = formData.get('offlineUserName') as string | null;
  const offlineUserEmail = formData.get('offlineUserEmail') as string | null;
  const offlinePhoneNumber = formData.get('offlinePhoneNumber') as string | null;
  const offlineUniversityType = formData.get('offlineUniversityType') as string | null;
  const offlineGanpatInstitute = formData.get('offlineGanpatInstitute') as string | null;
  const offlineOtherUniversity = formData.get('offlineOtherUniversity') as string | null;

  let redirectStatus: string | null = null;

  if (!action) {
    redirect('/admin-dashboard/manual-fixes');
  }

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

  if (action === 'fix_payment_success_but_registration_missing' && paymentId) {
    // Fix payment success but registration missing
    const { data: payment } = await supabase
      .from('payments')
      .select('id,user_id,event_id,amount,razorpay_payment_id')
      .eq('id', paymentId)
      .single();

    if (payment && payment.user_id && payment.event_id) {
      // Check if registration already exists
      const { data: existingReg } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', payment.user_id)
        .eq('event_id', payment.event_id)
        .single();

      if (!existingReg) {
        // Generate entry code
        const entryCode = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create registration with payment reference
        const { data: newReg } = await supabase
          .from('registrations')
          .insert({
            user_id: payment.user_id,
            event_id: payment.event_id,
            status: 'CONFIRMED',
            entry_code: entryCode
          })
          .select('id')
          .single();

        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'MANUAL_FIX_PAYMENT_SUCCESS_BUT_REG_MISSING',
          details: {
            payment_id: paymentId,
            user_id: payment.user_id,
            event_id: payment.event_id,
            amount: payment.amount,
            razorpay_payment_id: payment.razorpay_payment_id,
            registration_id: newReg?.id,
            entry_code: entryCode
          }
        });

        redirectStatus = 'payment_fix_success';
      }
    }
  } else if (action === 'add_user_manually' && userEmail && eventId) {
    // Add user manually (internet failed case)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('email', userEmail)
      .single();

    if (userProfile) {
      // Check if registration already exists
      const { data: existingReg } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', userProfile.id)
        .eq('event_id', eventId)
        .single();

      if (!existingReg) {
        // Generate entry code
        const entryCode = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create registration
        const { data: newReg } = await supabase
          .from('registrations')
          .insert({
            user_id: userProfile.id,
            event_id: eventId,
            status: 'CONFIRMED',
            entry_code: entryCode
          })
          .select('id')
          .single();

        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'MANUAL_ADD_USER_INTERNET_FAILED',
          details: {
            user_email: userEmail,
            user_id: userProfile.id,
            event_id: eventId,
            registration_id: newReg?.id,
            entry_code: entryCode
          }
        });

        redirectStatus = 'manual_add_success';
      }
    }
  } else if (action === 'add_offline_registration' && offlineEventId && offlineUserName && offlineUserEmail && offlinePhoneNumber && offlineUniversityType) {
    // Add offline registration
    // First create user profile if doesn't exist
    let userProfile = null;
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('email', offlineUserEmail)
      .single();

    // Determine university value
    let universityValue = '';
    if (offlineUniversityType === 'Ganpat University' && offlineGanpatInstitute) {
      universityValue = `Ganpat University - ${offlineGanpatInstitute}`;
    } else if (offlineUniversityType === 'Other' && offlineOtherUniversity) {
      universityValue = offlineOtherUniversity;
    }

    if (!existingUser) {
      // Create new user profile
      const { data: newUser } = await supabase
        .from('profiles')
        .insert({
          email: offlineUserEmail,
          full_name: offlineUserName,
          phone_number: offlinePhoneNumber,
          university: universityValue,
          role: 'student'
        })
        .select('id,full_name')
        .single();
      userProfile = newUser;
    } else {
      userProfile = existingUser;
    }

    if (userProfile) {
      // Check if registration already exists
      const { data: existingReg } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', userProfile.id)
        .eq('event_id', offlineEventId)
        .single();

      if (!existingReg) {
        // Generate entry code
        const entryCode = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create registration
        const { data: newReg } = await supabase
          .from('registrations')
          .insert({
            user_id: userProfile.id,
            event_id: offlineEventId,
            status: 'CONFIRMED',
            entry_code: entryCode
          })
          .select('id')
          .single();

        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'MANUAL_OFFLINE_REGISTRATION',
          details: {
            user_email: offlineUserEmail,
            user_name: offlineUserName,
            phone_number: offlinePhoneNumber,
            university: universityValue,
            user_id: userProfile.id,
            event_id: offlineEventId,
            registration_id: newReg?.id,
            entry_code: entryCode
          }
        });

        redirectStatus = 'offline_add_success';
      }
    }
  }

  const basePath = '/admin-dashboard/manual-fixes';
  if (redirectStatus) {
    redirect(`${basePath}?status=${encodeURIComponent(redirectStatus)}`);
  }

  redirect(basePath);
}

async function getEvents() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('events')
    .select('id,title,event_date')
    .eq('status', 'approved')
    .order('event_date', { ascending: true });
  return data ?? [];
}

export default async function AdminManualFixesPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await requireAdmin();
  const suspiciousPayments = await getSuspiciousPayments();
  const events = await getEvents();

  const statusParam = typeof searchParams?.status === 'string' ? searchParams.status : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Fixes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fix payment-success-but-registration-missing issues, add users manually, and generate entry codes.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {statusParam === 'manual_add_success' && (
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-green-800 font-medium">User was registered to the selected event successfully.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {statusParam === 'offline_add_success' && (
        <Card className="bg-amber-50 border border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-amber-800 font-medium">Offline registration was created successfully.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious payments section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Payments
          </CardTitle>
          <CardDescription>
            Payment success but registration missing issues that need manual fixing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspiciousPayments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No suspicious payments found</h3>
              <p className="text-gray-500">All payments have proper registrations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suspiciousPayments.map((payment: any) => (
                <Card 
                  key={payment.id}
                  className="border-red-200 bg-red-50 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              ₹{payment.amount}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {payment.event?.title ?? 'Event'} · {payment.user?.full_name ?? 'Unknown'} ({payment.user?.email})
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              SUCCESS
                            </Badge>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Missing Registration
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created: {new Date(payment.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Payment ID: {payment.razorpay_payment_id ?? 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <form action={handleManualFix}>
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <Button
                            type="submit"
                            name="action"
                            value="fix_payment_success_but_registration_missing"
                            size="sm"
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Fix Registration
                          </Button>
                          <script
                            dangerouslySetInnerHTML={{
                              __html: `
                                document.querySelector('[name="action"][value="fix_payment_success_but_registration_missing"]').addEventListener('click', function(e) {
                                  if (!confirm('Fix registration for ${payment.user?.full_name || payment.user?.email}?\\n\\nThis will create a manual registration and attach payment reference.')) {
                                    e.preventDefault();
                                  }
                                });
                              `,
                            }}
                          />
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual user addition section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add User Manually (Internet Failed)
          </CardTitle>
          <CardDescription>
            Create manual registration for users who paid but internet failed during registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleManualFix} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <Input
                  type="email"
                  id="userEmail"
                  name="userEmail"
                  required
                  placeholder="user@example.com"
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
                  Event
                </label>
                <Select name="eventId" required>
                  <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                    <SelectValue placeholder="Select event" className="text-black" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    <SelectItem value="all" className="text-black hover:bg-gray-100">All Events</SelectItem>
                    {events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                        {event.title} ({new Date(event.event_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              name="action"
              value="add_user_manually"
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User Manually
            </Button>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  document.querySelector('[name="action"][value="add_user_manually"]').addEventListener('click', function(e) {
                    if (!confirm('Add user manually?\\n\\nThis will create a manual registration for a user who paid but internet failed.')) {
                      e.preventDefault();
                    }
                  });
                `,
              }}
            />
          </form>
        </CardContent>
      </Card>

      {/* Offline registration section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Offline Registration
          </CardTitle>
          <CardDescription>
            Create new user profile and manual registration for offline participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleManualFix} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="offlineUserName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  id="offlineUserName"
                  name="offlineUserName"
                  required
                  placeholder="John Doe"
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="offlineUserEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  id="offlineUserEmail"
                  name="offlineUserEmail"
                  required
                  placeholder="user@example.com"
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="offlinePhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  id="offlinePhoneNumber"
                  name="offlinePhoneNumber"
                  required
                  placeholder="Enter phone number"
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label htmlFor="offlineUniversityType" className="block text-sm font-medium text-gray-700 mb-2">
                  University
                </label>
                <Select name="offlineUniversityType" required>
                  <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                    <SelectValue placeholder="Select University" className="text-black" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    <SelectItem value="Ganpat University" className="text-black hover:bg-gray-100">Ganpat University</SelectItem>
                    <SelectItem value="Other" className="text-black hover:bg-gray-100">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="offlineGanpatInstitute" className="block text-sm font-medium text-gray-700 mb-2">
                  Ganpat Institute (if applicable)
                </label>
                <Select name="offlineGanpatInstitute">
                  <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                    <SelectValue placeholder="Select Institute" className="text-black" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {GANPAT_INSTITUTES.map((institute) => (
                      <SelectItem key={institute} value={institute} className="text-black hover:bg-gray-100">
                        {institute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="offlineOtherUniversity" className="block text-sm font-medium text-gray-700 mb-2">
                  Other University Name (if applicable)
                </label>
                <Input
                  type="text"
                  id="offlineOtherUniversity"
                  name="offlineOtherUniversity"
                  placeholder="Enter university name"
                  minLength={3}
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="offlineEventId" className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <Select name="offlineEventId" required>
                <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="Select event" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Events</SelectItem>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                      {event.title} ({new Date(event.event_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              type="submit"
              name="action"
              value="add_offline_registration"
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Offline Registration
            </Button>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  document.querySelector('[name="action"][value="add_offline_registration"]').addEventListener('click', function(e) {
                    if (!confirm('Add offline registration?\\n\\nThis will create a new user profile and manual registration for offline participants.')) {
                      e.preventDefault();
                    }
                  });
                `,
              }}
            />
          </form>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Manual Fix Guidelines:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>Only use manual fixes for verified edge cases (e.g., payment success but registration failed)</li>
                <li>All manual fixes are logged in admin logs with full details</li>
                <li>Manual registrations are marked with "MANUAL-" prefix in entry codes</li>
                <li>Verify user identity and payment status before creating manual registrations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
