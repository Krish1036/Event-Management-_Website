"use client";

import { useEffect, useRef } from 'react';
import QRCode from 'qr-code-styling';

const SIZE = 180;

export function TicketQr({ data }: { data: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<any | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (!qrRef.current) {
      qrRef.current = new QRCode({
        width: SIZE,
        height: SIZE,
        data: data,
        dotsOptions: {
          color: '#0ea5e9',
          type: 'rounded'
        },
        backgroundOptions: {
          color: '#020617'
        }
      });
      qrRef.current.append(ref.current);
    } else {
      qrRef.current.update({ data });
    }
  }, [data]);

  return <div ref={ref} className="h-[180px] w-[180px]" aria-label="Ticket QR code" />;
}
