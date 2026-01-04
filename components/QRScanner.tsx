"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

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
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
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

            // require at least 2 detections within the time window to reduce false positives
            if (entry.count >= 2) {
              // call onScan and clear the counts for this value
              onScan(text);
              lastSeenRef.current = {};
            }
          }

          if (err && !(err instanceof NotFoundException)) {
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
    <div className="w-full h-full flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full rounded-md object-cover" />
    </div>
  );
}
