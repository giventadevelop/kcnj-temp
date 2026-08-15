'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventDetailsDTO, EventSponsorsDTO, ExecutiveCommitteeTeamMemberDTO } from '@/types';
import {
  getFeaturedEventImageUrl,
  MAX_FEATURED_EVENTS_HOMEPAGE,
  mediaImageUrl,
  type FeaturedEventWithMedia,
} from '@/lib/homepage/featuredEvents';
import { normalizeEventMediasList } from '@/lib/homepage/homepageApiNormalize';
import { parseExecutiveCommitteeTeamMembersResponse } from '@/lib/parseExecutiveCommitteeTeamMembersResponse';
import GivebutterDonateButton from '@/components/GivebutterDonateButton';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import ModernistPosterHero from '@/components/modernist/ModernistPosterHero';
import { useFilteredEvents } from '@/hooks/useFilteredEvents';
import { useDeferredFetch } from '@/hooks/usePageReady';
import '@/styles/modernist-homepage.css';

const SERVICES = [
  {
    num: '01',
    title: 'Traditional Dance & Music',
    description: 'Experience the rich heritage of Kerala through dance and music workshops.',
  },
  {
    num: '02',
    title: 'Art & Craft Workshops',
    description: 'Learn traditional Kerala art forms and crafts through hands-on workshops.',
  },
  {
    num: '03',
    title: 'Kerala Folklore and Tribal Traditions',
    description: 'Introduce lesser-known folk dances like Theyyam, Padayani, and Poothan Thira.',
  },
  {
    num: '04',
    title: 'Kerala Cuisine Classes',
    description: 'Master the art of traditional Kerala cooking with expert chefs.',
  },
];

