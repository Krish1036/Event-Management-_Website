"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export type QRScannerProps = {
  onScan: (text: string) => void;
  onDetect?: (text: string) => void;
  onError?: (err: Error) => void;
  paused?: boolean;
  constraints?: MediaTrackConstraints;
  preferredDeviceId?: string | null;
};

export default function QRScanner({ onScan, onDetect, onError, paused, constraints, preferredDeviceId }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<InstanceType<typeof BrowserMultiFormatReader> | null>(null);
  const lastSeenRef = useRef<Record<string, { count: number; last: number }>>({});
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (paused) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let active = true;

    const start = async () => {
      try {
        setScanning(true);
        const callback = (result: any, err: any) => {
          if (!active) return;
          if (result) {
            const text = result.getText();
            console.log('[QR Scanner] Detected text:', text);
            onDetect?.(text);

            const now = Date.now();
            const entry = lastSeenRef.current[text] || { count: 0, last: 0 };
            if (now - entry.last > 800) {
              // reset if older than 800ms
              entry.count = 0;
            }
            entry.count += 1;
            entry.last = now;
            lastSeenRef.current[text] = entry;

            console.log('[QR Scanner] Detection count for', text, ':', entry.count);

            // require at least 2 detections within the time window to reduce false positives
            if (entry.count >= 2) {
              console.log('[QR Scanner] Scanning confirmed for:', text);
              // call onScan and clear the counts for this value
              onScan(text);
              lastSeenRef.current = {};
            }
          }

          if (err && err.name !== 'NotFoundException') {
            console.error('[QR Scanner] Error:', err);
            onError?.(err as Error);
          }
        };

        if (preferredDeviceId) {
          await codeReader.decodeFromVideoDevice(preferredDeviceId, videoRef.current!, callback);
        } else {
          await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, callback);
        }
      } catch (err: any) {
        onError?.(err);
        setScanning(false);
      }
    };

    start();

    return () => {
      active = false;
      setScanning(false);
      try {
        codeReader.reset();
      } catch (e) {
        // ignore
      }
    };
  }, [onScan, onDetect, onError, paused, preferredDeviceId, constraints]);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <video ref={videoRef} className="w-full h-full rounded-md object-cover" />
      
      {/* Corner Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          {/* Top-left corner */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
          
          {/* Top-right corner */}
          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
          
          {/* Bottom-left corner */}
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
          
          {/* Bottom-right corner */}
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg"></div>
          
          {/* Center guide text */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              Position QR code here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
