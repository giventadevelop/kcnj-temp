'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { EventSponsorsDTO, EventMediaDTO } from '@/types';
import { Camera, Video, Eye } from 'lucide-react';
import styles from '../../events/[id]/GalleryThumbnails.module.css';
import { EventMediaSlideshow } from '@/app/gallery/components/EventMediaSlideshow';
import { SponsorContactSocialIconRow } from '@/components/sponsors/SponsorCard';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import '@/styles/modernist-homepage.css';

const getMediaTypeIcon = (mediaType: string) => {
  if (mediaType.startsWith('video/')) {
    return <Video className="w-4 h-4" />;
  }
  return <Camera className="w-4 h-4" />;
};

function parseMediaList(mediaData: unknown): EventMediaDTO[] {
  if (
    mediaData &&
    typeof mediaData === 'object' &&
    '_embedded' in mediaData &&
    mediaData._embedded &&
    typeof mediaData._embedded === 'object' &&
    'eventMedias' in mediaData._embedded
  ) {
    const embedded = (mediaData._embedded as { eventMedias?: unknown }).eventMedias;
    return Array.isArray(embedded) ? embedded : [];
  }
  if (Array.isArray(mediaData)) return mediaData;
  if (mediaData && typeof mediaData === 'object') return [mediaData as EventMediaDTO];
  return [];
}

