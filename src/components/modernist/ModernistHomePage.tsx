'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventDetailsDTO, EventSponsorsDTO, ExecutiveCommitteeTeamMemberDTO } from '@/types';
import {
  computeFeaturedEventsFromMedia,
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
import { useTenantSettings } from '@/components/TenantSettingsProvider';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { useEventsData } from '@/hooks/useEventsData';
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

function isUpcomingStartDate(startDate?: string): boolean {
  if (!startDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = startDate.split('-').map(Number);
  if (!year || !month || !day) return false;
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);
  return start >= today;
}

function plainTextFromHtml(value?: string | null, maxLength = 180): string {
  if (!value) return '';
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, '');
  return `${clipped || text.slice(0, maxLength)}…`;
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

function ContactSection() {
  const { settings } = useTenantSettings();
  const rawEmail = settings?.email?.trim() || '';
  const contactEmail =
    rawEmail.toLowerCase() === 'contactus@kcnj.org' ? 'keralacenternj@gmail.com' : rawEmail;
  const contactPhone = settings?.phoneNumber?.trim() || '';
  const hasAnySocial =
    settings?.facebookUrl?.trim() ||
    settings?.instagramUrl?.trim() ||
    settings?.twitterUrl?.trim() ||
    settings?.linkedinUrl?.trim() ||
    settings?.youtubeUrl?.trim() ||
    settings?.tiktokUrl?.trim();

  return (
    <section id="contact" className="mh-section mh-contact" aria-label="Get in touch">
      <div className="mh-section-head" style={{ marginBottom: 12 }}>
        <span id="contact-label" className="mh-eyebrow">Contact</span>
      </div>
      <h2 className="mh-h2 mh-home-events-heading">Get in Touch</h2>
      <p className="mh-home-events-lede mh-contact-lede">
        Connect with us to learn more about our community initiatives and how you can get involved
        in preserving and promoting Malayali culture across the United States. Join us in fostering
        cultural exchange and building stronger connections within our diverse communities.
      </p>

      <div className="mh-contact-grid">
        <div className="mh-contact-card group">
          <div className="mh-contact-card-inner">
            <div className="mh-contact-icon mh-contact-icon--location">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h3>Location</h3>
              <p>
                Kerala Center of New Jersey
                <br />
                New Jersey, USA
              </p>
            </div>
          </div>
        </div>

        {contactPhone ? (
          <div className="mh-contact-card group">
            <div className="mh-contact-card-inner">
              <div className="mh-contact-icon mh-contact-icon--phone">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <h3>Phone</h3>
                <p>
                  <a href={`tel:${contactPhone.replace(/\s/g, '')}`}>{contactPhone}</a>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {contactEmail ? (
          <div className="mh-contact-card group">
            <div className="mh-contact-card-inner">
              <div className="mh-contact-icon mh-contact-icon--email">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3>Email</h3>
                <p>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {hasAnySocial ? (
          <div className="mh-contact-card group">
            <div className="mh-contact-card-inner">
              <div className="mh-contact-icon mh-contact-icon--social">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 4h6"
                  />
                </svg>
              </div>
              <div>
                <h3>Social Media</h3>
                <div className="mh-contact-social-row">
                  {settings?.facebookUrl?.trim() && (
                    <a
                      href={settings.facebookUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--facebook"
                      title="Follow us on Facebook"
                      aria-label="Follow us on Facebook"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                  {settings?.instagramUrl?.trim() && (
                    <a
                      href={settings.instagramUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--instagram"
                      title="Follow us on Instagram"
                      aria-label="Follow us on Instagram"
                    >
                      <InstagramIcon className="w-6 h-6" />
                    </a>
                  )}
                  {settings?.twitterUrl?.trim() && (
                    <a
                      href={settings.twitterUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--twitter"
                      title="Follow us on X (Twitter)"
                      aria-label="Follow us on X (Twitter)"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {settings?.linkedinUrl?.trim() && (
                    <a
                      href={settings.linkedinUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--linkedin"
                      title="Connect with us on LinkedIn"
                      aria-label="Connect with us on LinkedIn"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  )}
                  {settings?.youtubeUrl?.trim() && (
                    <a
                      href={settings.youtubeUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--youtube"
                      title="Subscribe to our YouTube channel"
                      aria-label="Subscribe to our YouTube channel"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  )}
                  {settings?.tiktokUrl?.trim() && (
                    <a
                      href={settings.tiktokUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mh-contact-social-btn mh-contact-social-btn--tiktok"
                      title="Follow us on TikTok"
                      aria-label="Follow us on TikTok"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mh-contact-cta">
        <div className="mh-contact-cta-pill">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>Ready to connect? Reach out and join our vibrant community</span>
        </div>
      </div>
    </section>
  );
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

function LiveEventsModernist({ items }: { items: FeaturedEventWithMedia[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mh-featured-block mh-live-block">
      <div className="mh-featured-section-head">
        <div className="mh-section-head">
          <span className="mh-eyebrow">Live now</span>
          <Link href="/events" className="mh-link">
            All events →
          </Link>
        </div>
        <h2 className="mh-h2 mh-featured-section-title">Live Events</h2>
      </div>

      {items.map((item) => {
        const { event } = item;
        const imageUrl = getFeaturedEventImageUrl(item);
        const timeLabel = formatEventTime(event.startTime, event.endTime);
        const desc = (event.description || '').replace(/<[^>]+>/g, '').trim();

        return (
          <section
            key={`live-${event.id ?? event.title}`}
            className="mh-featured"
            aria-label={`Live event: ${event.title}`}
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
                  No event image yet
                </div>
              )}
              <span className="mh-live-badge" role="status" aria-label="Live now">
                <span className="mh-live-badge-dot" aria-hidden />
                Live
              </span>
            </figure>

            <div className="mh-featured-body">
              <div className="mh-featured-kicker">
                <span className="mh-dot" aria-hidden />
                <span className="mh-eyebrow" style={{ margin: 0 }}>
                  Happening today
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
              </div>

              <div className="mh-featured-actions">
                <Link href={eventHref(event)} className="mh-btn mh-btn-primary">
                  View event
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
  initialLiveEvents,
}: {
  initialFeaturedEvents: FeaturedEventWithMedia[];
  initialLiveEvents: FeaturedEventWithMedia[];
}) {
  const [team, setTeam] = useState<ExecutiveCommitteeTeamMemberDTO[]>([]);
  const [sponsors, setSponsors] = useState<EventSponsorsDTO[]>([]);

  const featuredFetchEnabled = useDeferredFetch(400);
  const {
    eventsWithMedia,
    upcomingEvents,
    isLoading: featuredLoading,
  } = useEventsData(featuredFetchEnabled);

  const clientFeatured = useMemo(
    () => computeFeaturedEventsFromMedia(eventsWithMedia),
    [eventsWithMedia]
  );

  const featuredItems =
    !featuredLoading && clientFeatured.length > 0
      ? clientFeatured.slice(0, MAX_FEATURED_EVENTS_HOMEPAGE)
      : initialFeaturedEvents.slice(0, MAX_FEATURED_EVENTS_HOMEPAGE);
  const featuredEvent = featuredItems[0]?.event ?? null;
  const upcomingFeaturedEvent =
    featuredItems.find((item) => isUpcomingStartDate(item.event.startDate))?.event ?? null;
  const closeCtaEvent = upcomingFeaturedEvent ?? upcomingEvents[0] ?? featuredEvent ?? null;
  const closeCtaHeading = closeCtaEvent?.title?.trim() || 'Browse upcoming events';
  const closeCtaLede =
    (closeCtaEvent &&
      (plainTextFromHtml(closeCtaEvent.description) ||
        closeCtaEvent.caption?.trim() ||
        [closeCtaEvent.location, formatEventDate(closeCtaEvent.startDate, closeCtaEvent.timezone)]
          .filter(Boolean)
          .join(' · '))) ||
    'Community nights and cultural celebrations will appear here as they are published.';
  const closeCtaIsTicketed = closeCtaEvent
    ? admissionLabel(closeCtaEvent) === 'Ticketed'
    : false;

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

      {/* Live events happening today */}
      <LiveEventsModernist items={initialLiveEvents} />

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
          <span id="about-us-label" className="mh-eyebrow" style={{ marginBottom: 14 }}>
            About the foundation
          </span>
          <h2>Preserve and promote the rich cultural heritage of Kerala</h2>
        </div>
        <div className="mh-about-copy">
          <p>
            Kerala Center of New Jersey (KCNJ) is a vibrant,
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
              Kerala Center of New Jersey (KCNJ)
            </p>
            <p className="mh-about-legal-contact">
              New Jersey, USA ·{' '}
              <a href="tel:+19734826159">(973) 482-6159</a> ·{' '}
              <a href="mailto:keralacenternj@gmail.com">keralacenternj@gmail.com</a>
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
            The volunteers who keep KCNJ&apos;s cultural calendar and community work moving.
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

      {/* Close CTA — title + description from featured (upcoming) or next upcoming event */}
      <section className="mh-close" aria-label="Call to action">
        <p className="mh-close-kicker">Join us</p>
        <h3>
          <span style={{ display: 'block' }}>{closeCtaHeading}</span>
        </h3>
        <p className="mh-close-lede">{closeCtaLede}</p>
        <div className="mh-cta-row">
          <Link
            href={closeCtaEvent ? eventHref(closeCtaEvent) : '/events'}
            className="mh-btn mh-btn-on-dark mh-close-cta-primary"
            title={
              closeCtaEvent
                ? `${closeCtaIsTicketed ? 'Get tickets' : 'View event'} for ${closeCtaEvent.title}`
                : 'Browse events'
            }
            aria-label={
              closeCtaEvent
                ? `${closeCtaIsTicketed ? 'Get tickets' : 'View event'} for ${closeCtaEvent.title}`
                : 'Browse events'
            }
          >
            {closeCtaEvent ? (closeCtaIsTicketed ? 'Get tickets' : 'View event') : 'Browse events'}
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

        <div className="mh-home-sponsors-footer">
          <Link href="/sponsors" className="mh-link">
            See all sponsors →
          </Link>
        </div>
      </section>

      <ContactSection />
    </main>
  );
}
