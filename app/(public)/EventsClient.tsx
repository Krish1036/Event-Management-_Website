"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Grid,
  Menu,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  List,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import PublicNavbar from "./PublicNavbar";

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
  pricing_type?: 'free' | 'paid' | 'custom' | string;
  capacity: number;
  registered_count?: number;
  image_url?: string | null;
  is_registration_open?: boolean;
}

interface EventsClientProps {
  initialEvents: Event[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [customPricingPricesByEventId, setCustomPricingPricesByEventId] = useState<
    Record<string, number[]>
  >({});
  const [userRole, setUserRole] = useState<string | null>(null);

  // Debug: Log events data to see what image URLs we have
  console.log(
    "🏠 Landing page events data:",
    events.map((e) => ({
      id: e.id,
      title: e.title,
      image_url: e.image_url,
      hasImage: !!e.image_url,
    }))
  );

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, activeFilter, categoryFilter, monthFilter]);

  // Auto-close registration for past and today's events
  useEffect(() => {
    const autoCloseRegistrations = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      console.log('[DEBUG] Auto-close registration check:', {
        todayString,
        today: today.toISOString(),
        timestamp: new Date().toISOString()
      });

      // Get events that should have registration closed (past and today's events)
      const { data: eventsToClose, error } = await supabase
        .from('events')
        .select('id, event_date, is_registration_open, title')
        .eq('is_registration_open', true)
        .lte('event_date', todayString); // events with date <= today

      console.log('[DEBUG] Events that should be closed:', {
        eventsToClose,
        error,
        count: eventsToClose?.length || 0
      });

      if (eventsToClose && eventsToClose.length > 0) {
        const eventIds = eventsToClose.map(event => event.id);
        
        console.log('[DEBUG] Closing registration for events:', {
          eventIds,
          eventDetails: eventsToClose.map(e => ({ id: e.id, title: e.title, date: e.event_date }))
        });
        
        // Close registrations for these events
        const { error: updateError } = await supabase
          .from('events')
          .update({ is_registration_open: false })
          .in('id', eventIds);

        if (updateError) {
          console.error('[ERROR] Failed to close registrations:', updateError);
          return;
        }

        console.log('[DEBUG] Successfully closed registrations for events:', eventIds);

        // Update local state
        setEvents(prevEvents => 
          prevEvents.map(event => 
            eventIds.includes(event.id) 
              ? { ...event, is_registration_open: false }
              : event
          )
        );
      }
    };

    autoCloseRegistrations();
  }, []);

  // Check user role for admin/organizer permissions
  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    };

    checkUserRole();
  }, []);

  // Toggle registration status for admins/organizers
  const toggleRegistration = async (eventId: string, currentStatus: boolean) => {
    if (!userRole || !['admin', 'organizer'].includes(userRole)) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const newStatus = !currentStatus;
    
    await supabase
      .from('events')
      .update({ is_registration_open: newStatus })
      .eq('id', eventId);

    // Update local state
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? { ...event, is_registration_open: newStatus }
          : event
      )
    );
  };

  useEffect(() => {
    const customEventIds = (events || [])
      .filter((e) => e.pricing_type === 'custom')
      .map((e) => e.id)
      .filter(Boolean);

    if (customEventIds.length === 0) {
      setCustomPricingPricesByEventId({});
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('event_pricing_options')
        .select('event_id, price')
        .in('event_id', customEventIds)
        .order('price', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('Failed to fetch custom pricing options for events list', error);
        setCustomPricingPricesByEventId({});
        return;
      }

      const grouped: Record<string, number[]> = {};
      for (const row of data ?? []) {
        const eventId = (row as any).event_id as string;
        const price = Number((row as any).price);
        if (!eventId || !Number.isFinite(price)) continue;
        if (!grouped[eventId]) grouped[eventId] = [];
        grouped[eventId].push(price);
      }

      setCustomPricingPricesByEventId(grouped);
    })();

    return () => {
      cancelled = true;
    };
  }, [events]);

  const formatEventPrice = (event: Event) => {
    if (event.pricing_type === 'custom') {
      const prices = customPricingPricesByEventId[event.id] ?? [];
      if (prices.length === 0) return 'Custom';

      const uniqueSorted = Array.from(new Set(prices)).sort((a, b) => a - b);
      const min = uniqueSorted[0];
      const max = uniqueSorted[uniqueSorted.length - 1];
      if (min === max) return `₹${min}`;
      return `₹${min}–₹${max}`;
    }

    return event.is_paid ? `₹${event.price}` : 'Free';
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (activeFilter === "upcoming") {
      filtered = filtered.filter((event) => new Date(event.event_date) >= tomorrow);
    } else if (activeFilter === "today") {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
      });
    } else if (activeFilter === "past") {
      filtered = filtered.filter((event) => new Date(event.event_date) < today);
    }

    // Month filter
    if (monthFilter !== "all") {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date);
        const eventMonth = eventDate.toLocaleDateString("en-US", {
          month: "long",
        });
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  };

  const getEffectiveRegistrationOpen = (event: Event) => {
    const todayString = new Date().toISOString().slice(0, 10);
    const dateAllowsRegistration = typeof event.event_date === 'string' ? event.event_date > todayString : true;
    return Boolean(event.is_registration_open) && dateAllowsRegistration;
  };

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = filteredEvents.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="dashboard-container">
      <PublicNavbar />

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
              className={`filter-tab ${
                activeFilter === "upcoming" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`filter-tab ${
                activeFilter === "today" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("today")}
            >
              Today's Event
            </button>
            <button
              className={`filter-tab ${
                activeFilter === "past" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("past")}
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
            <button className="action-button primary mobile-hidden">
              <Plus className="icon" />
            </button>
            <select
              className="action-button secondary select-dropdown"
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
              className="action-button secondary select-dropdown"
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
              className={`action-button ${
                viewMode === "grid" ? "primary" : "secondary"
              } mobile-hidden`}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="icon" />
            </button>
            <button
              className={`action-button ${
                viewMode === "list" ? "primary" : "secondary"
              } mobile-hidden`}
              onClick={() => setViewMode("list")}
            >
              <List className="icon" />
            </button>
          </div>
        </div>

        {/* Events Display */}
        <div className={`events-${viewMode}`}>
          {paginatedEvents.map((event) => {
            const progress = calculateProgress(
              event.registered_count,
              event.capacity
            );
            const effectiveRegistrationOpen = getEffectiveRegistrationOpen(event);

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="event-card"
              >
                {/* Event Image */}
                <div className="event-image">
                  {event.image_url ? (
                    <>
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="event-image-src image-content"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "fill",
                        }}
                        onLoad={(e: React.ChangeEvent<HTMLImageElement>) => {
                          console.log(
                            "✅ Landing page: Image loaded successfully:",
                            event.image_url
                          );
                        }}
                        onError={(e: React.ChangeEvent<HTMLImageElement>) => {
                          console.error(
                            "❌ Landing page: Image failed to load:",
                            {
                              url: event.image_url,
                              eventTitle: event.title,
                              eventId: event.id,
                              error: e,
                            }
                          );
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const placeholder =
                            target.nextElementSibling as HTMLElement;
                          if (placeholder) {
                            placeholder.classList.remove("hidden");
                          }
                        }}
                      />
                      <div className="image-placeholder hidden">
                        <ImageIcon className="placeholder-icon" />
                      </div>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      <ImageIcon className="placeholder-icon" />
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="event-details">
                  <div className="event-date">
                    {formatEventDate(event.event_date)} —{" "}
                    {formatEventTime(event.start_time)}
                  </div>

                  <h3 className="event-title">{event.title}</h3>

                  <div className="event-location">
                    <MapPin className="location-icon" />
                    <span className="location-text">
                      {event.location || "Online"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-percentage">{progress}%</span>
                      <span className="event-price">
                        {formatEventPrice(event)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Registration Toggle for Admins/Organizers */}
                  {userRole && ['admin', 'organizer'].includes(userRole) && (
                    <div className="registration-control mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Registration Status</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRegistration(event.id, event.is_registration_open || false);
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            effectiveRegistrationOpen
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {effectiveRegistrationOpen ? 'Open' : 'Closed'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="pagination">
          <div className="pagination-info">
            Showing {filteredEvents.length} events
            <div className="select-wrapper">
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
              <ChevronDown className="select-arrow" />
            </div>
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="icon" />
            </button>
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                className={`pagination-button ${
                  page === currentPage ? "active" : ""
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            {totalPages > 5 && <span className="pagination-ellipsis">...</span>}
            {totalPages > 5 && (
              <button
                className={`pagination-button ${
                  totalPages === currentPage ? "active" : ""
                }`}
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}
            <button
              className="pagination-button primary"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
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
