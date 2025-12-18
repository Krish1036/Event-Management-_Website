import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase-server';

const EDGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

async function authorizedPost(path: string, body: unknown) {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${EDGE_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Edge function error', {
      path,
      status: res.status,
      body: text
    });
    throw new Error(text || 'Edge function error');
  }

  return res.json();
}

export async function registerForEvent(eventId: string) {
  return authorizedPost('/register-event', { event_id: eventId });
}

export async function checkIn(opts: { registration_id?: string; entry_code?: string }) {
  return authorizedPost('/check-in', opts);
}
