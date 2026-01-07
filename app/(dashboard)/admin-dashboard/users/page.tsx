'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users, Calendar, Trophy, Shield, UserPlus, UserMinus, Crown } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  async function fetchUsers() {
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }

      // Get user email to check if admin
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      // Email check first: If the user's email is in the hardcoded list, they're admin
      const adminEmails = ['krshthakore@gmail.com', 'admin@university.edu']; // Update with your admin emails
      let isAdmin = false;
      
      if (userEmail && adminEmails.includes(userEmail)) {
        isAdmin = true;
      } else {
        // Role check second: If not in email list, checks if they have admin role in profiles
        // Use the new working bypass function to avoid RLS recursion
        const { data: allUsers } = await supabase
          .rpc('get_all_profiles_for_admin');
        
        const currentUserProfile = allUsers?.find((u: any) => u.id === user.id);
        isAdmin = currentUserProfile?.role === 'admin';
      }
      
      if (!isAdmin) {
        router.push('/');
        return;
      }

      // Use the new working bypass function to get all users with stats
      const { data: usersData } = await supabase
        .rpc('get_all_profiles_for_admin');

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

      for (const user of usersData ?? []) {
        userStats.set((user as any).id as string, {
          eventsCreated: 0,
          registrationsCount: 0,
          attendanceCount: 0
        });
      }

      for (const event of events ?? []) {
        const stats = userStats.get((event as any).created_by as string);
        if (stats) stats.eventsCreated += 1;
      }

      for (const reg of registrations ?? []) {
        const stats = userStats.get((reg as any).user_id as string);
        if (stats) stats.registrationsCount += 1;
      }

      for (const att of attendance ?? []) {
        const stats = userStats.get((att as any).registrations.user_id as string);
        if (stats) stats.attendanceCount += 1;
      }

      const usersWithStats = (usersData ?? []).map((user: any) => ({
        ...user,
        stats: userStats.get(user.id as string) ?? { eventsCreated: 0, registrationsCount: 0, attendanceCount: 0 }
      }));

      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleAction(action: string, targetUserId: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user email to check if admin
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      // Email check first: If the user's email is in the hardcoded list, they're admin
      const adminEmails = ['krshthakore@gmail.com', 'admin@university.edu']; // Update with your admin emails
      let isAdmin = false;
      
      if (userEmail && adminEmails.includes(userEmail)) {
        isAdmin = true;
      } else {
        // Role check second: If not in email list, checks if they have admin role in profiles
        // Use the new working bypass function to avoid RLS recursion
        const { data: allUsers } = await supabase
          .rpc('get_all_profiles_for_admin');
        
        const currentUserProfile = allUsers?.find((u: any) => u.id === user.id);
        isAdmin = currentUserProfile?.role === 'admin';
      }
      
      if (!isAdmin) return;

      // Prevent self-demotion
      if (targetUserId === user.id) return;

      // Get target user profile using the new working bypass function
      const { data: allUsers } = await supabase
        .rpc('get_all_profiles_for_admin');

      const targetProfile = allUsers?.find((u: any) => u.id === targetUserId);
      if (!targetProfile) return;

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

      // Refresh users
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all users, promote or demote roles, and see user statistics.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-300 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
        {searchTerm && ` (searching for "${searchTerm}")`}
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No users found' : 'No users available'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'No users match your search criteria.' : 'There are no users in the system yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user: any) => {
            const canPromoteStudentToOrganizer = user.role === 'student';
            const canPromoteOrganizerToAdmin = user.role === 'organizer';
            const canDemoteOrganizerToStudent = user.role === 'organizer';
            const canDemoteAdminToOrganizer = user.role === 'admin';

            return (
              <Card 
                key={user.id}
                className="bg-white hover:shadow-md transition-shadow border border-gray-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.full_name || 'Unnamed User'}
                          </h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <Badge className={
                          user.role === 'admin'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : user.role === 'organizer'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }>
                          {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                          {user.role === 'organizer' && <Shield className="w-3 h-3 mr-1" />}
                          {user.role === 'student' && <Users className="w-3 h-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span className="font-medium">{user.stats.eventsCreated}</span>
                            <span className="text-gray-500">Events</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="font-medium">{user.stats.registrationsCount}</span>
                            <span className="text-gray-500">Registrations</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span className="font-medium">{user.stats.attendanceCount}</span>
                            <span className="text-gray-500">Attendance</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {canPromoteStudentToOrganizer && (
                        <Button
                          size="sm"
                          onClick={() => handleRoleAction('promote_student_to_organizer', user.id)}
                          className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Promote to Organizer
                        </Button>
                      )}
                      {canPromoteOrganizerToAdmin && (
                        <Button
                          size="sm"
                          onClick={() => handleRoleAction('promote_organizer_to_admin', user.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          Promote to Admin
                        </Button>
                      )}
                      {canDemoteOrganizerToStudent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleAction('demote_organizer_to_student', user.id)}
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Demote to Student
                        </Button>
                      )}
                      {canDemoteAdminToOrganizer && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleAction('demote_admin_to_organizer', user.id)}
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Demote to Organizer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
