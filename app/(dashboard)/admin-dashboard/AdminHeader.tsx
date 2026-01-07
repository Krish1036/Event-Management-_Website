"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Grid3X3, Menu, Bell, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminHeader({ userName }: { userName: string }) {
  const [currentTime, setCurrentTime] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/admin");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        {/* Left side - Search and controls */}
        <div className="flex items-center gap-4 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search event, location, etc"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter button */}
          <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <Filter className="w-4 h-4 text-white" />
          </button>

          {/* Category dropdown */}
          <Select>
            <SelectTrigger className="w-32 border-gray-300 text-sm">
              <SelectValue placeholder="All Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="meetup">Meetup</SelectItem>
              <SelectItem value="webinar">Webinar</SelectItem>
            </SelectContent>
          </Select>

          {/* Month dropdown */}
          <Select>
            <SelectTrigger className="w-28 border-gray-300 text-sm">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Grid view button */}
          <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
            <Grid3X3 className="w-4 h-4 text-white" />
          </button>

          {/* Menu button */}
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-4">
          {/* Date/Time */}
          <span className="text-sm text-gray-600 font-medium">{currentTime}</span>
          
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
                  {userName?.charAt(0) || 'A'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {userName || 'Admin User'}
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
                    router.push("/admin-dashboard");
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
