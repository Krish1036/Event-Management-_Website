"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

const QRScanner = dynamic(() => import('./QRScanner'), { ssr: false });

export default function QRModalButton({ eventId }: { eventId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleScan = async (text: string) => {
    // Simple de-bounce to avoid multiple scans firing rapidly
    if (scanned) return;
    setScanned(text);
    setLoadingPreview(true);
    setError(null);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', text, eventId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Preview failed');
      setPreview(json);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setScanned(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', registrationId: preview.registrationId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Check-in failed');
      // success - close and show small success state
      setOpen(false);
      setScanned(null);
      setPreview(null);
      // small visual feedback — you can extend toasts later
      alert('Checked in: ' + (json.user?.full_name ?? json.registrationId));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-purple-600 px-4 py-1 text-sm font-medium text-white hover:bg-purple-700"
      >
        Scan QR
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[96%] max-w-2xl rounded-lg bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Scan QR to Check In</h3>
              <div className="flex items-center gap-2">
                <button className="text-sm text-gray-600" onClick={() => { setOpen(false); setScanned(null); setPreview(null); setError(null); }}>
                  <X />
                </button>
              </div>
            </div>

            <div className="h-72 bg-gray-100 rounded-md overflow-hidden">
              <QRScanner
                onScan={handleScan}
                onError={(err) => setError(err.message)}
              />
            </div>

            <div className="mt-3">
              {loadingPreview && <p className="text-sm text-gray-600">Scanning…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              {preview && (
                <div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
                  <p className="text-sm font-medium">{preview.user?.full_name ?? 'User'}</p>
                  <p className="text-xs text-gray-600">{preview.user?.email ?? 'No email'}</p>
                  <p className="text-xs text-gray-600">Event: {preview.event?.title ?? 'N/A'}</p>
                  <p className="text-xs text-gray-600">Status: {preview.registrationStatus}</p>
                  <div className="mt-3 flex gap-3">
                    <button onClick={handleConfirm} disabled={confirming} className="rounded-full bg-purple-600 px-4 py-1 text-xs font-medium text-white hover:bg-purple-700">
                      {confirming ? 'Checking in…' : 'Confirm Check In'}
                    </button>
                    <button onClick={() => { setScanned(null); setPreview(null); setError(null); }} className="rounded-full border px-4 py-1 text-xs">Cancel</button>
                  </div>
                </div>
              )}

              {!loadingPreview && !preview && !error && (
                <p className="text-sm text-gray-600 mt-2">Point the camera at the attendee's QR code. The scanner only accepts registration QR payloads.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
