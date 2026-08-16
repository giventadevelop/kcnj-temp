"use client";
import React, { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventWithMedia, EventDetailsDTO } from "@/types";
import { formatInTimeZone } from 'date-fns-tz';
import { isRecurringEvent, getNextOccurrenceDate } from '@/lib/eventUtils';
import { isDonationBasedEvent, isTicketedFundraiserEvent } from '@/lib/donation/utils';
import { resolveBuyTicketsTarget } from '@/lib/eventcube/utils';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import '@/styles/modernist-homepage.css';

const EVENTS_PAGE_SIZE = 20; // Minimum events to display per page
const BACKEND_FETCH_SIZE = 50; // Fetch more from backend to account for recurring event filtering

// Component for handling long descriptions with expand/collapse
function DescriptionDisplay({
  description,
  isExpanded,
}: {
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const maxLength = 200; // characters

  if (description.length <= maxLength) {
    return (
      <p className="mh-event-card-desc" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {description}
      </p>
    );
  }

  const truncatedText = description.substring(0, maxLength).trim();

  return (
    <p className="mh-event-card-desc" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {isExpanded ? description : `${truncatedText}...`}
    </p>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(0); // Actual count after filtering recurring events
  const [hasMoreEvents, setHasMoreEvents] = useState(false); // Track if there are more events available
  const [fetchError, setFetchError] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  // Track event counts for both future and past to determine auto-switch and messages
  const [futureEventCount, setFutureEventCount] = useState<number | null>(null);
  const [pastEventCount, setPastEventCount] = useState<number | null>(null);
  const [hasCheckedInitialLoad, setHasCheckedInitialLoad] = useState(false);
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  // Apply the homepage organic design system (also set globally by PublicOrganicDesignBody).
  useLayoutEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      /* PublicOrganicDesignBody owns cleanup on route change */
    };
  }, []);

  useEffect(() => {
    // Skip reload if we're currently auto-switching (prevents double-load)
    if (isAutoSwitching) {
      setIsAutoSwitching(false); // Reset flag after skipping
      return;
    }

    async function fetchEvents() {
      setLoading(true);
      setFetchError(false);
      try {
        // Build query parameters based on date filter
        // Fetch more events from backend to account for recurring event filtering
        // We fetch BACKEND_FETCH_SIZE events to ensure we have at least EVENTS_PAGE_SIZE after filtering
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Determine which view we're loading (future or past)
        let loadingPastEvents = showPastEvents;

        // On initial load, check both future and past event counts
        if (!hasCheckedInitialLoad && page === 0 && !searchTitle && !searchDateFrom && !searchDateTo) {
          // Check future events count
          const futureQueryParams = new URLSearchParams({
            sort: 'startDate,asc',
            page: '0',
            size: '1', // Just need count, not data
            'isActive.equals': 'true',
            'startDate.greaterThanOrEqual': today
          });
          const futureRes = await fetch(`/api/proxy/event-details?${futureQueryParams.toString()}`);
          const finalFutureCount = futureRes.ok ? parseInt(futureRes.headers.get('x-total-count') || '0', 10) : 0;
          setFutureEventCount(finalFutureCount);

          // Check past events count
          const pastQueryParams = new URLSearchParams({
            sort: 'startDate,desc',
            page: '0',
            size: '1', // Just need count, not data
            'isActive.equals': 'true',
            'endDate.lessThan': today
          });
          const pastRes = await fetch(`/api/proxy/event-details?${pastQueryParams.toString()}`);
          const finalPastCount = pastRes.ok ? parseInt(pastRes.headers.get('x-total-count') || '0', 10) : 0;
          setPastEventCount(finalPastCount);

          setHasCheckedInitialLoad(true);

          // Auto-switch to past events if no future events but past events exist
          if (finalFutureCount === 0 && finalPastCount > 0) {
            setIsAutoSwitching(true);
            setShowPastEvents(true);
            loadingPastEvents = true; // Load past events data in this same call
          }
        }

        const queryParams = new URLSearchParams({
          sort: loadingPastEvents ? 'startDate,desc' : 'startDate,asc',
          page: page.toString(),
          size: BACKEND_FETCH_SIZE.toString(), // Fetch more to account for filtering
          'isActive.equals': 'true' // Only show active events
        });

        // Add search filters
        if (searchTitle.trim()) {
          queryParams.append('title.contains', searchTitle.trim());
        }

        // Handle date filtering - prioritize search date range over toggle
        if (searchDateFrom || searchDateTo) {
          // If user has specified date range, use that instead of toggle logic
          if (searchDateFrom) {
            queryParams.append('startDate.greaterThanOrEqual', searchDateFrom);
          }
          if (searchDateTo) {
            queryParams.append('startDate.lessThanOrEqual', searchDateTo);
          }
        } else {
          // No search date range specified, use toggle logic (use loadingPastEvents which respects auto-switch)
          if (loadingPastEvents) {
            // Show events that ended before today
            queryParams.append('endDate.lessThan', today);
          } else {
            // Show events that start today or later (future events including today)
            queryParams.append('startDate.greaterThanOrEqual', today);
          }
        }

        // Fetch paginated events with date filtering
        const eventsRes = await fetch(`/api/proxy/event-details?${queryParams.toString()}`);
        if (!eventsRes.ok) throw new Error('Failed to fetch events');

        // Get total count from response header (as per UI style guide)
        const totalCountHeader = eventsRes.headers.get('x-total-count');
        const totalCountValue = totalCountHeader ? parseInt(totalCountHeader, 10) : 0;
        setTotalCount(totalCountValue);

        // Calculate total pages based on backend fetch size (not displayed size)
        // This accounts for the fact that we fetch more than we display
        const calculatedTotalPages = Math.max(1, Math.ceil(totalCountValue / BACKEND_FETCH_SIZE));
        setTotalPages(calculatedTotalPages);

        const events: EventDetailsDTO[] = await eventsRes.json();
        let eventList = Array.isArray(events) ? events : [events];

        // Check if we got a full page of events (indicates there might be more)
        setHasMoreEvents(eventList.length === BACKEND_FETCH_SIZE);

        // Process recurring events to show only next occurrence (same logic as HeroSection)
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(todayDate.getFullYear() + 1);
        oneYearFromNow.setHours(23, 59, 59, 999);

        const processedEvents: EventDetailsDTO[] = [];
        const recurringSeriesMap = new Map<number, EventDetailsDTO>(); // Map seriesId -> event with earliest next occurrence

        // Process events and filter recurring events to show only next occurrence
        eventList.forEach((event) => {
          // Handle recurring events
          if (isRecurringEvent(event)) {
            const seriesId = event.recurrenceSeriesId || event.parentEventId || event.id;

            // Calculate next occurrence date
            const nextOccurrence = getNextOccurrenceDate(event, todayDate);

            if (!nextOccurrence) {
              console.log(`[EventsPage] Skipping recurring event ${event.id}: No next occurrence found`);
              return; // Skip if no next occurrence
            }

            // Check if next occurrence is within 1 year
            if (nextOccurrence > oneYearFromNow) {
              console.log(`[EventsPage] Skipping recurring event ${event.id}: Next occurrence ${nextOccurrence.toISOString()} is beyond 1 year`);
              return; // Skip if beyond 1 year
            }

            // Update event startDate to next occurrence for display
            const nextOccurrenceStr = nextOccurrence.toISOString().split('T')[0];
            const eventWithNextOccurrence = { ...event, startDate: nextOccurrenceStr };

            // Check if we already have an event from this series
            const existingSeriesEvent = recurringSeriesMap.get(seriesId);
            if (!existingSeriesEvent) {
              // First event from this series - add it
              recurringSeriesMap.set(seriesId, eventWithNextOccurrence);
              console.log(`[EventsPage] Added recurring event series ${seriesId}: ${event.title} (Next occurrence: ${nextOccurrenceStr})`);
            } else {
              // Compare dates - keep the one with earlier next occurrence
              const existingDate = new Date(existingSeriesEvent.startDate!);
              if (nextOccurrence < existingDate) {
                recurringSeriesMap.set(seriesId, eventWithNextOccurrence);
                console.log(`[EventsPage] Updated recurring event series ${seriesId}: ${event.title} (Earlier occurrence: ${nextOccurrenceStr})`);
              }
            }
          } else {
            // Check if this is a child event (has parentEventId or recurrenceSeriesId but isRecurring = false)
            const seriesId = event.recurrenceSeriesId || event.parentEventId;
            if (seriesId) {
              // This is a child event - skip it (we'll use the parent event instead)
              console.log(`[EventsPage] Skipping child event ${event.id} (series ${seriesId}) - will use parent event`);
              return;
            }
            // Non-recurring event - add directly
            processedEvents.push(event);
          }
        });

        // Add recurring events (only one per series - the next occurrence)
        recurringSeriesMap.forEach((event) => {
          processedEvents.push(event);
        });

        // Sort by startDate to show earliest events first
        processedEvents.sort((a, b) => {
          if (!a.startDate || !b.startDate) return 0;
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        // Limit to EVENTS_PAGE_SIZE (20) events for display after filtering
        const limitedProcessedEvents = processedEvents.slice(0, EVENTS_PAGE_SIZE);

        console.log(`[EventsPage] Processed ${processedEvents.length} events (${recurringSeriesMap.size} recurring series, ${processedEvents.length - recurringSeriesMap.size} non-recurring) from ${eventList.length} fetched events, displaying ${limitedProcessedEvents.length} events`);

        // Track actual displayed count after filtering and limiting
        const actualDisplayedCount = limitedProcessedEvents.length;
        setDisplayedCount(actualDisplayedCount);

        // For each event, fetch its hero image (homepage hero or regular hero)
        const eventsWithMedia = await Promise.all(
          limitedProcessedEvents.map(async (event: EventDetailsDTO) => {
            try {
              // First try to find homepage hero image
              let mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${event.id}&isHomePageHeroImage.equals=true`);
              let mediaData = await mediaRes.json();

              // If no homepage hero image found, try regular hero image
              if (!mediaData || mediaData.length === 0) {
                mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${event.id}&isHeroImage.equals=true`);
                mediaData = await mediaRes.json();
              }

              if (mediaData && mediaData.length > 0) {
                return { ...event, thumbnailUrl: mediaData[0].fileUrl };
              }
              return { ...event, thumbnailUrl: undefined };
            } catch {
              return { ...event, thumbnailUrl: undefined };
            }
          })
        );
        setEvents(eventsWithMedia);
      } catch (err) {
        setFetchError(true);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showPastEvents, searchTitle, searchDateFrom, searchDateTo]);

  // Helper to generate Google Calendar URL
  function toGoogleCalendarDate(date: string, time: string) {
    if (!date || !time) return '';
    const [year, month, day] = date.split('-');
    let [hour, minute] = time.split(':');
    let ampm = '';
    if (minute && minute.includes(' ')) {
      [minute, ampm] = minute.split(' ');
    }
    let h = parseInt(hour, 10);
    if (isNaN(h)) h = 0;
    if (ampm && ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    const min = minute && !isNaN(parseInt(minute, 10)) ? minute : '00';
    return `${year}${month}${day}T${String(h).padStart(2, '0')}${min.padStart(2, '0')}00`;
  }

  // Helper to format time with AM/PM
  function formatTime(time: string): string {
    if (!time) return '';
    // Accepts 'HH:mm' or 'hh:mm AM/PM' and returns 'hh:mm AM/PM'
    if (time.match(/AM|PM/i)) return time;
    const [hourStr, minute] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }

  // Helper to format date
  function formatDate(dateString: string, timezone: string = 'America/New_York'): string {
    if (!dateString) return '';
    // Use formatInTimeZone to display the date in the event's timezone
    return formatInTimeZone(dateString, timezone, 'EEEE, MMMM d, yyyy');
  }

  // Search functionality
  const handleSearch = async () => {
    setIsSearching(true);
    setPage(0); // Reset to first page when searching
    // The useEffect will trigger automatically due to dependency changes
  };

  const clearSearch = () => {
    setSearchTitle("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setPage(0);
    setIsSearching(false);
    // Reset to future events when clearing search
    setShowPastEvents(false);
  };

  return (
    <main className="mh-events-page modernist-home">
      <section className="mh-events-hero" aria-label="Events">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>KCNJ calendar</span>
          </div>
          <h1>All Events</h1>
          <p className="mh-events-hero-lede">
            Tickets, registration and the whole schedule in one place.
          </p>
        </div>
      </section>

      <div className="mh-events-body">
        {/* Toolbar: title, toggle, hint, search */}
        <div className="mh-events-toolbar">
          <div className="mh-events-head">
            <h2>{showPastEvents ? 'Past Events' : 'Upcoming Events'}</h2>
            <div
              className={`mh-events-toggle ${showPastEvents ? 'mh-events-toggle--past' : 'mh-events-toggle--future'}`}
              role="group"
              aria-label="Event time filter"
            >
              <span
                className={`mh-events-toggle-label mh-events-toggle-label--future ${!showPastEvents ? 'is-active' : ''}`}
              >
                Future Events
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPastEvents(!showPastEvents);
                  setPage(0); // Reset to first page when switching
                }}
                className={`mh-events-toggle-btn ${showPastEvents ? 'is-past' : ''}`}
                title={showPastEvents ? 'Show Future Events' : 'Show Past Events'}
                aria-label={showPastEvents ? 'Show Future Events' : 'Show Past Events'}
                aria-pressed={showPastEvents}
              >
                <span className="mh-events-toggle-thumb" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d={
                        showPastEvents
                          ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                          : 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                      }
                    />
                  </svg>
                </span>
              </button>
              <span
                className={`mh-events-toggle-label mh-events-toggle-label--past ${showPastEvents ? 'is-active' : ''}`}
              >
                Past Events
              </span>
            </div>
          </div>

          <p className="mh-events-hint">
            {showPastEvents
              ? 'Showing past events (events that have already ended).'
              : 'Showing future events (including events happening today).'}
          </p>

          {/* Search */}
          <div className="mh-events-search">
            <div>
              <label htmlFor="searchTitle">Search by Title</label>
              <input
                type="text"
                id="searchTitle"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Enter event title..."
              />
            </div>

            <div>
              <label>Date Range</label>
              <div className="mh-events-search-dates">
                <div>
                  <label htmlFor="searchDateFrom">From</label>
                  <input
                    type="date"
                    id="searchDateFrom"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="searchDateTo">To</label>
                  <input
                    type="date"
                    id="searchDateTo"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mh-events-search-actions">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || isSearching}
                className="mh-btn mh-btn-primary"
                title="Search"
                aria-label="Search"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {loading || isSearching ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                onClick={clearSearch}
                className="mh-btn mh-btn-calendar"
                title="Clear"
                aria-label="Clear search"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear
              </button>
            </div>

            {(searchTitle || searchDateFrom || searchDateTo) && (
              <p className="mh-events-search-active">
                <strong>Search active:</strong>
                {searchTitle && ` Title contains "${searchTitle}"`}
                {searchTitle && (searchDateFrom || searchDateTo) && ' and'}
                {searchDateFrom && searchDateTo && ` date between "${searchDateFrom}" and "${searchDateTo}"`}
                {searchDateFrom && !searchDateTo && ` date from "${searchDateFrom}" onwards`}
                {!searchDateFrom && searchDateTo && ` date until "${searchDateTo}"`}
                {(searchDateFrom || searchDateTo) && ' (overrides the Future/Past toggle)'}
              </p>
            )}
          </div>
        </div>

        {/* Info box when there are no events at all (both future and past) */}
        {!loading && hasCheckedInitialLoad && futureEventCount === 0 && pastEventCount === 0 && events.length === 0 && !fetchError && (
          <div className="mh-events-banner mh-events-banner--info">
            <h3>There are no events listed yet.</h3>
            <p>Please check back again. New events will appear here once they are created. Please use the future / past events switch above.</p>
          </div>
        )}

        {/* Message above table when showing past events because no future events exist */}
        {!loading && hasCheckedInitialLoad && showPastEvents && futureEventCount === 0 && pastEventCount > 0 && !fetchError && (
          <div className="mh-events-banner">
            <p>Here is the list of recent events. New future events will be added soon. Please use the future / past events switch above.</p>
          </div>
        )}

        {/* Info box when showing future events but there are no future events */}
        {!loading && hasCheckedInitialLoad && !showPastEvents && futureEventCount === 0 && events.length === 0 && !fetchError && (
          <div className="mh-events-banner mh-events-banner--info">
            <h3>No future events created.</h3>
            <p>Please use the future / past events switch above.</p>
          </div>
        )}

        {loading ? (
          <div className="mh-events-loading">Loading events…</div>
        ) : fetchError ? (
          <div className="mh-events-error">
            Sorry, we couldn't load events at this time. Please try again later.
          </div>
        ) : events.length === 0 && (hasCheckedInitialLoad && !(futureEventCount === 0 && pastEventCount === 0) && !(futureEventCount === 0 && !showPastEvents)) ? (
          <div className="mh-events-empty">No events found.</div>
        ) : (
          <>
            <div className="mh-events-grid">
              {events.map((event) => {
                // Compute date/status flags once per event
                let isUpcomingLocal = false;
                if (event.startDate) {
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const eventDateStr = event.startDate.split('T')[0];
                  isUpcomingLocal = eventDateStr >= todayStr;
                }

                const showRegisterButton = event.isRegistrationRequired === true && isUpcomingLocal;
                const buyTicketsTarget = isUpcomingLocal ? resolveBuyTicketsTarget(event) : null;
                // Donation-based events (not ticketed fundraiser)
                const showDonationButton = isDonationBasedEvent(event) && isUpcomingLocal && !isTicketedFundraiserEvent(event);

                const isLongDescription = !!event.description && event.description.length > 200;

                // Calendar link — only for upcoming events with valid start date/time
                let calendarLink: string | null = null;
                if (!showPastEvents && event.startDate && event.startTime && isUpcomingLocal) {
                  const start = toGoogleCalendarDate(event.startDate, event.startTime);
                  const end = toGoogleCalendarDate(event.endDate || event.startDate, event.endTime || event.startTime);
                  if (start && end) {
                    const text = encodeURIComponent(event.title);
                    const details = encodeURIComponent(event.description || '');
                    const location = encodeURIComponent(event.location || '');
                    calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
                  }
                }

                return (
                  <article className="mh-event-card" key={event.id}>
                    <figure className="mh-event-card-media">
                      <Image
                        src={event.thumbnailUrl || "/images/default event image.png"}
                        alt={event.title || "Event image"}
                        width={1600}
                        height={900}
                        sizes="100vw"
                        className="mh-event-card-media-img"
                      />
                      {showPastEvents && (
                        <span className="mh-event-card-badge">Past Event</span>
                      )}
                    </figure>

                    <div className="mh-event-card-body">
                    <div className="mh-event-card-meta">
                      <span className="mh-event-card-date">{formatDate(event.startDate, event.timezone)}</span>
                      {event.admissionType && (
                        <span
                          className={`mh-event-card-admission ${
                            /ticket|paid|paid admission/i.test(event.admissionType)
                              ? 'mh-event-card-admission--ticketed'
                              : /free|donation/i.test(event.admissionType)
                                ? 'mh-event-card-admission--free'
                                : 'mh-event-card-admission--default'
                          }`}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                            />
                          </svg>
                          {event.admissionType}
                        </span>
                      )}
                    </div>

                    <h3>{event.title}</h3>

                    {event.caption && (
                      <p className="mh-event-card-caption">{event.caption}</p>
                    )}

                    {(event.location || event.startTime) && (
                      <p className="mh-event-card-where">
                        {event.location}
                        {event.location && event.startTime && ' · '}
                        {event.startTime && `${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ''} (EDT)`}
                        {event.location && (
                          <span className="mh-event-card-loc-tools">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(event.location || '');
                                alert('Address copied to clipboard!');
                              }}
                              className="mh-event-icon-btn mh-event-icon-btn--copy"
                              title="Copy Address"
                              aria-label="Copy address to clipboard"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mh-event-icon-btn mh-event-icon-btn--maps"
                              title="Open in Google Maps"
                              aria-label="Open location in Google Maps"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </a>
                          </span>
                        )}
                      </p>
                    )}

                    {event.description && (
                      <DescriptionDisplay
                        description={event.description}
                        isExpanded={expandedDescriptions[event.id!] || false}
                        onToggle={() => {
                          setExpandedDescriptions(prev => ({
                            ...prev,
                            [event.id!]: !prev[event.id!]
                          }));
                        }}
                      />
                    )}

                    <div className="mh-event-card-actions">
                      {isLongDescription && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDescriptions(prev => ({
                              ...prev,
                              [event.id!]: !prev[event.id!]
                            }));
                          }}
                          className="mh-btn mh-btn-readmore"
                          title={expandedDescriptions[event.id!] ? "Show Less" : "Read More"}
                          aria-label={expandedDescriptions[event.id!] ? "Show Less" : "Read More"}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          {expandedDescriptions[event.id!] ? "Show Less" : "Read More"}
                        </button>
                      )}

                      {calendarLink && (
                        <a
                          href={calendarLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mh-btn mh-btn-calendar"
                          title="Add to Calendar"
                          aria-label="Add to Calendar"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Add to Calendar
                        </a>
                      )}

                      <Link
                        href={`/events/${event.id}`}
                        className="mh-btn mh-btn-details"
                        title="See Event Details"
                        aria-label="See Event Details"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        See Event Details
                      </Link>

                      {showRegisterButton && (
                        <Link
                          href={`/events/${event.id}/register`}
                          className="mh-btn mh-btn-register"
                          title="Register"
                          aria-label="Register"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Register
                        </Link>
                      )}

                      {buyTicketsTarget && (
                        <Link
                          href={buyTicketsTarget.href}
                          className="mh-btn mh-btn-tickets"
                          title="Buy Tickets"
                          aria-label="Buy Tickets"
                          {...(buyTicketsTarget.kind === 'external'
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                          Buy Tickets
                        </Link>
                      )}

                      {showDonationButton && (
                        <Link
                          href={`/events/${event.id}/donation`}
                          className="mh-btn mh-btn-donate"
                          title="Make a Donation"
                          aria-label="Make a Donation"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Make a Donation
                        </Link>
                      )}
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls - Always visible */}
            {!loading && (
              <div className="mh-events-pagination">
                <div className="mh-events-pagination-row">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="mh-btn mh-btn-readmore mh-events-page-btn"
                    title="Previous Page"
                    aria-label="Previous Page"
                    type="button"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>

                  <div className="mh-events-page-info">
                    Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                  </div>

                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMoreEvents || loading}
                    className="mh-btn mh-btn-readmore mh-events-page-btn"
                    title="Next Page"
                    aria-label="Next Page"
                    type="button"
                  >
                    Next
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mh-events-count">
                  {totalCount > 0 ? (
                    <>
                      Showing <strong>{displayedCount > 0 ? page * EVENTS_PAGE_SIZE + 1 : 0}</strong> to <strong>{displayedCount > 0 ? page * EVENTS_PAGE_SIZE + displayedCount : 0}</strong> of <strong>{totalCount}</strong> event{totalCount !== 1 ? 's' : ''}
                      {totalCount > displayedCount && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                          ({displayedCount} events displayed after filtering recurring events - grouped by series)
                        </span>
                      )}
                    </>
                  ) : (
                    'No events found'
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
