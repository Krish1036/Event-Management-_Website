import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'organizer') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await supabase.from('organizer_logs').insert({
      organizer_id: user.id,
      action: 'ORGANIZER_LOGOUT',
      details: {
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    });

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('Logout error:', signOutError);
      return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    console.error('Organizer logout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
