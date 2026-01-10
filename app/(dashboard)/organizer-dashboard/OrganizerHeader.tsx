"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";

export default function OrganizerHeader({ userName }: { userName: string }) {
  const [currentTime, setCurrentTime] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Update time immediately and then every minute
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      setCurrentTime(
        now.toLocaleString('en-US', options)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-dropdown")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/organizer/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/organizer");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-purple-50 via-purple-100 to-purple-50 shadow-sm px-8 py-8 rounded-lg">
      <div className="flex items-center justify-between">
        {/* Left side - Branding and Navigation */}
        <div className="flex items-center gap-6 flex-1">
          {/* Logo and University Name */}
          <div className="flex items-center gap-4">
            <img 
              src="/icon/U.V.-Patel-College-of-Engineering.png" 
              alt="Ganpat University Logo" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Ganpat University</h1>
              <p className="text-base text-gray-600">Event Management System</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-4 ml-6">
            <Link 
              href="/organizer-dashboard"
              className="text-lg text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/organizer-dashboard/events"
              className="text-lg text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Events
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          {/* Date/Time */}
          <span className="text-base text-gray-700 font-medium">{currentTime}</span>
          
          {/* Icons */}
          <button className="text-gray-700 hover:text-gray-900 transition-colors">
            <Bell className="w-6 h-6" />
          </button>
          <button className="text-gray-700 hover:text-gray-900 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
          
          {/* User Profile Dropdown */}
          <div className="profile-dropdown relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-medium text-gray-800">
                Hi, {userName || 'Organizer'}
              </span>
              <span className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg z-[9999]">
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    router.push("/organizer-dashboard");
                    setDropdownOpen(false);
                  }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
