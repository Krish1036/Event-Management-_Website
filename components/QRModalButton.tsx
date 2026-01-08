"use client";

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const QRScanner = dynamic(() => import('./QRScanner'), { ssr: false });

export default function QRModalButton({ eventId, buttonLabel, className }: { eventId?: string | null; buttonLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const btnLabel = buttonLabel ?? 'Scan QR';
  const btnClass = className ?? 'rounded-full bg-purple-600 px-4 py-1 text-sm font-medium text-white hover:bg-purple-700';
  const [scanned, setScanned] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [scanSuccessful, setScanSuccessful] = useState(false);
  const [userToConfirm, setUserToConfirm] = useState<{name: string, email: string, event: string} | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const scannerMountRef = useRef<HTMLDivElement | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[QR Debug] ${message}`);
  };

  const resetScanner = () => {
    setScanned(null);
    setPreview(null);
    setError(null);
    setScanSuccessful(false);
    // Re-initialize the scanner
    if (open) {
      const initScanner = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment' 
            } 
          });
          const videoElement = document.querySelector('video');
          if (videoElement) {
            videoElement.srcObject = stream;
          }
        } catch (err) {
          setError('Failed to reinitialize camera');
        }
      };
      initScanner();
    }
  };
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
    if (scanned || scanSuccessful) return; // Prevent multiple scans
    setScanned(text);
    setLoadingPreview(true);
    setError(null);
    
    // Stop the scanner immediately after first detection
    const videoElement = document.querySelector('video');
    if (videoElement) {
      const stream = videoElement.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', text, eventId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Preview failed');
      
      setPreview(json);
      setRegistrationData(json);
      playBeep();
      
      if (json.user) {
        setUserToConfirm({
          name: json.user.full_name || 'Unknown',
          email: json.user.email || 'No email',
          event: json.event?.title || 'Unknown'
        });
        setShowConfirmation(true);
      }
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Failed to scan QR code';
      setError(errorMessage);
      setScanned(null);
      setPreview(null);
      setTimeout(() => {
        alert(`Error: ${errorMessage}`);
      }, 100);
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
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          resetScanner();
        }}
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
                <button 
                  className="text-sm text-gray-600" 
                  onClick={() => { 
                    setOpen(false); 
                    resetScanner();
                    // Close any video streams
                    const videoElement = document.querySelector('video');
                    if (videoElement && videoElement.srcObject) {
                      const stream = videoElement.srcObject as MediaStream;
                      stream.getTracks().forEach(track => track.stop());
                    }
                  }}
                >
                  <X />
                </button>
              </div>
            </div>

            <div className="h-72 bg-gray-100 rounded-md overflow-hidden">
              <div className="flex h-full">
                <div className="flex-1">
                  <QRScanner
                    onScan={handleScan}
                    onDetect={() => {}}
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
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || d.deviceId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-600">Upload</label>
                    <input 
                      className="mt-1 w-full text-xs" 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)} 
                    />
                  </div>

                  {permissionError && (
                    <p className="text-xs text-red-600">{permissionError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              {loadingPreview && <p className="text-sm text-gray-600">Scanning…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              
              {!loadingPreview && !error && !scanSuccessful && (
                <p className="text-sm text-gray-600">
                  Point camera at attendee's QR code. The scanner requires two quick consecutive 
                  detections to reduce false positives. You can also upload an image.
                </p>
              )}
              
              {scanSuccessful && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  <p className="font-medium">✓ Check-in successful!</p>
                  <p className="text-sm">The attendee has been checked in successfully.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Check-in</DialogTitle>
            <DialogDescription>
              Please confirm the following user's attendance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="font-medium">
                Name: <span className="font-normal">{userToConfirm?.name}</span>
              </p>
              <p className="font-medium">
                Email: <span className="font-normal">{userToConfirm?.email}</span>
              </p>
              <p className="font-medium">
                Event: <span className="font-normal">{userToConfirm?.event}</span>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfirmation(false);
                setScanned(null);
                setPreview(null);
                setRegistrationData(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!registrationData) return;
                
                try {
                  setLoadingPreview(true);
                  const res = await fetch('/api/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      action: 'confirm', 
                      registrationId: registrationData.registrationId 
                    })
                  });
                  
                  const result = await res.json();
                  if (!res.ok) throw new Error(result?.message || 'Check-in failed');
                  
                  // Show success message and set success state
                  setShowConfirmation(false);
                  setScanSuccessful(true);
                  setScanned(null);
                  setPreview(null);
                  setRegistrationData(null);
                  
                  // Auto-close after 2 seconds
                  setTimeout(() => {
                    setOpen(false);
                    // Reset success state after closing
                    setTimeout(() => setScanSuccessful(false), 300);
                  }, 2000);
                } catch (err: any) {
                  alert('Check-in failed: ' + (err.message || 'Unknown error'));
                } finally {
                  setLoadingPreview(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {loadingPreview ? 'Processing...' : 'Confirm Check-in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

