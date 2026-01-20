import { getSupabaseServerClient } from '@/lib/supabase-server';
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
    const values = headers.map(header => {
      const value = header.split('.').reduce((obj: any, key: string) => obj?.[key], row);
      return escapeCSVField(value);
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

async function exportRegistrations(supabase: any) {
  // Get all payments first (like the working exportPayments function)
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      registration:registrations(
        id,
        status,
        entry_code,
        created_at,
        user:profiles(id,full_name,email,phone_number,university),
        event:events(id,title,event_date,is_paid,price,visibility,pricing_type,pricing_dropdown_label,assigned_organizer)
      )
    `)
    .order('created_at', { ascending: false });

  // Get all registrations without payments (free events)
  const { data: freeRegistrations } = await supabase
    .from('registrations')
    .select(`
      id,status,entry_code,created_at,
      user:profiles(id,full_name,email,phone_number,university),
      event:events(id,title,event_date,is_paid,price,visibility,pricing_type,pricing_dropdown_label,assigned_organizer)
    `)
    .is('event.is_paid', false)
    .order('created_at', { ascending: false });

  // Combine paid and free registrations
  const allRegistrations: any[] = [];
  
  // Add paid registrations from payments data
  (payments ?? []).forEach((payment: any) => {
    if (payment.registration) {
      allRegistrations.push({
        ...payment.registration,
        payment: {
          status: payment.status,
          amount: payment.amount,
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id
        }
      });
    }
  });
  
  // Add free registrations
  (freeRegistrations ?? []).forEach((reg: any) => {
    allRegistrations.push({
      ...reg,
      payment: {
        status: 'FREE',
        amount: 0,
        razorpay_order_id: '',
        razorpay_payment_id: ''
      }
    });
  });

  // Sort by created_at
  allRegistrations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const headers = [
    'Registration ID',
    'User Name',
    'User Email',
    'User Phone',
    'User University',
    'Event Title',
    'Event Date',
    'Free / Paid',
    'Event Price',
    'Event Visibility',
    'Event Pricing Type',
    'Event Pricing Label',
    'Assigned Organizer',
    'Status',
    'Entry Code',
    'Payment Status',
    'Payment Amount',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At'
  ];

  const csvData = allRegistrations.map((reg: any) => ({
    'Registration ID': reg.id,
    'User Name': reg.user?.full_name || '',
    'User Email': reg.user?.email || '',
    'User Phone': reg.user?.phone_number || '',
    'User University': reg.user?.university || '',
    'Event Title': reg.event?.title || '',
    'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
    'Free / Paid': reg.event?.is_paid ? 'Paid' : 'Free',
    'Event Price': reg.event?.price || 0,
    'Event Visibility': reg.event?.visibility || '',
    'Event Pricing Type': reg.event?.pricing_type || '',
    'Event Pricing Label': reg.event?.pricing_dropdown_label || '',
    'Assigned Organizer': reg.event?.assigned_organizer || '',
    Status: reg.status,
    'Entry Code': reg.entry_code,
    'Payment Status': reg.payment?.status ?? '',
    'Payment Amount': reg.payment?.amount ?? '',
    'Razorpay Order ID': reg.payment?.razorpay_order_id ?? '',
    'Razorpay Payment ID': reg.payment?.razorpay_payment_id ?? '',
    'Created At': String(new Date(reg.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }))
  }));

  return generateCSV(csvData, headers);
}

async function exportEventDetailed(supabase: any, eventId: string) {
  // Get all payments for this event (like the working exportPayments function)
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      registration:registrations(
        id,
        status,
        entry_code,
        created_at,
        event_id,
        user:profiles(id,full_name,email,phone_number,university),
        event:events(id,title,event_date,is_paid,price,visibility,pricing_type,pricing_dropdown_label,assigned_organizer),
        responses:registration_responses(
          value,
          field:event_form_fields(label,field_type,required)
        )
      )
    `)
    .eq('registration.event_id', eventId)
    .order('created_at', { ascending: false });

  // Get all registrations without payments for this event (free events)
  const { data: freeRegistrations } = await supabase
    .from('registrations')
    .select(`
      id,status,entry_code,created_at,event_id,
      user:profiles(id,full_name,email,phone_number,university),
      event:events(id,title,event_date,is_paid,price,visibility,pricing_type,pricing_dropdown_label,assigned_organizer),
      responses:registration_responses(
        value,
        field:event_form_fields(label,field_type,required)
      )
    `)
    .eq('event_id', eventId)
    .is('event.is_paid', false)
    .order('created_at', { ascending: false });

  // Combine paid and free registrations
  const allRegistrations: any[] = [];
  
  // Add paid registrations from payments data
  (payments ?? []).forEach((payment: any) => {
    if (payment.registration) {
      allRegistrations.push({
        ...payment.registration,
        payment: {
          status: payment.status,
          amount: payment.amount,
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id
        }
      });
    }
  });
  
  // Add free registrations
  (freeRegistrations ?? []).forEach((reg: any) => {
    allRegistrations.push({
      ...reg,
      payment: {
        status: 'FREE',
        amount: 0,
        razorpay_order_id: '',
        razorpay_payment_id: ''
      }
    });
  });

  // Sort by created_at
  allRegistrations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const registrations = allRegistrations;

  // Collect all distinct field labels for this event so we can make one column per field
  const fieldLabelSet = new Set<string>();
  for (const reg of registrations) {
    for (const resp of reg.responses ?? []) {
      const label = resp.field?.label as string | undefined;
      if (label) {
        fieldLabelSet.add(label);
      }
    }
  }

  const fieldLabels = Array.from(fieldLabelSet).sort();

  const baseHeaders = [
    'Registration ID',
    'User Name',
    'User Email',
    'User Phone',
    'User University',
    'Event ID',
    'Event Title',
    'Event Date',
    'Free / Paid',
    'Event Price',
    'Event Visibility',
    'Event Pricing Type',
    'Event Pricing Label',
    'Assigned Organizer',
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
      'User Phone': reg.user?.phone_number || '',
      'User University': reg.user?.university || '',
      'Event ID': reg.event?.id || reg.event_id,
      'Event Title': reg.event?.title || '',
      'Event Date': reg.event?.event_date
        ? String(new Date(reg.event.event_date).toLocaleDateString())
        : '',
      'Free / Paid': reg.event?.is_paid ? 'Paid' : 'Free',
      'Event Price': reg.event?.price ?? '',
      'Event Visibility': reg.event?.visibility || '',
      'Event Pricing Type': reg.event?.pricing_type || '',
      'Event Pricing Label': reg.event?.pricing_dropdown_label || '',
      'Assigned Organizer': reg.event?.assigned_organizer || '',
      Status: reg.status,
      'Entry Code': reg.entry_code,
      'Payment Status': reg.payment?.status ?? '',
      'Payment Amount': reg.payment?.amount ?? '',
      'Razorpay Order ID': reg.payment?.razorpay_order_id ?? '',
      'Razorpay Payment ID': reg.payment?.razorpay_payment_id ?? '',
      'Created At': String(new Date(reg.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }))
    };

    // Initialise all custom field columns as empty strings
    for (const label of fieldLabels) {
      row[label] = '';
    }

    // Fill in responses: if multiple responses for same label, join them with '; '
    const responses = reg.responses ?? [];
    const valueByLabel: Record<string, string> = {};

    for (const resp of responses) {
      const label = resp.field?.label as string | undefined;
      if (!label) continue;

      const value = resp.value ?? '';
      if (valueByLabel[label]) {
        valueByLabel[label] = `${valueByLabel[label]}; ${value}`;
      } else {
        valueByLabel[label] = value;
      }
    }

    for (const label of Object.keys(valueByLabel)) {
      if (fieldLabelSet.has(label)) {
        row[label] = valueByLabel[label];
      }
    }

    rows.push(row);
  }

  return generateCSV(rows, headers);
}

