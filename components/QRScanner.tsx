"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

export type QRScannerProps = {
  onScan: (text: string) => void;
  onError?: (err: Error) => void;
  paused?: boolean;
  constraints?: MediaTrackConstraints;
  preferredDeviceId?: string | null;
};

export default function QRScanner({ onScan, onError, paused, constraints, preferredDeviceId }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (paused) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let active = true;

    const start = async () => {
      try {
        setScanning(true);
        if (preferredDeviceId) {
          await codeReader.decodeFromVideoDevice(preferredDeviceId, videoRef.current!, (result, err) => {
            if (!active) return;
            if (result) {
              onScan(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              // NotFoundException means "no QR found in this frame" - ignore
              onError?.(err as Error);
            }
          });
        } else {
          // Use default camera and constraints if provided
          await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
            if (!active) return;
            if (result) {
              onScan(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              onError?.(err as Error);
            }
          });
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
  }, [onScan, onError, paused, preferredDeviceId, constraints]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full rounded-md object-cover" />
    </div>
  );
}
