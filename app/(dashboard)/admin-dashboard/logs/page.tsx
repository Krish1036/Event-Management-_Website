import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Filter, Users, Shield, Eye, ChevronDown } from 'lucide-react';

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

async function getAdminLogs(adminFilter: string | null, actionFilter: string | null, dateFilter: string | null) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('admin_logs')
    .select(
      `id,action,created_at,details,
       admin:profiles(id,full_name,email)`
    )
    .order('created_at', { ascending: false });

  if (adminFilter && adminFilter !== 'all') {
    query = query.eq('admin_id', adminFilter);
  }

  if (actionFilter && actionFilter !== 'all') {
    query = query.eq('action', actionFilter);
  }

  if (dateFilter && dateFilter !== 'all') {
    const today = new Date();
    let startDate: Date;

    if (dateFilter === 'today') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (dateFilter === 'week') {
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      startDate = new Date(0);
    }

    query = query.gte('created_at', startDate.toISOString());
  }

  const { data } = await query;
  return data ?? [];
}

async function getAdmins() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .eq('role', 'admin')
    .order('full_name');
  return data ?? [];
}

async function getUniqueActions() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('admin_logs')
    .select('action')
    .not('action', 'is', null);
  
  const actions = [...new Set((data ?? []).map((log: any) => log.action))];
  return actions.sort();
}

interface SearchParams {
  admin?: string;
  action?: string;
  date?: string;
}

export default async function AdminLogsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const adminFilter = searchParams?.admin ?? 'all';
  const actionFilter = searchParams?.action ?? 'all';
  const dateFilter = searchParams?.date ?? 'all';
  
  const [logs, admins, actions] = await Promise.all([
    getAdminLogs(adminFilter, actionFilter, dateFilter),
    getAdmins(),
    getUniqueActions()
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all admin actions with full audit trail. Read-only immutable logs.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter logs by admin, action, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="admin" className="block text-sm font-medium text-gray-700 mb-2">
                Admin
              </label>
              <Select name="admin" defaultValue={adminFilter}>
                <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="All Admins" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Admins</SelectItem>
                  {admins.map((admin: any) => (
                    <SelectItem key={admin.id} value={admin.id} className="text-black hover:bg-gray-100">
                      {admin.full_name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <Select name="action" defaultValue={actionFilter}>
                <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="All Actions" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Actions</SelectItem>
                  {actions.map((action: string) => (
                    <SelectItem key={action} value={action} className="text-black hover:bg-gray-100">
                      {action.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <Select name="date" defaultValue={dateFilter}>
                <SelectTrigger className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black">
                  <SelectValue placeholder="All Time" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Time</SelectItem>
                  <SelectItem value="today" className="text-black hover:bg-gray-100">Today</SelectItem>
                  <SelectItem value="week" className="text-black hover:bg-gray-100">Last 7 Days</SelectItem>
                  <SelectItem value="month" className="text-black hover:bg-gray-100">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs list */}
      {logs.length === 0 ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-500">
                No logs found matching the filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            <Badge variant="outline">
              {logs.length} entries
            </Badge>
          </div>
          {logs.map((log: any) => (
            <Card 
              key={log.id}
              className="bg-white hover:shadow-md transition-shadow border border-gray-200"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {log.admin?.full_name || log.admin?.email || 'Unknown Admin'}
                        </p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        ADMIN ACTION
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Log ID: {log.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {log.details && (
                      <details className="text-right">
                        <summary className="cursor-pointer inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium">
                          <Eye className="w-4 h-4" />
                          View Details
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-left">
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info banner */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">About Audit Logs:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>All admin actions are automatically logged and immutable</li>
                <li>Logs include full details of actions, timestamps, and performing admin</li>
                <li>Use filters to investigate specific actions or time periods</li>
                <li>Logs cannot be deleted or modified by any admin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