async function exportAttendance(supabase: any) {
  // Query attendance directly (like working payments export)
  const { data } = await supabase
    .from('attendance')
    .select(`
      id,
      checked_in_at,
      registration:registrations(
        id,
        entry_code,
        event_id,
        user:profiles(id,full_name,email,phone_number,university),
        event:events(id,title,event_date,visibility,assigned_organizer)
      )
    `)
    .order('checked_in_at', { ascending: false });

  const headers = [
    'Attendance ID',
    'User Name',
    'User Email',
    'User Phone',
    'User University',
    'Event Title',
    'Event Date',
    'Event Visibility',
    'Assigned Organizer',
    'Entry Code',
    'Checked In At'
  ];

  const csvData = (data ?? []).map((att: any) => ({
    'Attendance ID': att.id,
    'User Name': att.registration?.user?.full_name || '',
    'User Email': att.registration?.user?.email || '',
    'User Phone': att.registration?.user?.phone_number || '',
    'User University': att.registration?.user?.university || '',
    'Event Title': att.registration?.event?.title || '',
    'Event Date': att.registration?.event?.event_date ? String(new Date(att.registration.event.event_date).toLocaleDateString()) : '',
    'Event Visibility': att.registration?.event?.visibility || '',
    'Assigned Organizer': att.registration?.event?.assigned_organizer || '',
    'Entry Code': att.registration?.entry_code || '',
    'Checked In At': String(new Date(att.checked_in_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }))
  }));

  return generateCSV(csvData, headers);
}

