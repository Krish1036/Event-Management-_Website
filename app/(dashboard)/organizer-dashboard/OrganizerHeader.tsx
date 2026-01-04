"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Settings } from "lucide-react";

export default function OrganizerHeader({ userName }: { userName: string }) {
  const [currentTime, setCurrentTime] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Update time immediately and then every minute
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
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
    <header className="bg-white shadow-sm px-8 py-4">
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-6">
          {/* Date/Time */}
          <span className="text-sm text-gray-600">{currentTime}</span>
          
          {/* Icons */}
          <button className="text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-gray-600 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          {/* User Profile Dropdown */}
          <div className="profile-dropdown relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userName?.charAt(0) || 'O'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {userName || 'Orlando Laurentius'}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg z-50">
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
