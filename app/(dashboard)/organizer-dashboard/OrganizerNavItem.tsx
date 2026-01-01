'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OrganizerNavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/organizer-dashboard' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-md px-3 py-2 text-xs hover:bg-slate-800 hover:text-white ${
        isActive ? 'bg-slate-800 text-white' : 'text-slate-200'
      }`}
    >
      <span>{label}</span>
    </Link>
  );
}
