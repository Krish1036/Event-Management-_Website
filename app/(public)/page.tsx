import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import Image from 'next/image';
import './EventsDashboard.css';
import { Bell, Settings, Search, Plus, Grid, Menu, MapPin, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

export const revalidate = 60;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

export default async function HomePage() {
  const supabase = getSupabaseServerClient();
  
  const { data: events } = await supabase
    .from('events')
    .select('id,title,description,event_date,start_time,end_time,location,price,is_paid,capacity')
    .eq('status', 'approved')
    .order('event_date', { ascending: true })
    .limit(8);

  // Get registration counts for each event
  const eventsWithCounts = await Promise.all(
    (events || []).map(async (event) => {
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .in('status', ['PENDING', 'CONFIRMED']);
      
      return {
        ...event,
        registered_count: count || 0
      };
    })
  );

  const calculateProgress = (registered = 0, capacity = 100) => {
    return Math.round((registered / capacity) * 100);
  };

  const formatEventDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatEventTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon"></div>
              <span className="logo-text">Ventixe</span>
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
            <div className="admin-profile">
              <div className="admin-avatar"></div>
              <span className="admin-label">Admin</span>
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
            <button className="filter-tab active">Active</button>
            <button className="filter-tab">Draft</button>
            <button className="filter-tab">Past</button>
          </div>
          
          <div className="filter-actions">
            <div className="search-box">
              <Search className="search-icon" />
              <input 
                type="text" 
                placeholder="Search event, location, etc"
                className="search-input"
              />
            </div>
            <button className="action-button primary">
              <Plus className="icon" />
            </button>
            <button className="action-button secondary">All Category</button>
            <button className="action-button secondary">This Month</button>
            <button className="action-button primary">
              <Grid className="icon" />
            </button>
            <button className="action-button secondary">
              <Menu className="icon" />
            </button>
          </div>
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {eventsWithCounts?.map((event) => {
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
                    {formatEventDate(event.event_date)} — {event.start_time}
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
            Showing 
            <select className="page-size-select">
              <option>8</option>
              <option>16</option>
              <option>32</option>
            </select> 
          </div>
          
          <div className="pagination-controls">
            <button className="pagination-button">
              <ChevronLeft className="icon" />
            </button>
            <button className="pagination-button active">1</button>
            <button className="pagination-button">2</button>
            <button className="pagination-button">3</button>
            <span className="pagination-ellipsis">...</span>
            <button className="pagination-button">8</button>
            <button className="pagination-button primary">
              <ChevronRight className="icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}