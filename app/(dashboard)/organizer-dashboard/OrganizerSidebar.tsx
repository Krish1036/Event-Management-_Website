'use client';

import { usePathname } from 'next/navigation';
import { Calendar, LayoutDashboard, PlusCircle, FileText, CheckCircle, Download, Mail } from 'lucide-react';
import Link from 'next/link';

const navigationItems = [
  { href: '/organizer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organizer-dashboard/events', label: 'My Events', icon: Calendar },
  { href: '/organizer-dashboard/create-event', label: 'Create Event', icon: PlusCircle },
  { href: '/organizer-dashboard/registrations', label: 'Registrations', icon: FileText },
  { href: '/organizer-dashboard/attendance', label: 'Attendance', icon: CheckCircle },
  { href: '/organizer-dashboard/emails', label: 'Event Emails', icon: Mail },
  { href: '/organizer-dashboard/exports', label: 'Exports', icon: Download },
];

export default function OrganizerSidebar() {
  const pathname = usePathname();

  return (
    <div className="p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img 
          src="/icon/U.V.-Patel-College-of-Engineering.png" 
          alt="Ganpat University Logo" 
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Panel Title */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Organizer Panel</h2>
        <p className="text-sm text-gray-600">University Event Management</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-200 text-gray-900'
                  : 'text-gray-700 hover:bg-purple-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
