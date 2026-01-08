"use client";

import { useState, useEffect } from 'react';
import { Bell, Settings, Search, Plus, Grid, Menu, MapPin, ChevronLeft, ChevronRight, ImageIcon, List, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  price: number;
  is_paid: boolean;
  capacity: number;
  registered_count?: number;
}

interface EventsClientProps {
  initialEvents: Event[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [userName, setUserName] = useState('User');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user profile to get full name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      }
    };

    getUser();
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

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, activeFilter, categoryFilter, monthFilter]);

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    const now = new Date();
    if (activeFilter === 'active') {
      filtered = filtered.filter(event => new Date(event.event_date) >= now);
    } else if (activeFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.event_date) < now);
    }

    // Month filter
    if (monthFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.event_date);
        const eventMonth = eventDate.toLocaleDateString('en-US', { month: 'long' });
        return eventMonth === monthFilter;
      });
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  const calculateProgress = (registered = 0, capacity = 100) => {
    return Math.round((registered / capacity) * 100);
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatEventTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon"></div>
              <span className="logo-text">Ganpat University</span>
            </div>
            <nav className="main-nav">
              <span className="nav-link active">Events</span>
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

      {/* Main Content */}
      <div className="main-content">
        {/* Page Title */}
        <div className="page-header">
          <div className="breadcrumb">Dashboard / Events</div>
          <h1 className="page-title">Events</h1>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
              onClick={() => setActiveFilter('active')}
            >
              Active
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'draft' ? 'active' : ''}`}
              onClick={() => setActiveFilter('draft')}
            >
              Draft
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'past' ? 'active' : ''}`}
              onClick={() => setActiveFilter('past')}
            >
              Past
            </button>
          </div>
          
          <div className="filter-actions">
            <div className="search-box">
              <Search className="search-icon" />
              <input 
                type="text" 
                placeholder="Search event, location, etc"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="action-button primary">
              <Plus className="icon" />
            </button>
            <select 
              className="action-button secondary"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Category</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
              <option value="social">Social</option>
            </select>
            <select 
              className="action-button secondary"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="January">This Month</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <button 
              className={`action-button ${viewMode === 'grid' ? 'primary' : 'secondary'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="icon" />
            </button>
            <button 
              className={`action-button ${viewMode === 'list' ? 'primary' : 'secondary'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="icon" />
            </button>
          </div>
        </div>

        {/* Events Display */}
        <div className={`events-${viewMode}`}>
          {paginatedEvents.map((event) => {
            const progress = calculateProgress(event.registered_count, event.capacity);
            
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="event-card">
                {/* Event Image */}
                <div className="event-image">
                  <div className="image-placeholder">
                    <ImageIcon className="placeholder-icon" />
                  </div>
                  
                  {/* Category Badge */}
                  <div className="category-badge">
                    General
                  </div>
                  
                  {/* Active Badge */}
                  <div className="active-badge">
                    <span className="active-dot"></span>
                    Active
                  </div>
                </div>

                {/* Event Details */}
                <div className="event-details">
                  <div className="event-date">
                    {formatEventDate(event.event_date)} — {formatEventTime(event.start_time)}
                  </div>
                  
                  <h3 className="event-title">{event.title}</h3>
                  
                  <div className="event-location">
                    <MapPin className="location-icon" />
                    <span className="location-text">{event.location || 'Online'}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-percentage">{progress}%</span>
                      <span className="event-price">
                        {event.is_paid ? `$${event.price}` : 'Free'}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="pagination">
          <div className="pagination-info">
            Showing {filteredEvents.length} events
            <select 
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select> 
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pagination-button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="icon" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-button ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            {totalPages > 5 && <span className="pagination-ellipsis">...</span>}
            {totalPages > 5 && (
              <button
                className={`pagination-button ${totalPages === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}
            <button 
              className="pagination-button primary"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
