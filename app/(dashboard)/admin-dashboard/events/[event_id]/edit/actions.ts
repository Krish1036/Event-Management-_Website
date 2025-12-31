'use server';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

interface IncomingFormField {
  id?: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'file';
  required: boolean;
  options?: string[];
  disabled?: boolean;
  original_required?: boolean;
}

export async function updateEventAction(params: {
  eventId: string;
  event: {
    title: string;
    description: string;
    location: string;
    event_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    is_registration_open: boolean;
    price: number;
    status: 'approved' | 'draft' | 'cancelled';
    visibility: 'public' | 'hidden';
    assigned_organizer: string | null;
  };
  form_fields: IncomingFormField[];
}) {
  const logPrefix = '[EDIT_EVENT:updateEventAction]';
  console.log(logPrefix, 'start', {
    eventId: params?.eventId,
    hasEvent: !!params?.event,
    formFieldsCount: Array.isArray(params?.form_fields) ? params.form_fields.length : 0
  });

  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  console.log(logPrefix, 'auth.getUser', {
    userId: user?.id ?? null,
    hasUser: !!user
  });

  if (!user) {
    console.log(logPrefix, 'exit:not_authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log(logPrefix, 'profiles.role', {
    userId: user.id,
    role: profile?.role ?? null,
    profileError: profileError?.message ?? null
  });

  if (profileError || !profile || profile.role !== 'admin') {
    console.log(logPrefix, 'exit:not_authorized');
    return { success: false, error: 'Not authorized' };
  }

  const admin = getSupabaseAdminClient();

  const { data: existingEvent, error: existingEventError } = await admin
    .from('events')
    .select('id,event_date,start_time,end_time,capacity,status,assigned_organizer')
    .eq('id', params.eventId)
    .single();

  console.log(logPrefix, 'events.select(existing)', {
    eventId: params.eventId,
    found: !!existingEvent,
    existingEventError: existingEventError?.message ?? null
  });

  if (existingEventError || !existingEvent) {
    console.log(logPrefix, 'exit:event_not_found');
    return { success: false, error: 'Event not found' };
  }

  const normalizedCapacity = Number(params.event.capacity ?? 0);
  console.log(logPrefix, 'validate.capacity', {
    normalizedCapacity
  });
  if (!Number.isFinite(normalizedCapacity) || normalizedCapacity <= 0) {
    console.log(logPrefix, 'exit:invalid_capacity');
    return { success: false, error: 'Capacity must be greater than 0' };
  }

  if (!params.event.event_date || !params.event.start_time || !params.event.end_time) {
    console.log(logPrefix, 'exit:missing_date_time', {
      event_date: !!params.event.event_date,
      start_time: !!params.event.start_time,
      end_time: !!params.event.end_time
    });
    return { success: false, error: 'Missing required date/time fields' };
  }

  const start = new Date(`2000-01-01T${params.event.start_time}`);
  const end = new Date(`2000-01-01T${params.event.end_time}`);
  console.log(logPrefix, 'validate.time_order', {
    start_time: params.event.start_time,
    end_time: params.event.end_time,
    startValid: !isNaN(start.getTime()),
    endValid: !isNaN(end.getTime())
  });
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    console.log(logPrefix, 'exit:invalid_time_range');
    return { success: false, error: 'End time must be after start time' };
  }

  const { count: confirmedCount } = await admin
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', params.eventId)
    .eq('status', 'CONFIRMED');

  console.log(logPrefix, 'registrations.countConfirmed', {
    confirmedCount: confirmedCount ?? 0,
    normalizedCapacity
  });

  if ((confirmedCount ?? 0) > normalizedCapacity) {
    console.log(logPrefix, 'exit:capacity_below_confirmed', {
      confirmedCount: confirmedCount ?? 0,
      normalizedCapacity
    });
    return {
      success: false,
      error: 'Capacity is lower than confirmed registrations',
      code: 'CAPACITY_BELOW_CONFIRMED',
      confirmed_registrations: confirmedCount ?? 0
    };
  }

  const nowIso = new Date().toISOString();
  console.log(logPrefix, 'timestamp', { nowIso });

  const { data: existingFields, error: existingFieldsError } = await admin
    .from('event_form_fields')
    .select('id,original_required,disabled')
    .eq('event_id', params.eventId);

  console.log(logPrefix, 'event_form_fields.select(existing)', {
    existingCount: (existingFields ?? []).length,
    error: existingFieldsError?.message ?? null
  });

  if (existingFieldsError) {
    console.log(logPrefix, 'exit:load_form_fields_failed');
    return { success: false, error: 'Failed to load current form fields' };
  }

  const existingById = new Map<string, any>();
  for (const field of existingFields ?? []) {
    existingById.set(field.id as string, field);
  }

  const incomingById = new Map<string, IncomingFormField>();
  for (const field of params.form_fields ?? []) {
    if (field.id) incomingById.set(field.id, field);
  }

  for (const [id, existing] of existingById.entries()) {
    const incoming = incomingById.get(id);
    if (!incoming) {
      if (!existing.disabled) {
        console.log(logPrefix, 'form_field.disable_removed', { id });
        const { error } = await admin
          .from('event_form_fields')
          .update({ disabled: true, disabled_by: user.id, disabled_at: nowIso })
          .eq('id', id);
        if (error) {
          console.log(logPrefix, 'exit:disable_removed_failed', { id, error: error.message });
          return { success: false, error: 'Failed to disable removed form fields' };
        }
      }
      continue;
    }

    const required = !!incoming.required;
    const disabled = !!incoming.disabled;
    const originalRequired =
      typeof existing.original_required === 'boolean'
        ? existing.original_required
        : typeof incoming.original_required === 'boolean'
          ? incoming.original_required
          : required;

    const isOverridden = originalRequired !== required;

    console.log(logPrefix, 'form_field.update', {
      id,
      required,
      disabled,
      isOverridden
    });

    const { error } = await admin
      .from('event_form_fields')
      .update({
        label: incoming.label,
        field_type: incoming.field_type,
        required,
        options: incoming.options ?? null,
        disabled,
        original_required: originalRequired,
        overridden_by: isOverridden ? user.id : null,
        overridden_at: isOverridden ? nowIso : null
      })
      .eq('id', id);

    if (error) {
      console.log(logPrefix, 'exit:update_form_field_failed', { id, error: error.message });
      return { success: false, error: 'Failed to update form fields' };
    }
  }

  const newFieldsToInsert: any[] = [];
  for (const field of params.form_fields ?? []) {
    if (field.id && existingById.has(field.id)) continue;

    const required = !!field.required;
    const disabled = !!field.disabled;
    const originalRequired =
      typeof field.original_required === 'boolean' ? field.original_required : required;
    const isOverridden = originalRequired !== required;

    newFieldsToInsert.push({
      event_id: params.eventId,
      label: field.label,
      field_type: field.field_type,
      required,
      options: field.options ?? null,
      disabled,
      disabled_by: disabled ? user.id : null,
      disabled_at: disabled ? nowIso : null,
      original_required: originalRequired,
      overridden_by: isOverridden ? user.id : null,
      overridden_at: isOverridden ? nowIso : null
    });
  }

  if (newFieldsToInsert.length > 0) {
    console.log(logPrefix, 'form_field.insert_new', { count: newFieldsToInsert.length });
    const { error } = await admin.from('event_form_fields').insert(newFieldsToInsert);
    if (error) {
      console.log(logPrefix, 'exit:insert_new_fields_failed', { error: error.message });
      return { success: false, error: 'Failed to insert new form fields' };
    }
  }

  const { data: updatedEvent, error: updateError } = await admin
    .from('events')
    .update({
      title: params.event.title,
      description: params.event.description,
      location: params.event.location,
      event_date: params.event.event_date,
      start_time: params.event.start_time,
      end_time: params.event.end_time,
      capacity: normalizedCapacity,
      is_registration_open: !!params.event.is_registration_open,
      price: Number(params.event.price ?? 0),
      status: params.event.status,
      visibility: params.event.visibility,
      assigned_organizer: params.event.assigned_organizer,
      updated_at: nowIso
    })
    .eq('id', params.eventId)
    .select()
    .single();

  console.log(logPrefix, 'events.update', {
    success: !updateError && !!updatedEvent,
    error: updateError?.message ?? null
  });

  if (updateError || !updatedEvent) {
    console.log(logPrefix, 'exit:update_event_failed');
    return { success: false, error: 'Failed to update event' };
  }

  const { error: logError } = await admin.from('admin_logs').insert({
    admin_id: user.id,
    action: 'UPDATE_EVENT',
    details: {
      event_id: params.eventId,
      timestamp: nowIso
    }
  });

  console.log(logPrefix, 'admin_logs.insert', {
    success: !logError,
    error: logError?.message ?? null
  });

  console.log(logPrefix, 'success');

  return { success: true, event: updatedEvent };
}