function formatEventDate(dateString?: string, timezone?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(`${dateString}T12:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: timezone || undefined,
    });
  } catch {
    return dateString;
  }
}

function admissionLabel(event: EventDetailsDTO): string {
  const raw = (event.admissionType || '').toUpperCase();
  if (raw.includes('DONAT') || raw.includes('CHARITY')) return 'Charity';
  if (raw.includes('TICKET') || raw.includes('PAID')) return 'Ticketed';
  if (raw.includes('FREE') || !raw) return 'Free';
  return event.admissionType || 'Free';
}

function eventHref(event: EventDetailsDTO): string {
  return event.id ? `/events/${event.id}` : '/events';
}

function parseSponsorList(data: unknown): EventSponsorsDTO[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as EventSponsorsDTO[];
  }
  return [];
}

function IconSponsorDetails() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function IconSponsorVisit() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function sponsorWebsiteHref(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

async function resolveSponsorBanner(sponsor: EventSponsorsDTO): Promise<EventSponsorsDTO> {
  if (!sponsor.id) {
    return {
      ...sponsor,
      bannerImageUrl:
        sponsor.bannerImageUrl || sponsor.heroImageUrl || sponsor.logoUrl || undefined,
    };
  }

  try {
    const bannerParams = new URLSearchParams({
      'sponsorId.equals': String(sponsor.id),
      'eventMediaType.equals': 'SPONSOR_BANNER',
      sort: 'priorityRanking,asc',
      size: '3',
    });
    const bannerRes = await fetch(`/api/proxy/event-medias?${bannerParams.toString()}`, {
      cache: 'no-store',
    });
    if (bannerRes.ok) {
      const media = normalizeEventMediasList(await bannerRes.json());
      for (const row of media) {
        const url = mediaImageUrl(row);
        if (url) {
          return { ...sponsor, bannerImageUrl: url };
        }
      }
    }
  } catch {
    /* fall through */
  }

  return {
    ...sponsor,
    bannerImageUrl:
      sponsor.bannerImageUrl || sponsor.heroImageUrl || sponsor.logoUrl || undefined,
  };
}

function WhatWeDoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className={`mh-section mh-services${visible ? ' mh-services--in' : ''}`}
      aria-label="What we do"
    >
      <span className="mh-eyebrow mh-services-eyebrow">What we do</span>
      <h2 className="mh-h2 mh-services-heading">Cultural workshops and educational events</h2>
      <div className="mh-services-grid">
        {SERVICES.map((s, index) => (
          <article
            key={s.num}
            className="mh-service-card"
            style={{ ['--mh-stagger' as string]: String(index) }}
          >
            <div className="mh-service-card-accent" aria-hidden />
            <div className="mh-service-card-top">
              <span className="mh-dot" aria-hidden />
              <p className="mh-services-num">{s.num}</p>
            </div>
            <h3 className="mh-services-title">{s.title}</h3>
            <p className="mh-services-desc">{s.description}</p>
            <span className="mh-service-card-rule" aria-hidden />
          </article>
        ))}
      </div>
    </section>
  );
}

function formatEventTime(startTime?: string, endTime?: string): string | null {
  if (!startTime && !endTime) return null;
  if (startTime && endTime) return `${startTime} — ${endTime}`;
  return startTime || endTime || null;
}

function FeaturedEventsModernist({ items }: { items: FeaturedEventWithMedia[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mh-featured-block">
      <div className="mh-featured-section-head">
        <div className="mh-section-head">
          <span className="mh-eyebrow">Featured</span>
          <Link href="/events" className="mh-link">
            All events →
          </Link>
        </div>
        <h2 className="mh-h2 mh-featured-section-title">Featured Events</h2>
      </div>

      {items.map((item) => {
        const { event } = item;
        const imageUrl = getFeaturedEventImageUrl(item);
        const timeLabel = formatEventTime(event.startTime, event.endTime);
        const desc = (event.description || '').replace(/<[^>]+>/g, '').trim();

        return (
          <section
            key={event.id ?? event.title}
            className="mh-featured"
            aria-label={`Featured event: ${event.title}`}
          >
            <figure className="mh-featured-media">
              {imageUrl ? (
                <Link
                  href={eventHref(event)}
                  className="mh-featured-media-link"
                  title={`View ${event.title}`}
                  aria-label={`View ${event.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote event media URLs (S3/presign) */}
                  <img
                    src={imageUrl}
                    alt={item.media?.altText || event.title}
                  />
                </Link>
              ) : (
                <div className="mh-empty" style={{ padding: 48, textAlign: 'center' }}>
                  No featured image yet
                </div>
              )}
            </figure>

            <div className="mh-featured-body">
              <div className="mh-featured-kicker">
                <span className="mh-dot" aria-hidden />
                <span className="mh-eyebrow" style={{ margin: 0 }}>
                  Featured event
                </span>
              </div>

              <h2>{event.title}</h2>

              {desc ? (
                <p className="mh-featured-lede">
                  {desc.slice(0, 220)}
                  {desc.length > 220 ? '…' : ''}
                </p>
              ) : null}

              <div className="mh-featured-meta">
                {event.startDate && (
                  <div className="mh-featured-meta-row">
                    <span className="mh-featured-meta-label">Date</span>
                    <span className="mh-featured-meta-value">
                      {formatEventDate(event.startDate, event.timezone)}
                    </span>
                  </div>
                )}
                {timeLabel && (
                  <div className="mh-featured-meta-row">
                    <span className="mh-featured-meta-label">Time</span>
                    <span className="mh-featured-meta-value">{timeLabel}</span>
                  </div>
                )}
                {event.location && (
                  <div className="mh-featured-meta-row">
                    <span className="mh-featured-meta-label">Venue</span>
                    <span className="mh-featured-meta-value">{event.location}</span>
                  </div>
                )}
                <div className="mh-featured-meta-row">
                  <span className="mh-featured-meta-label">Admission</span>
                  <span className="mh-featured-meta-value">
                    {admissionLabel(event)}
                    {event.isRegistrationRequired ? ' · registration required' : ''}
                  </span>
                </div>
              </div>

              <div className="mh-featured-actions">
                <Link href={eventHref(event)} className="mh-btn mh-btn-primary">
                  {admissionLabel(event) === 'Ticketed' ? 'Get tickets' : 'View event'}
                </Link>
                <Link href="/events" className="mh-btn mh-btn-secondary">
                  All events
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function ModernistHomePage({
  initialFeaturedEvents,
}: {
  initialFeaturedEvents: FeaturedEventWithMedia[];
}) {
  const [team, setTeam] = useState<ExecutiveCommitteeTeamMemberDTO[]>([]);
  const [sponsors, setSponsors] = useState<EventSponsorsDTO[]>([]);

  const featuredFetchEnabled = useDeferredFetch(400);
  const { filteredEvents: clientFeatured, isLoading: featuredLoading } = useFilteredEvents(
    'featured',
    featuredFetchEnabled
  );

  const featuredItems =
    !featuredLoading && clientFeatured.length > 0
      ? clientFeatured.slice(0, MAX_FEATURED_EVENTS_HOMEPAGE)
      : initialFeaturedEvents.slice(0, MAX_FEATURED_EVENTS_HOMEPAGE);
  const featuredEvent = featuredItems[0]?.event ?? null;

  // Prefer a ticketed featured event for the on-sale band; otherwise any featured event
  const onSaleEvent =
    (featuredEvent && admissionLabel(featuredEvent) === 'Ticketed' ? featuredEvent : null) ||
    featuredEvent ||
    null;

  // Always load executive team for homepage (shown for now; tenant flags may lag in cache).
  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      try {
        const res = await fetch(
          '/api/proxy/executive-committee-team-members?isActive.equals=true&sort=priorityOrder,asc',
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('team fetch failed');
        const data = await res.json();
        if (!cancelled) {
          setTeam(parseExecutiveCommitteeTeamMembersResponse(data).slice(0, 6));
        }
      } catch (err) {
        console.error('[ModernistHomePage] team:', err);
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, []);

  // Always load sponsors for homepage (section is shown at bottom for now).
  // Proxy injects tenantId — do not add tenantId.equals here.
  useEffect(() => {
    let cancelled = false;

    async function loadSponsors() {
      try {
        const params = new URLSearchParams({
          'isActive.equals': 'true',
          sort: 'priorityRanking,asc',
          size: '12',
        });
        const res = await fetch(`/api/proxy/event-sponsors?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('sponsors fetch failed');
        const data = await res.json();
        const limited = parseSponsorList(data).slice(0, 8);
        const withBanners = await Promise.all(limited.map((s) => resolveSponsorBanner(s)));
        if (!cancelled) setSponsors(withBanners);
      } catch (err) {
        console.error('[ModernistHomePage] sponsors:', err);
      }
    }

    loadSponsors();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="modernist-home">
      {/* Poster hero — rotation + left logo + fixed design copy (no media title overlays) */}
      <ModernistPosterHero />

      {/* 1b — Red on-sale band */}
      {onSaleEvent && (
        <section className="mh-onsale-band" aria-label="On sale now">
          <div className="mh-onsale-band-copy">
            <p className="mh-onsale-band-kicker">On sale now</p>
            <h2>{onSaleEvent.title}</h2>
            {(onSaleEvent.location || onSaleEvent.startDate) && (
              <p className="mh-onsale-band-meta">
                {[
                  onSaleEvent.location,
                  onSaleEvent.startDate
                    ? formatEventDate(onSaleEvent.startDate, onSaleEvent.timezone)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
          <Link href={eventHref(onSaleEvent)} className="mh-btn mh-btn-on-dark mh-onsale-band-cta">
            Get tickets
          </Link>
        </section>
      )}

      {/* Featured events — event.isFeaturedEvent checkbox from admin edit */}
      <FeaturedEventsModernist items={featuredItems} />

      {/* Upcoming / recent events — modernist card system (same layout as mcefee) */}
      <UpcomingEventsSection variant="modernist" />

      {/* 1a — What we do (interactive cards) */}
      <WhatWeDoSection />

      {/* 1a — About */}
      <section id="about-us" className="mh-about" aria-label="About the foundation">
        <div>
          <span className="mh-eyebrow" style={{ marginBottom: 14 }}>
            About the foundation
          </span>
          <h2>Preserve and promote the rich cultural heritage of Kerala</h2>
        </div>
        <div className="mh-about-copy">
          <p>
            The Unite India Corporation Foundation for Education and Events is a vibrant,
            community-driven organization based in New Jersey, USA, dedicated to reviving real
            Malayali culture, empowering the next generation through education, and offering a
            nostalgic sense of home to our community.
          </p>
          <p>
            Our mission is to preserve and promote the rich cultural heritage of Kerala while
            fostering a deeper connection among Malayalis in the USA, creating a sense of belonging
            and unity.
          </p>
          <div className="mh-about-legal">
            <p className="mh-eyebrow" style={{ color: 'var(--mh-neutral-700)' }}>
              Legal name
            </p>
            <p className="mh-about-legal-name">
              Malayali Cultural Exchange Foundation for Education and Events
            </p>
            <p className="mh-about-legal-contact">
              New Jersey, USA ·{' '}
              <a href="tel:+19085168781">(908) 516-8781</a> ·{' '}
              <a href="mailto:Contactus@mcefee.org">Contactus@mcefee.org</a>
            </p>
          </div>
        </div>
      </section>

      {/* Team — executive committee volunteers (same layout as mcefee; always shown for now) */}
      <section
          id="team-section"
          className="mh-section"
          aria-label="Team"
          style={{ paddingTop: 84, paddingBottom: 84 }}
        >
          <span className="mh-eyebrow" style={{ marginBottom: 14, display: 'block' }}>
            Team
          </span>
          <h2 className="mh-h2" style={{ marginBottom: 16 }}>
            Meet our the best volunteers team
          </h2>
          <p
            style={{
              margin: '0 0 48px',
              fontSize: 14,
              lineHeight: '24px',
              color: 'var(--mh-accent-700)',
              maxWidth: '60ch',
            }}
          >
            The volunteers who keep MCEFEE&apos;s cultural calendar and community work moving.
          </p>
          {team.length === 0 ? (
            <p className="mh-empty">Team members will appear here when available.</p>
          ) : (
            <div className="mh-team-grid">
              {team.map((m) => {
                const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.title;
                return (
                  <div key={m.id ?? name} className="mh-team-card">
                    <figure className="mh-team-photo">
                      {m.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.profileImageUrl} alt={name} />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'var(--mh-neutral-300)',
                          }}
                          aria-hidden
                        />
                      )}
                    </figure>
                    <h3 className="mh-team-name">{name}</h3>
                    <p className="mh-team-title">
                      {m.designation?.trim() || m.title?.trim() || '—'}
                    </p>
                    {(m.bio || m.expertise) && (
                      <p className="mh-team-bio">{m.expertise || m.bio}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      {/* 1a — Red CTA close */}
      <section className="mh-close" aria-label="Call to action">
        <p className="mh-close-kicker">Join us</p>
        <h3>
          <span style={{ display: 'block' }}>Save your seat at the sadhya.</span>
        </h3>
        <p className="mh-close-lede">
          Tickets, community nights, and cultural celebrations — all in one place.
        </p>
        <div className="mh-cta-row">
          <Link
            href={featuredEvent ? eventHref(featuredEvent) : '/events'}
            className="mh-btn mh-btn-on-dark mh-close-cta-primary"
            title={
              featuredEvent
                ? `Get tickets for ${featuredEvent.title}`
                : 'Browse events'
            }
            aria-label={
              featuredEvent
                ? `Get tickets for ${featuredEvent.title}`
                : 'Browse events'
            }
          >
            {featuredEvent ? 'Get tickets' : 'Browse events'}
          </Link>
          <GivebutterDonateButton className="mh-btn mh-btn-on-dark mh-close-cta-secondary">
            Donate
          </GivebutterDonateButton>
        </div>
      </section>

      {/* Our Sponsors — same layout as mcefee ModernistHomePage; Organic tokens; bottom of page for now */}
      <section
        className="mh-section mh-home-sponsors mh-section-tight-top"
        aria-label="Sponsors"
        style={{ paddingBottom: 84 }}
      >
        <div
          className="mh-section-head"
          style={{
            paddingTop: 42,
            borderTop: '2px solid var(--mh-divider)',
            marginBottom: 12,
          }}
        >
          <span className="mh-eyebrow">Sponsors</span>
          <Link href="/sponsors" className="mh-link">
            See all sponsors →
          </Link>
        </div>
        <h2 className="mh-h2 mh-home-events-heading">Our Sponsors</h2>
        <p className="mh-home-events-lede">
          Partners who help keep Malayali culture visible — thank you for supporting the calendar.
        </p>

        {sponsors.length === 0 ? (
          <p className="mh-empty">Sponsors will appear here when available.</p>
        ) : (
          <div className="mh-home-events-grid mh-home-sponsors-grid">
            {sponsors.map((sp) => {
              const title = sp.companyName || sp.name;
              const websiteHref = sponsorWebsiteHref(sp.websiteUrl);
              const imageSrc =
                sp.bannerImageUrl ||
                sp.heroImageUrl ||
                sp.logoUrl ||
                '/images/default event image.png';

              return (
                <article key={sp.id ?? sp.name} className="mh-event-card">
                  <figure className="mh-event-card-media mh-sponsor-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element -- sponsor S3/presign URLs */}
                    <img
                      src={imageSrc}
                      alt={title || 'Sponsor'}
                      className="mh-event-card-media-img"
                    />
                    {sp.type ? (
                      <span className="mh-event-card-badge">{sp.type}</span>
                    ) : null}
                  </figure>

                  <div className="mh-event-card-body">
                    <div className="mh-event-card-meta">
                      <span className="mh-event-card-date">{sp.type || 'Sponsor'}</span>
                      {sp.name && sp.companyName ? (
                        <span className="mh-event-card-admission mh-event-card-admission--default">
                          {sp.name}
                        </span>
                      ) : null}
                    </div>

                    <h3>{title}</h3>

                    {sp.tagline ? (
                      <p className="mh-event-card-caption">{sp.tagline}</p>
                    ) : null}

                    {sp.description ? (
                      <p className="mh-event-card-desc mh-event-card-desc--clamp">
                        {sp.description.replace(/<[^>]+>/g, '').trim()}
                      </p>
                    ) : null}

                    <div className="mh-event-card-actions">
                      {typeof sp.id !== 'undefined' && (
                        <Link
                          href={`/sponsors/${sp.id}`}
                          className="mh-btn mh-btn-details"
                          title={`See details for ${title}`}
                          aria-label={`See details for ${title}`}
                        >
                          <IconSponsorDetails />
                          See Sponsor Details
                        </Link>
                      )}
                      {websiteHref && (
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mh-btn mh-btn-tickets"
                          title={`Visit ${title}`}
                          aria-label={`Visit ${title} website`}
                        >
                          <IconSponsorVisit />
                          Visit website
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
