"use client";

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

const QRScanner = dynamic(() => import('./QRScanner'), { ssr: false });

export default function QRModalButton({ eventId, buttonLabel, className }: { eventId?: string | null; buttonLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const btnLabel = buttonLabel ?? 'Scan QR';
  const btnClass = className ?? 'rounded-full bg-purple-600 px-4 py-1 text-sm font-medium text-white hover:bg-purple-700';
  const [scanned, setScanned] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const scannerMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // discover devices when modal opens
    if (!open) return;
    (async () => {
      try {
        const ds = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = ds.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);
        if (videoInputs.length > 0) setDeviceId(videoInputs[0].deviceId);
      } catch (err: any) {
        // permission may not be granted yet
        setPermissionError('Camera access not available. You can enter the code manually or upload the QR image.');
      }
    })();
  }, [open]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 150);
    } catch (e) {
      // ignore audio errors
    }
  };

  const handleScan = async (text: string) => {
    // de-bounce - ignore if already scanning
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
      // play a short detect sound
      playBeep();
      
      // Show confirmation popup immediately
      if (json.success) {
        setTimeout(() => {
          const confirmMessage = `User Found:\n\nName: ${json.user?.full_name || 'Unknown'}\nEmail: ${json.user?.email || 'No email'}\nEvent: ${json.event?.title || 'Unknown'}\n\nMark this user as attended?`;
          if (confirm(confirmMessage)) {
            handleConfirm();
          } else {
            // Reset for next scan
            setScanned(null);
            setPreview(null);
          }
        }, 500);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
      // Show error popup
      setTimeout(() => {
        alert(`Error: ${err?.message ?? 'Failed to scan QR code'}`);
        setScanned(null);
        setPreview(null);
      }, 500);
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
      
      playBeep();
      // Show success popup
      const userName = preview.user?.full_name || 'User';
      alert(`✅ Successfully checked in: ${userName}`);
      
      // Close modal and reset
      setOpen(false);
      setScanned(null);
      setPreview(null);
    } catch (err: any) {
      // Show error popup
      alert(`❌ Check-in failed: ${err?.message ?? 'Unknown error'}`);
      setError(err?.message ?? String(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = blobUrl;
      await new Promise((res) => (img.onload = res));
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      try {
        const result = await reader.decodeFromImageElement(img);
        handleScan(result.getText());
      } catch (err: any) {
        setError('Could not detect a QR code in the image.');
      } finally {
        reader.reset();
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnClass}
      >
        {btnLabel}
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
              <div className="flex h-full">
                <div className="flex-1">
                  <QRScanner
                    onScan={handleScan}
                    onDetect={(t) => { /* could highlight briefly */ }}
                    onError={(err) => setError(err.message)}
                    preferredDeviceId={deviceId}
                  />
                </div>
                <div className="w-44 p-2">
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-600">Camera</label>
                    <select
                      value={deviceId ?? ''}
                      onChange={(e) => setDeviceId(e.target.value)}
                      className="w-full mt-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                    >
                      {devices.length === 0 && <option value="">No camera detected</option>}
                      {devices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-600">Upload</label>
                    <input className="mt-1 w-full text-xs" type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)} />
                  </div>

                  {permissionError && <p className="text-xs text-red-600">{permissionError}</p>}
                </div>
              </div>
            </div>

            <div className="mt-3">
              {loadingPreview && <p className="text-sm text-gray-600">Scanning…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              {!loadingPreview && !error && (
                <p className="text-sm text-gray-600 mt-2">Point camera at attendee's QR code. The scanner requires two quick consecutive detections to reduce false positives. You can also upload an image.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
