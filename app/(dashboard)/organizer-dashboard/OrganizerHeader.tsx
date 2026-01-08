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
        hour12: false,
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
    <header className="bg-gradient-to-r from-purple-50 via-purple-100 to-purple-50 shadow-sm px-8 py-5 rounded-lg">
      <div className="flex items-center justify-between">
        {/* Left side - Branding and Navigation */}
        <div className="flex items-center gap-8">
          {/* Logo and University Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ganpat University</h1>
              <p className="text-sm text-gray-600">Event Management System</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            <Link 
              href="/organizer-dashboard"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/organizer-dashboard/events"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Events
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          {/* Date/Time */}
          <span className="text-sm text-gray-700 font-medium">{currentTime}</span>
          
          {/* Icons */}
          <button className="text-purple-600 hover:text-purple-800 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-purple-600 hover:text-purple-800 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          {/* User Profile Dropdown */}
          <div className="profile-dropdown relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-medium text-gray-900">
                Hi, {userName || 'Organizer'}
              </span>
              <span className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
