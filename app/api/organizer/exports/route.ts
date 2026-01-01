import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { NextRequest } from 'next/server';

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

function generateCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  csvRows.push(headers.map(escapeCSVField).join(','));
  for (const row of data) {
    const values = headers.map((header) => {
      const value = header.split('.').reduce((obj: any, key: string) => obj?.[key], row);
      return escapeCSVField(value);
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

async function getOrganizerEventIds(admin: any, organizerId: string) {
  const { data } = await admin
    .from('events')
    .select('id')
    .or(`created_by.eq.${organizerId},assigned_organizer.eq.${organizerId}`);
  return (data ?? []).map((e: any) => e.id as string);
}

async function exportRegistrations(admin: any, eventIds: string[]) {
  const { data } = await admin
    .from('registrations')
    .select(
      `id,status,entry_code,created_at,event_id,
       user:profiles(id,full_name,email),
       event:events(id,title,event_date,is_paid,price),
       payment:payments(amount,status,razorpay_order_id,razorpay_payment_id)`
    )
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

  const headers = [
    'Registration ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Free / Paid',
    'Event Price',
    'Status',
    'Entry Code',
    'Payment Status',
    'Payment Amount',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At'
  ];

  const csvData = (data ?? []).map((reg: any) => ({
    'Registration ID': reg.id,
    'User Name': reg.user?.full_name || '',
    'User Email': reg.user?.email || '',
    'Event Title': reg.event?.title || '',
    'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
    'Free / Paid': reg.event?.is_paid ? 'Paid' : 'Free',
    'Event Price': reg.event?.price ?? 0,
    Status: reg.status,
    'Entry Code': reg.entry_code,
    'Payment Status': reg.payment?.status ?? '',
    'Payment Amount': reg.payment?.amount ?? '',
    'Razorpay Order ID': reg.payment?.razorpay_order_id ?? '',
    'Razorpay Payment ID': reg.payment?.razorpay_payment_id ?? '',
    'Created At': String(new Date(reg.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportAttendance(admin: any, eventIds: string[]) {
  const { data } = await admin
    .from('attendance')
    .select(
      `id,checked_in_at,
       registration:registrations(id,entry_code,event_id),
       user:profiles(id,full_name,email),
       event:events(id,title,event_date)`
    )
    .order('checked_in_at', { ascending: false });

  const filtered = (data ?? []).filter((row: any) => eventIds.includes(row.registration?.event_id));

  const headers = [
    'Attendance ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Entry Code',
    'Checked In At'
  ];

  const csvData = filtered.map((att: any) => ({
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

async function exportPayments(admin: any, eventIds: string[]) {
  const { data } = await admin
    .from('payments')
    .select(
      `id,amount,status,razorpay_order_id,razorpay_payment_id,created_at,
       registration:registrations(id,event_id,entry_code),
       user:profiles(id,full_name,email),
       event:events(id,title,event_date,is_paid,price)`
    )
    .order('created_at', { ascending: false });

  const filtered = (data ?? []).filter((p: any) => eventIds.includes(p.registration?.event_id));

  const headers = [
    'Payment ID',
    'User Name',
    'User Email',
    'Event Title',
    'Event Date',
    'Free / Paid',
    'Event Price',
    'Amount',
    'Payment Status',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Registration ID',
    'Entry Code',
    'Created At'
  ];

  const csvData = filtered.map((payment: any) => ({
    'Payment ID': payment.id,
    'User Name': payment.user?.full_name || '',
    'User Email': payment.user?.email || '',
    'Event Title': payment.event?.title || '',
    'Event Date': payment.event?.event_date ? String(new Date(payment.event.event_date).toLocaleDateString()) : '',
    'Free / Paid': payment.event?.is_paid ? 'Paid' : 'Free',
    'Event Price': payment.event?.price ?? '',
    Amount: payment.amount,
    'Payment Status': payment.status,
    'Razorpay Order ID': payment.razorpay_order_id || '',
    'Razorpay Payment ID': payment.razorpay_payment_id || '',
    'Registration ID': payment.registration?.id || '',
    'Entry Code': payment.registration?.entry_code || '',
    'Created At': String(new Date(payment.created_at).toLocaleString())
  }));

  return generateCSV(csvData, headers);
}

async function exportEventDetailed(admin: any, organizerId: string, eventId: string) {
  const { data: event } = await admin
    .from('events')
    .select('id,created_by,assigned_organizer')
    .eq('id', eventId)
    .single();

  const allowed = event && (event.created_by === organizerId || event.assigned_organizer === organizerId);
  if (!allowed) {
    return { csv: '', error: 'Forbidden' as const };
  }

  const { data } = await admin
    .from('registrations')
    .select(
      `id,status,entry_code,created_at,event_id,
       user:profiles(id,full_name,email),
       event:events(id,title,event_date,is_paid,price),
       payment:payments(amount,status,razorpay_order_id,razorpay_payment_id),
       responses:registration_responses(
        value,
        field:event_form_fields(label,field_type,required)
       )`
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  const registrations = data ?? [];

  const fieldLabelSet = new Set<string>();
  for (const reg of registrations) {
    for (const resp of reg.responses ?? []) {
      const label = resp.field?.label as string | undefined;
      if (label) fieldLabelSet.add(label);
    }
  }

  const fieldLabels = Array.from(fieldLabelSet).sort();

  const baseHeaders = [
    'Registration ID',
    'User Name',
    'User Email',
    'Event ID',
    'Event Title',
    'Event Date',
    'Free / Paid',
    'Event Price',
    'Status',
    'Entry Code',
    'Payment Status',
    'Payment Amount',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At'
  ];

  const headers = [...baseHeaders, ...fieldLabels];

  const rows: any[] = [];

  for (const reg of registrations) {
    const row: any = {
      'Registration ID': reg.id,
      'User Name': reg.user?.full_name || '',
      'User Email': reg.user?.email || '',
      'Event ID': reg.event?.id || reg.event_id,
      'Event Title': reg.event?.title || '',
      'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
      'Free / Paid': reg.event?.is_paid ? 'Paid' : 'Free',
      'Event Price': reg.event?.price ?? '',
      Status: reg.status,
      'Entry Code': reg.entry_code,
      'Payment Status': reg.payment?.status ?? '',
      'Payment Amount': reg.payment?.amount ?? '',
      'Razorpay Order ID': reg.payment?.razorpay_order_id ?? '',
      'Razorpay Payment ID': reg.payment?.razorpay_payment_id ?? '',
      'Created At': String(new Date(reg.created_at).toLocaleString())
    };

    for (const label of fieldLabels) row[label] = '';

    const responses = reg.responses ?? [];
    const valueByLabel: Record<string, string> = {};

    for (const resp of responses) {
      const label = resp.field?.label as string | undefined;
      if (!label) continue;
      const value = resp.value ?? '';
      valueByLabel[label] = valueByLabel[label] ? `${valueByLabel[label]}; ${value}` : value;
    }

    for (const label of Object.keys(valueByLabel)) {
      if (fieldLabelSet.has(label)) row[label] = valueByLabel[label];
    }

    rows.push(row);
  }

  return { csv: generateCSV(rows, headers) };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const exportType = formData.get('exportType') as string | null;
  const eventId = formData.get('eventId') as string | null;

  if (!exportType) {
    return new Response('Missing exportType', { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'organizer') {
    return new Response('Forbidden', { status: 403 });
  }

  const eventIds = await getOrganizerEventIds(admin, user.id);

  let csvData = '';
  let filename = '';

  switch (exportType) {
    case 'registrations':
      csvData = await exportRegistrations(admin, eventIds);
      filename = `organizer-registrations-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'attendance':
      csvData = await exportAttendance(admin, eventIds);
      filename = `organizer-attendance-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'payments':
      csvData = await exportPayments(admin, eventIds);
      filename = `organizer-payments-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'event_detailed':
      if (!eventId) return new Response('Missing eventId', { status: 400 });
      {
        const result = await exportEventDetailed(admin, user.id, eventId);
        if ((result as any).error) {
          return new Response('Forbidden', { status: 403 });
        }
        csvData = (result as any).csv;
        filename = `organizer-event-${eventId}-detailed-${new Date().toISOString().split('T')[0]}.csv`;
      }
      break;
    default:
      return new Response('Invalid exportType', { status: 400 });
  }

  await admin.from('organizer_logs').insert({
    organizer_id: user.id,
    action: 'EXPORT_DATA',
    details: {
      export_type: exportType,
      filename,
      record_count: csvData.split('\n').length - 1
    }
  });

  return new Response(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
