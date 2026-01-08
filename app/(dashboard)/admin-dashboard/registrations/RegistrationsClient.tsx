'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { ViewTicketButton } from './ViewTicketButton';
import { Search } from 'lucide-react';

export default function RegistrationsClient({ events: initialEvents }: { events: any[] }) {
  const [regs, setRegs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>(initialEvents ?? []);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: regsData } = await supabase.rpc('get_all_registrations_for_admin');
      const mapped = (regsData ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        entry_code: r.entry_code,
        created_at: r.created_at,
        event_id: r.event_id,
        user_id: r.user_id,
        event: { id: r.event_id, title: r.event_title, is_paid: r.event_is_paid, price: r.event_price },
        user: { id: r.user_id, full_name: r.user_full_name, email: r.user_email }
      }));
      setRegs(mapped);
      setFiltered(mapped);
    } catch (e) {
      console.error('Error fetching registrations (client):', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (term === '') {
      setFiltered(regs);
      return;
    }
    setFiltered(regs.filter(r => 
      (r.entry_code ?? '').toLowerCase().includes(term) ||
      (r.user?.full_name ?? '').toLowerCase().includes(term) ||
      (r.user?.email ?? '').toLowerCase().includes(term)
    ));
  }, [q, regs]);

  if (loading) {
    return <p className="text-sm text-gray-500 text-center py-8">Loading registrations...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          name="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or entry code"
          className="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No registrations found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((reg: any) => (
            <div key={reg.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{reg.event?.title ?? 'Event'}</h2>
                  <div className="mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : reg.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>{reg.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{reg.user?.full_name ?? 'User'}</span>
                    {' - '}
                    <span>{reg.user?.email ?? 'No email'}</span>
                    {' - '}
                    <span>Entry code: {reg.entry_code ?? 'N/A'}</span>
                  </div>
                  <div className="text-sm text-gray-500">Registered on {new Date(reg.created_at).toLocaleDateString('en-US')}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <ViewTicketButton registration={reg} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
