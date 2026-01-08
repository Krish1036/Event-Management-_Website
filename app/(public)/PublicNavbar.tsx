'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, Grid, ChevronDown } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function PublicNavbar() {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userName, setUserName] = useState('User');
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Get user profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          setUserName(profile?.full_name || user.email?.split('@')[0] || 'User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowProfileDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon"></div>
            <span className="logo-text">Ganpat University</span>
          </div>
          <nav className="main-nav">
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link href="/events" className={`nav-link ${pathname === '/events' ? 'active' : ''}`}>Events</Link>
          </nav>
        </div>
        <div className="header-right">
          <button className="icon-button">
            <Bell className="icon" />
          </button>
          <button className="icon-button">
            <Settings className="icon" />
          </button>
          <div className="relative">
            <button 
              className="admin-profile flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="admin-avatar"></div>
              <span className="admin-label">{userName}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
            
            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Link 
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <Grid className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
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
