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
        const dropdownContainer = document.querySelector('.profile-dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(target)) {
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

  const toggleDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <div className="h-12 flex items-center">
              <img 
                src="/icon/U.V.-Patel-College-of-Engineering.png" 
                alt="Ganpat University Logo" 
                className="h-full w-auto object-contain"
              />
            </div>
                      </div>
          <nav className="main-nav">
            <Link href="/" className={`nav-link text-base ${pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link href="/events" className={`nav-link text-base ${pathname === '/events' ? 'active' : ''}`}>Events</Link>
          </nav>
        </div>
        <div className="header-right">
          <div className="relative profile-dropdown-container">
            <button 
              className="admin-profile flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown();
              }}
            >
              <span className="admin-label text-gray-800 text-base">Hi, {userName}</span>
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
            
            {showProfileDropdown && (
              <div 
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '100%',
                    marginTop: '0.5rem',
                    zIndex: 99999,
                    backgroundColor: 'white',
                    border: '1px solid rgb(229 231 235)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    minWidth: '12rem',
                    padding: '0.5rem 0'
                  }}
                >
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
