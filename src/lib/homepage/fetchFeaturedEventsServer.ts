import { getAppUrlFromRequestHeaders, getTenantId } from '@/lib/env';
import type { EventDetailsDTO } from '@/types';
import {
  computeFeaturedEventsFromMedia,
  isPastHomepageEvent,
  MAX_FEATURED_EVENTS_HOMEPAGE,
  selectHomepageFeaturedEvents,
  type EventWithMedia,
  type FeaturedEventWithMedia,
} from '@/lib/homepage/featuredEvents';
import {
  isTruthyApiFlag,
  normalizeEventDetailsList,
  normalizeEventMediasList,
} from '@/lib/homepage/homepageApiNormalize';

function isEventInNextYear(eventDate: string, today: Date): boolean {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  oneYearFromNow.setHours(23, 59, 59, 999);
  const [year, month, day] = eventDate.split('-').map(Number);
  const eventStartDate = new Date(year, month - 1, day);
  eventStartDate.setHours(0, 0, 0, 0);
  return eventStartDate >= today && eventStartDate <= oneYearFromNow;
}

/**
 * Server-only: same pipeline as `useEventsData` + featured filter, for SSR first paint.
 * Fails closed to [] so the home page still renders if the API is down.
 */
export async function fetchFeaturedEventsForHomepageServer(): Promise<FeaturedEventWithMedia[]> {
  try {
    const baseUrl = await getAppUrlFromRequestHeaders();
    const tenantId = getTenantId();

    let eventsResponse = await fetch(
      `${baseUrl}/api/proxy/event-details?tenantId.equals=${encodeURIComponent(tenantId)}&sort=startDate,asc`,
      { cache: 'no-store' }
    );

    if (!eventsResponse.ok) {
      eventsResponse = await fetch(
        `${baseUrl}/api/proxy/event-details?tenantId.equals=${encodeURIComponent(tenantId)}&sort=startDate,desc`,
        { cache: 'no-store' }
      );
    }

    if (!eventsResponse.ok) {
      console.warn('[fetchFeaturedEventsForHomepageServer] event-details failed:', eventsResponse.status);
      return [];
    }

    const events = normalizeEventDetailsList(await eventsResponse.json());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isFeaturedEvent = (event: EventDetailsDTO) =>
      isTruthyApiFlag((event as EventDetailsDTO & { is_featured_event?: unknown }).isFeaturedEvent) ||
      isTruthyApiFlag((event as EventDetailsDTO & { is_featured_event?: unknown }).is_featured_event);

    const upcomingEvents = events.filter(
      (event) => event.startDate && isEventInNextYear(event.startDate, today) && event.isActive !== false
    );
    const upcomingFeatured = upcomingEvents.filter(isFeaturedEvent);

    // Upcoming featured first. Past featured only when there are no future events.
    const eventsToLoad =
      upcomingFeatured.length > 0
        ? upcomingFeatured
        : upcomingEvents.length === 0
          ? events.filter(
              (event) => event.isActive !== false && isPastHomepageEvent(event) && isFeaturedEvent(event)
            )
          : [];

    if (eventsToLoad.length === 0) {
      return [];
    }

    const eventsWithMedia: EventWithMedia[] = [];

    for (const event of eventsToLoad) {
      try {
        // Prefer dedicated featured-image media, then fall back to all event media
        let mediaResponse = await fetch(
          `${baseUrl}/api/proxy/event-medias?tenantId.equals=${encodeURIComponent(tenantId)}&eventId.equals=${event.id}&isFeaturedEventImage.equals=true`,
          { cache: 'no-store' }
        );
        let mediaArray = mediaResponse.ok
          ? normalizeEventMediasList(await mediaResponse.json())
          : [];

        if (mediaArray.length === 0) {
          mediaResponse = await fetch(
            `${baseUrl}/api/proxy/event-medias?tenantId.equals=${encodeURIComponent(tenantId)}&eventId.equals=${event.id}&isHomePageHeroImage.equals=true`,
            { cache: 'no-store' }
          );
          mediaArray = mediaResponse.ok
            ? normalizeEventMediasList(await mediaResponse.json())
            : [];
        }

        if (mediaArray.length === 0) {
          mediaResponse = await fetch(
            `${baseUrl}/api/proxy/event-medias?tenantId.equals=${encodeURIComponent(tenantId)}&eventId.equals=${event.id}&isHeroImage.equals=true`,
            { cache: 'no-store' }
          );
          mediaArray = mediaResponse.ok
            ? normalizeEventMediasList(await mediaResponse.json())
            : [];
        }

        if (mediaArray.length === 0) {
          mediaResponse = await fetch(
            `${baseUrl}/api/proxy/event-medias?tenantId.equals=${encodeURIComponent(tenantId)}&eventId.equals=${event.id}&size=50`,
            { cache: 'no-store' }
          );
          mediaArray = mediaResponse.ok
            ? normalizeEventMediasList(await mediaResponse.json())
            : [];
        }

        eventsWithMedia.push({ event, media: mediaArray });
      } catch {
        eventsWithMedia.push({ event, media: [] });
      }
    }

    return selectHomepageFeaturedEvents(
      computeFeaturedEventsFromMedia(eventsWithMedia),
      upcomingEvents.length > 0,
      MAX_FEATURED_EVENTS_HOMEPAGE
    );
  } catch (e) {
    console.warn('[fetchFeaturedEventsForHomepageServer]', e);
    return [];
  }
}