export default function SponsorDetailsPage() {
  const params = useParams();
  const sponsorId = params?.id;
  const [sponsor, setSponsor] = useState<EventSponsorsDTO | null>(null);
  const [media, setMedia] = useState<EventMediaDTO[]>([]);
  /** Resolved poster/banner URL (sponsor.bannerImageUrl or SPONSOR_BANNER media). */
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowInitialIndex, setSlideshowInitialIndex] = useState(0);
  const [bannerImageError, setBannerImageError] = useState(false);

  useLayoutEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      /* PublicOrganicDesignBody owns cleanup on route change */
    };
  }, []);

  useEffect(() => {
    async function fetchSponsorDetails() {
      if (!sponsorId) return;
      setLoading(true);
      setBannerImageError(false);
      try {
        const sponsorRes = await fetch(`/api/proxy/event-sponsors/${sponsorId}`);
        if (!sponsorRes.ok) {
          throw new Error('Failed to fetch sponsor');
        }
        const sponsorData: EventSponsorsDTO = await sponsorRes.json();
        setSponsor(sponsorData);

        // Prefer dedicated SPONSOR_BANNER media (same as homepage / list cards)
        let resolvedBanner = sponsorData.bannerImageUrl?.trim() || null;
        try {
          const bannerParams = new URLSearchParams({
            'sponsorId.equals': String(sponsorId),
            'eventMediaType.equals': 'SPONSOR_BANNER',
            sort: 'priorityRanking,asc',
            size: '1',
          });
          const bannerRes = await fetch(
            `/api/proxy/event-medias?${bannerParams.toString()}`,
            { cache: 'no-store' }
          );
          if (bannerRes.ok) {
            const bannerMedia = parseMediaList(await bannerRes.json());
            const firstBanner = bannerMedia.find((m) => m.fileUrl?.trim());
            if (firstBanner?.fileUrl) {
              resolvedBanner = firstBanner.fileUrl;
            }
          }
        } catch {
          /* keep sponsor.bannerImageUrl */
        }
        setBannerUrl(resolvedBanner);

        // Gallery media (exclude banner type when present)
        const mediaRes = await fetch(
          `/api/proxy/event-medias?sponsorId.equals=${sponsorId}&sort=priorityRanking,asc`
        );
        if (mediaRes.ok) {
          setMedia(parseMediaList(await mediaRes.json()));
        } else {
          setMedia([]);
        }
      } catch (err) {
        console.error('Error fetching sponsor details:', err);
        setSponsor(null);
        setMedia([]);
        setBannerUrl(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSponsorDetails();
  }, [sponsorId]);

  if (loading) {
    return (
      <div className="mh-event-detail-status">Loading sponsor details…</div>
    );
  }
  if (!sponsor) {
    return (
      <div className="mh-event-detail-status mh-event-detail-status--error">
        Sponsor not found.
      </div>
    );
  }

  const displayBannerUrl =
    !bannerImageError && bannerUrl ? bannerUrl : null;

  const gallery = media.filter((m) => {
    if (!m.fileUrl) return false;
    if (m.eventMediaType === 'SPONSOR_BANNER') return false;
    if (bannerUrl && m.fileUrl === bannerUrl) return false;
    return true;
  });
  const previewMedia = gallery.slice(0, 12);
  const remainingCount = Math.max(0, gallery.length - 12);

  const websiteUrl = sponsor.websiteUrl?.trim();
  const websiteHref =
    websiteUrl &&
    (websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://'))
      ? websiteUrl
      : websiteUrl
        ? `https://${websiteUrl}`
        : null;
  const websiteLabel = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, '')
    : '';

  return (
    <div className="mh-event-detail mh-sponsor-detail">
      {/* Shared page ribbon under header — same shell as /events and /sponsors */}
      <section className="mh-events-hero" aria-label="Sponsor">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>KCNJ partners</span>
          </div>
          <h1>{sponsor.name}</h1>
          <p className="mh-events-hero-lede">
            {sponsor.type
              ? `${sponsor.type} sponsor supporting our community.`
              : 'Partner supporting our community initiatives.'}
          </p>
        </div>
      </section>

      <div className="mh-event-detail-body">
        {/* Same full-width poster containment as /events mh-event-card-media */}
        {displayBannerUrl && (
          <figure
            className="mh-event-card-media mh-sponsor-detail-banner"
            aria-label="Sponsor banner"
          >
            <Image
              src={displayBannerUrl}
              alt={`${sponsor.name} Banner`}
              width={1600}
              height={900}
              className="mh-event-card-media-img"
              priority
              sizes="(min-width: 1100px) 1100px, 100vw"
              onError={() => setBannerImageError(true)}
            />
          </figure>
        )}

        <div className="mh-event-detail-panel">
          <div className="flex flex-col h-full">
            <div className="mh-event-detail-panel-inner relative">
              {websiteHref && (
                <div className="mh-event-detail-cta-stack absolute top-4 right-4 lg:top-6 lg:right-6 z-10 flex flex-col gap-2">
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mh-btn mh-btn-primary mh-event-detail-cta"
                    title="Visit Website"
                    aria-label={`Visit ${sponsor.name} website`}
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Visit Website
                  </a>
                </div>
              )}

              <h1
                className={`mh-event-detail-title ${websiteHref ? 'sm:pr-48 lg:pr-56' : ''}`}
              >
                {sponsor.name}
              </h1>

              {sponsor.type && (
                <p
                  className={`mh-event-detail-caption ${websiteHref ? 'sm:pr-48 lg:pr-56' : ''}`}
                >
                  {sponsor.type}
                </p>
              )}

              <div className="mh-event-detail-meta flex flex-wrap justify-center gap-3 mb-6 lg:max-w-4xl lg:mx-auto">
                {sponsor.companyName && (
                  <div className="mh-event-detail-meta-item">
                    <div
                      className="mh-event-detail-meta-icon mh-event-detail-meta-icon--company"
                      aria-hidden="true"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <span>{sponsor.companyName}</span>
                  </div>
                )}

                {sponsor.contactEmail && (
                  <div className="mh-event-detail-meta-item">
                    <div
                      className="mh-event-detail-meta-icon mh-event-detail-meta-icon--email"
                      aria-hidden="true"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <a href={`mailto:${sponsor.contactEmail}`}>
                      {sponsor.contactEmail}
                    </a>
                  </div>
                )}

                {sponsor.contactPhone && (
                  <div className="mh-event-detail-meta-item">
                    <div
                      className="mh-event-detail-meta-icon mh-event-detail-meta-icon--phone"
                      aria-hidden="true"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <a href={`tel:${sponsor.contactPhone}`}>
                      {sponsor.contactPhone}
                    </a>
                  </div>
                )}

                {websiteHref && (
                  <div className="mh-event-detail-meta-item">
                    <div
                      className="mh-event-detail-meta-icon mh-event-detail-meta-icon--website"
                      aria-hidden="true"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9-9m0 18a9 9 0 009-9M12 3a9 9 0 00-9 9"
                        />
                      </svg>
                    </div>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {websiteLabel}
                    </a>
                  </div>
                )}
              </div>

              {sponsor.tagline && (
                <p className="mh-sponsor-detail-tagline">{sponsor.tagline}</p>
              )}

              {sponsor.description && sponsor.description.trim().length > 0 && (
                <div className="mh-sponsor-detail-prose mb-10 lg:max-w-4xl lg:mx-auto">
                  <h2 className="mh-sponsor-detail-section-title">About</h2>
                  {sponsor.description
                    .split(/\n{2,}|\r\n\r\n/)
                    .map((paragraph, idx) => (
                      <p key={idx}>{paragraph.trim()}</p>
                    ))}
                </div>
              )}

              <div className="mh-sponsor-detail-contacts mb-6">
                <SponsorContactSocialIconRow sponsor={sponsor} />
              </div>

              {websiteHref && (
                <div className="mh-event-detail-actions flex flex-wrap gap-3 mb-6">
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mh-btn mh-btn-primary mh-event-detail-cta"
                    title="Visit Website"
                    aria-label={`Visit ${sponsor.name} website`}
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="mb-12 mt-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 border border-white/10 shadow-2xl">
              <div
                className="absolute inset-0 pointer-events-none opacity-70"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 55%)',
                }}
              />
              <div className="relative px-6 py-10 sm:px-10 lg:px-14">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 text-white mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Camera className="w-8 h-8 text-purple-200" />
                      <h2 className="text-3xl md:text-4xl font-heading font-semibold tracking-tight">
                        Sponsor Gallery
                      </h2>
                    </div>
                    <p className="text-lg text-purple-100 max-w-2xl">
                      {gallery.length}{' '}
                      {gallery.length === 1
                        ? 'photo or video from this partner.'
                        : 'photos and videos from this partner.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlideshowInitialIndex(0);
                      setShowSlideshow(true);
                    }}
                    className="mh-btn mh-btn-primary mh-event-detail-cta"
                    title="View Full Gallery"
                    aria-label="View Full Gallery"
                  >
                    <Eye className="w-5 h-5" aria-hidden="true" />
                    View Full Gallery
                  </button>
                </div>

                {previewMedia.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-inner">
                    <div className={styles.galleryThumbnailsGrid}>
                      {previewMedia.map((mediaItem) => (
                        <button
                          key={mediaItem.id}
                          type="button"
                          onClick={() => {
                            const galleryIndex = gallery.findIndex(
                              (m) => m.id === mediaItem.id
                            );
                            if (galleryIndex !== -1) {
                              setSlideshowInitialIndex(galleryIndex);
                              setShowSlideshow(true);
                            }
                          }}
                          className={`${styles.galleryThumbnail} relative overflow-hidden cursor-pointer group`}
                        >
                          {mediaItem.fileUrl ? (
                            <Image
                              src={mediaItem.fileUrl}
                              alt={
                                mediaItem.altText ||
                                mediaItem.title ||
                                'Media'
                              }
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              sizes="(min-width: 1024px) 220px, (min-width: 640px) 200px, 160px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-white/60">
                              {getMediaTypeIcon(
                                mediaItem.eventMediaType || ''
                              )}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                      ))}

                      {remainingCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlideshowInitialIndex(previewMedia.length);
                            setShowSlideshow(true);
                          }}
                          className={`${styles.galleryThumbnail} flex items-center justify-center bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm hover:bg-white/30 transition-colors`}
                        >
                          +{remainingCount} more
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showSlideshow && sponsor && (
          <EventMediaSlideshow
            event={{
              id: sponsor.id,
              title: sponsor.name || 'Sponsor',
              startDate: '',
              endDate: '',
              promotionStartDate: '',
              startTime: '',
              endTime: '',
              timezone: 'America/New_York',
              isFeaturedEvent: false,
              featuredEventPriorityRanking: 0,
              liveEventPriorityRanking: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            media={gallery}
            onClose={() => setShowSlideshow(false)}
            initialIndex={slideshowInitialIndex}
          />
        )}

        <div className="mh-event-detail-back">
          <Link
            href="/sponsors"
            className="mh-btn mh-btn-details mh-event-detail-cta"
            title="View All Sponsors"
            aria-label="View All Sponsors"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            View all sponsors
          </Link>
        </div>
      </div>
    </div>
  );
}
