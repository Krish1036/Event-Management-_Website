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

async function getUsersWithStats() {
  const supabase = getSupabaseServerClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('id,full_name,email,role,created_at,disabled')
    .order('created_at', { ascending: false });

  const { data: events } = await supabase
    .from('events')
    .select('id,created_by');

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id,user_id');

  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      id,
      registration_id,
      registrations!inner(
        user_id
      )
    `);

  const userStats = new Map<string, { eventsCreated: number; registrationsCount: number; attendanceCount: number }>();

  for (const user of users ?? []) {
    userStats.set(user.id as string, {
      eventsCreated: 0,
      registrationsCount: 0,
      attendanceCount: 0
    });
  }

  for (const event of events ?? []) {
    const stats = userStats.get(event.created_by as string);
    if (stats) stats.eventsCreated += 1;
  }

  for (const reg of registrations ?? []) {
    const stats = userStats.get(reg.user_id as string);
    if (stats) stats.registrationsCount += 1;
  }

  for (const att of attendance ?? []) {
    const stats = userStats.get((att as any).registrations.user_id);
    if (stats) stats.attendanceCount += 1;
  }

  return (users ?? []).map((user) => ({
    ...user,
    stats: userStats.get(user.id as string) ?? { eventsCreated: 0, registrationsCount: 0, attendanceCount: 0 }
  }));
}

async function handleRoleAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const targetUserId = formData.get('targetUserId') as string | null;

  if (!action || !targetUserId) {
    redirect('/admin-dashboard/users');
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

  // Prevent self-demotion
  if (targetUserId === user.id) {
    redirect('/admin-dashboard/users');
  }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', targetUserId)
    .single();

  if (!targetProfile) {
    redirect('/admin-dashboard/users');
  }

  let newRole: 'student' | 'organizer' | 'admin' | null = null;
  let logAction = '';
  let disableUser = false;

  if (action === 'promote_student_to_organizer' && targetProfile.role === 'student') {
    newRole = 'organizer';
    logAction = 'ROLE_PROMOTE_STUDENT_TO_ORGANIZER';
  } else if (action === 'promote_organizer_to_admin' && targetProfile.role === 'organizer') {
    newRole = 'admin';
    logAction = 'ROLE_PROMOTE_ORGANIZER_TO_ADMIN';
  } else if (action === 'demote_organizer_to_student' && targetProfile.role === 'organizer') {
    newRole = 'student';
    logAction = 'ROLE_DEMOTE_ORGANIZER_TO_STUDENT';
  } else if (action === 'demote_admin_to_organizer' && targetProfile.role === 'admin') {
    newRole = 'organizer';
    logAction = 'ROLE_DEMOTE_ADMIN_TO_ORGANIZER';
  } else if (action === 'disable_user') {
    disableUser = true;
    logAction = 'USER_DISABLE';
  } else if (action === 'enable_user') {
    disableUser = false;
    logAction = 'USER_ENABLE';
  }

  if (newRole) {
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: logAction,
      details: {
        target_user_id: targetUserId,
        previous_role: targetProfile.role,
        new_role: newRole
      }
    });
  } else if (action === 'disable_user' || action === 'enable_user') {
    await supabase
      .from('profiles')
      .update({ disabled: disableUser })
      .eq('id', targetUserId);

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: logAction,
      details: {
        target_user_id: targetUserId,
        disabled: disableUser
      }
    });
  }

  redirect('/admin-dashboard/users');
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getUsersWithStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Users & Roles</h1>
        <p className="mt-1 text-sm text-slate-400">
          View all users, promote or demote roles, and see user statistics.
        </p>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-400">No users found.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {users.map((user: any) => {
            const canPromoteStudentToOrganizer = user.role === 'student';
            const canPromoteOrganizerToAdmin = user.role === 'organizer';
            const canDemoteOrganizerToStudent = user.role === 'organizer';
            const canDemoteAdminToOrganizer = user.role === 'admin';

            return (
              <div
                key={user.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-white">
                        {user.full_name || 'Unnamed User'}
                      </h2>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                        user.role === 'admin'
                          ? 'bg-red-700/30 text-red-300'
                          : user.role === 'organizer'
                          ? 'bg-amber-700/30 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{user.email}</p>
                    <p className="text-[11px] text-slate-400">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span>Events created: {user.stats.eventsCreated}</span>
                      <span>Registrations: {user.stats.registrationsCount}</span>
                      <span>Attendance: {user.stats.attendanceCount}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <form action={handleRoleAction}>
                      <input type="hidden" name="targetUserId" value={user.id} />
                      <div className="flex flex-wrap gap-2">
                        {canPromoteStudentToOrganizer && (
                          <button
                            type="submit"
                            name="action"
                            value="promote_student_to_organizer"
                            className="rounded-md bg-amber-700 px-3 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-600"
                          >
                            Promote to Organizer
                          </button>
                        )}
                        {canPromoteOrganizerToAdmin && (
                          <button
                            type="submit"
                            name="action"
                            value="promote_organizer_to_admin"
                            className="rounded-md bg-red-700 px-3 py-1 text-[11px] font-medium text-red-50 hover:bg-red-600"
                          >
                            Promote to Admin
                          </button>
                        )}
                        {canDemoteOrganizerToStudent && (
                          <button
                            type="submit"
                            name="action"
                            value="demote_organizer_to_student"
                            className="rounded-md border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                          >
                            Demote to Student
                          </button>
                        )}
                        {canDemoteAdminToOrganizer && (
                          <button
                            type="submit"
                            name="action"
                            value="demote_admin_to_organizer"
                            className="rounded-md border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                          >
                            Demote to Organizer
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
