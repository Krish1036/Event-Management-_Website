import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  // Dev-only helper to reproduce the registrations query used by the admin page
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not allowed', { status: 403 });
  }

  const token = req.headers.get('x-debug-token');
  if (token !== 'dev') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();

  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('registrations')
      .select(
        `id,status,entry_code,created_at,event_id,user_id,
         event:events(id,title,is_paid,price),
         user:profiles(id,full_name,email)`
      )
      .order('created_at', { ascending: false });

    if (q.length > 0) {
      const orFilter = `entry_code.ilike.%${q}%,profiles.full_name.ilike.%${q}%,profiles.email.ilike.%${q}%`;
      query = query.or(orFilter) as any;
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