async function exportManualRegistrations(supabase: any) {
  const { data } = await supabase
    .from('registrations')
    .select(`
      id,status,entry_code,created_at,
      user:profiles(id,full_name,email,phone_number,university),
      event:events(id,title,event_date,visibility,assigned_organizer)
    `)
    .like('entry_code', 'MANUAL-%')
    .order('created_at', { ascending: false });

  const headers = [
    'Registration ID',
    'User Name',
    'User Email',
    'User Phone',
    'User University',
    'Event Title',
    'Event Date',
    'Event Visibility',
    'Assigned Organizer',
    'Status',
    'Entry Code',
    'Created At'
  ];

  const csvData = (data ?? []).map((reg: any) => ({
    'Registration ID': reg.id,
    'User Name': reg.user?.full_name || '',
    'User Email': reg.user?.email || '',
    'User Phone': reg.user?.phone_number || '',
    'User University': reg.user?.university || '',
    'Event Title': reg.event?.title || '',
    'Event Date': reg.event?.event_date ? String(new Date(reg.event.event_date).toLocaleDateString()) : '',
    'Event Visibility': reg.event?.visibility || '',
    'Assigned Organizer': reg.event?.assigned_organizer || '',
    'Status': reg.status,
    'Entry Code': reg.entry_code,
    'Created At': String(new Date(reg.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }))
  }));

  return generateCSV(csvData, headers);
}

async function exportPayments(supabase: any) {
  const { data } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      registration:registrations(
        user:profiles(id,full_name,email,phone_number,university),
        event:events(id,title,event_date,visibility,pricing_type,pricing_dropdown_label,assigned_organizer)
      )
    `)
    .order('created_at', { ascending: false });

  const headers = [
    'Payment ID',
    'User Name',
    'User Email',
    'User Phone',
    'User University',
    'Event Title',
    'Event Date',
    'Event Visibility',
    'Event Pricing Type',
    'Event Pricing Label',
    'Assigned Organizer',
    'Amount',
    'Status',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At'
  ];

  const csvData = (data ?? []).map((payment: any) => ({
    'Payment ID': payment.id,
    'User Name': payment.registration?.user?.full_name || '',
    'User Email': payment.registration?.user?.email || '',
    'User Phone': payment.registration?.user?.phone_number || '',
    'User University': payment.registration?.user?.university || '',
    'Event Title': payment.registration?.event?.title || '',
    'Event Date': payment.registration?.event?.event_date ? String(new Date(payment.registration.event.event_date).toLocaleDateString()) : '',
    'Event Visibility': payment.registration?.event?.visibility || '',
    'Event Pricing Type': payment.registration?.event?.pricing_type || '',
    'Event Pricing Label': payment.registration?.event?.pricing_dropdown_label || '',
    'Assigned Organizer': payment.registration?.event?.assigned_organizer || '',
    'Amount': payment.amount,
    'Status': payment.status,
    'Razorpay Order ID': payment.razorpay_order_id || '',
    'Razorpay Payment ID': payment.razorpay_payment_id || '',
    'Created At': String(new Date(payment.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }))
  }));

  return generateCSV(csvData, headers);
}

async function exportUsers(supabase: any) {
  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,email,phone_number,university,role,created_at')
    .order('created_at', { ascending: false });

  const headers = [
    'User ID',
    'Full Name',
    'Email',
    'Phone Number',
    'University',
    'Role',
    'Created At'
  ];

  const csvData = (data ?? []).map((user: any) => ({
    'User ID': user.id,
    'Full Name': user.full_name || '',
    'Email': user.email,
    'Phone Number': user.phone_number || '',
    'University': user.university || '',
    'Role': user.role,
    'Created At': String(new Date(user.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }))
  }));

  return generateCSV(csvData, headers);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const exportType = formData.get('exportType') as string | null;
  const eventId = formData.get('eventId') as string | null;

  if (!exportType) {
    return new Response('Missing exportType', { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  let csvData = '';
  let filename = '';

  switch (exportType) {
    case 'registrations':
      csvData = await exportRegistrations(supabase);
      filename = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'attendance':
      csvData = await exportAttendance(supabase);
      filename = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'manual_registrations':
      csvData = await exportManualRegistrations(supabase);
      filename = `manual-registrations-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'payments':
      csvData = await exportPayments(supabase);
      filename = `payments-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'users':
      csvData = await exportUsers(supabase);
      filename = `users-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'event_detailed':
      if (!eventId) {
        return new Response('Missing eventId', { status: 400 });
      }
      csvData = await exportEventDetailed(supabase, eventId);
      filename = `event-${eventId}-detailed-${new Date().toISOString().split('T')[0]}.csv`;
      break;
  }

  // Log the export action
  await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action: 'EXPORT_DATA',
    details: {
      export_type: exportType,
      filename,
      record_count: csvData.split('\n').length - 1 // Subtract header row
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
