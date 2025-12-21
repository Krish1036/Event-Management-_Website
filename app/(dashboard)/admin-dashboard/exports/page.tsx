import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

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

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

function generateCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.map(escapeCSVField).join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = header.split('.').reduce((obj, key) => obj?.[key], row);
      return escapeCSVField(value);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

async function exportRegistrations() {
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('registrations')
    .select(`
      id,status,entry_code,created_at,
      user:profiles(id,full_name,email),
      event:events(id,title,event_date,is_paid,price)
    `)
    .order('created_at', { ascending: false });

  const headers = [
    'Registration ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Event Price',
    'Status',
    'Entry Code',
    'Created At'
  ];

  const csvData = (data ?? []).map((reg: any) => ({
    'Registration ID': reg.id,
    'User Name': reg.user?.full_name || '',
    'User Email': reg.user?.email || '',
    'Event Title': reg.event?.title || '',
    'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
    'Event Price': reg.event?.price || 0,
    'Status': reg.status,
    'Entry Code': reg.entry_code,
    'Created At': String(new Date(reg.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportAttendance() {
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('attendance')
    .select(`
      id,checked_in_at,
      registration:registrations(id,entry_code),
      user:profiles(id,full_name,email),
      event:events(id,title,event_date)
    `)
    .order('checked_in_at', { ascending: false });

  const headers = [
    'Attendance ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Entry Code',
    'Checked In At'
  ];

  const csvData = (data ?? []).map((att: any) => ({
    'Attendance ID': att.id,
    'User Name': att.user?.full_name || '',
    'User Email': att.user?.email || '',
    'Event Title': att.event?.title || '',
    'Event Date': att.event?.event_date ? String(new Date(att.event.event_date).toLocaleDateString()) : '',
    'Entry Code': att.registration?.entry_code || '',
    'Checked In At': String(new Date(att.checked_in_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportManualRegistrations() {
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('registrations')
    .select(`
      id,status,entry_code,created_at,
      user:profiles(id,full_name,email),
      event:events(id,title,event_date)
    `)
    .like('entry_code', 'MANUAL-%')
    .order('created_at', { ascending: false });

  const headers = [
    'Registration ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Status',
    'Entry Code',
    'Created At'
  ];

  const csvData = (data ?? []).map((reg: any) => ({
    'Registration ID': reg.id,
    'User Name': reg.user?.full_name || '',
    'User Email': reg.user?.email || '',
    'Event Title': reg.event?.title || '',
    'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
    'Status': reg.status,
    'Entry Code': reg.entry_code,
    'Created At': String(new Date(reg.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportPayments() {
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('payments')
    .select(`
      id,amount,status,razorpay_order_id,razorpay_payment_id,created_at,
      user:profiles(id,full_name,email),
      event:events(id,title,event_date)
    `)
    .order('created_at', { ascending: false });

  const headers = [
    'Payment ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Amount',
    'Status',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At'
  ];

  const csvData = (data ?? []).map((payment: any) => ({
    'Payment ID': payment.id,
    'User Name': payment.user?.full_name || '',
    'User Email': payment.user?.email || '',
    'Event Title': payment.event?.title || '',
    'Event Date': payment.event?.event_date ? String(new Date(payment.event.event_date).toLocaleDateString()) : '',
    'Amount': payment.amount,
    'Status': payment.status,
    'Razorpay Order ID': payment.razorpay_order_id || '',
    'Razorpay Payment ID': payment.razorpay_payment_id || '',
    'Created At': String(new Date(payment.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportUsers() {
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,email,role,created_at')
    .order('created_at', { ascending: false });

  const headers = [
    'User ID',
    'Full Name',
    'Email',
    'Role',
    'Created At'
  ];

  const csvData = (data ?? []).map((user: any) => ({
    'User ID': user.id,
    'Full Name': user.full_name || '',
    'Email': user.email,
    'Role': user.role,
    'Created At': String(new Date(user.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}



export default async function AdminExportsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Exports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Export data as CSV files compatible with Excel. All exports are logged.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <form action="/api/admin/exports" method="post" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <input type="hidden" name="exportType" value="registrations" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Registrations</h2>
            <p className="text-xs text-slate-400">
              Export all registrations with user and event details.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
            >
              Export CSV
            </button>
          </div>
        </form>

        <form action="/api/admin/exports" method="post" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <input type="hidden" name="exportType" value="attendance" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Attendance</h2>
            <p className="text-xs text-slate-400">
              Export all attendance records with check-in times.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
            >
              Export CSV
            </button>
          </div>
        </form>

        <form action="/api/admin/exports" method="post" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <input type="hidden" name="exportType" value="manual_registrations" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Manual Registrations</h2>
            <p className="text-xs text-slate-400">
              Export only manually created registrations.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
            >
              Export CSV
            </button>
          </div>
        </form>

        <form action="/api/admin/exports" method="post" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <input type="hidden" name="exportType" value="payments" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Payments</h2>
            <p className="text-xs text-slate-400">
              Export all payment records with Razorpay details.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
            >
              Export CSV
            </button>
          </div>
        </form>

        <form action="/api/admin/exports" method="post" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <input type="hidden" name="exportType" value="users" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Users</h2>
            <p className="text-xs text-slate-400">
              Export all user profiles with roles.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600"
            >
              Export CSV
            </button>
          </div>
        </form>
      </div>

      {/* Info section */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-2">Export Information:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>All exports are in CSV format, compatible with Microsoft Excel</li>
          <li>Files include proper headers and formatted data</li>
          <li>Special characters are properly escaped for Excel compatibility</li>
          <li>Exports are logged in audit logs for compliance</li>
          <li>Filenames include date: {`export-type-YYYY-MM-DD.csv`}</li>
          <li>Filenames include date: {`export-type-YYYY-MM-DD.csv`}</li>
        </ul>
      </div>
    </div>
  );
}
