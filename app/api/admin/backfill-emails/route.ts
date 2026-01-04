import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  // ensure admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  // gather profiles missing email
  const { data: missing } = await admin.from('profiles').select('id').is('email', null);
  const missingIds = (missing ?? []).map((p: any) => p.id);

  if (missingIds.length === 0) {
    return NextResponse.json({ success: true, updated: 0, message: 'No missing emails found' });
  }

  // fetch auth.users for those ids
  const { data: authUsers } = await admin.from('auth.users').select('id,email').in('id', missingIds as string[]);

  const updates: Array<{ id: string; email: string }> = [];
  for (const u of authUsers ?? []) {
    if (u?.id && u?.email) updates.push({ id: u.id, email: u.email });
  }

  let updatedCount = 0;
  for (const up of updates) {
    const { error } = await admin.from('profiles').update({ email: up.email }).eq('id', up.id);
    if (!error) updatedCount += 1;
  }

  // log action
  const { error: logError } = await admin.from('admin_logs').insert({ admin_id: user.id, action: 'BACKFILL_EMAILS', details: { updated: updatedCount } });
  if (logError) console.error('Failed to log admin action:', logError);

  return NextResponse.json({ success: true, updated: updatedCount, attempted: updates.length });
}
