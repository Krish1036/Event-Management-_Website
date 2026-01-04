"use client";

import React, { useState } from 'react';

export default function AdminBackfillEmailsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handle = async () => {
    if (!confirm('Run backfill to copy emails from auth.users into profiles for missing emails?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/backfill-emails', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Backfill failed');
      setResult(`Updated ${json.updated} profiles (attempted ${json.attempted}).`);
    } catch (err: any) {
      setResult('Error: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button onClick={handle} disabled={loading} className="rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60">
        {loading ? 'Running…' : 'Backfill Missing Emails'}
      </button>
      {result && <div className="mt-2 text-xs text-gray-600">{result}</div>}
    </div>
  );
}
