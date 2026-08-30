'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useTenantSettings } from '@/components/TenantSettingsProvider';
import { useDeferredFetch } from '@/hooks/usePageReady';
import { getTenantId } from '@/lib/env';
import { BUNDLED_EMERGENCY_HERO_IMAGE, resolveHeroImages } from '@/lib/hero/defaultHeroImages';
import {
  fetchEventDetailsByIdForTenant,
  fetchHomepageHeroMediaList,
  getHeroMediaDurationMs,
  getHeroSliderImageUrl,
  HERO_SLIDER_CAP,
  isUpcomingEventForHero,
} from '@/lib/hero/heroSliderMedia';
import { getHomepageCacheKey, HOMEPAGE_CACHE_INVALIDATE_CHANNEL } from '@/lib/homepageCacheKeys';
import { getOverlayInfo } from '@/lib/heroOverlay';
import type { EventDetailsDTO } from '@/types';

/** Transparent brand mark — Organic left hero panel. */
const HERO_LOGO = '/images/KCNJ/logo_latest-transparent.png';
const CACHE_TTL_MS = 5 * 60 * 1000;
/** Must stay in sync with `.mh-poster-hero-crossfade-layer` opacity transition in modernist-homepage.css */
const CROSSFADE_MS = 1100;

type HeroOverlaySlide = {
  url: string;
  durationMs: number;
  /** From media title at upload — shown over the image when set. */
  overlayTitle: string | null;
  /** From media description at upload. */
  overlayDescription: string | null;
  eventId: number | null;
};

type HeroCachePayload = {
  slides: HeroOverlaySlide[];
};

/** Two stacked layers — true crossfade with no blank gap between slides. */
type HeroSlideCrossfade = {
  a: number;
  b: number;
  showA: boolean;
};

const DEFAULT_SLIDE: HeroOverlaySlide = {
  url: BUNDLED_EMERGENCY_HERO_IMAGE,
  durationMs: 8000,
  overlayTitle: null,
  overlayDescription: null,
  eventId: null,
};

function readCache(cacheKey: string): HeroCachePayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slides?: HeroOverlaySlide[]; timestamp?: number };
    if (
      parsed.timestamp == null ||
      Date.now() - parsed.timestamp >= CACHE_TTL_MS ||
      !Array.isArray(parsed.slides) ||
      parsed.slides.length === 0
    ) {
      return null;
    }
    return { slides: parsed.slides };
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, slides: HeroOverlaySlide[]) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ slides, timestamp: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

function preloadUrls(urls: string[], count = 2) {
  if (typeof window === 'undefined') return;
  urls
    .filter((u) => u?.trim())
    .slice(0, count)
    .forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
}

function HeroSlideLayer({
  slide,
  isActive,
  priority,
  onPosterLoad,
}: {
  slide: HeroOverlaySlide;
  isActive: boolean;
  priority?: boolean;
  onPosterLoad?: (ratio: number) => void;
}) {
  return (
    <>
      {/*
        Over-scaled, blurred copy of the same art. It fills the panel so the
        poster above it can be `object-fit: contain` without leaving bare bars.
      */}
      <Image
        src={slide.url}
        alt=""
        aria-hidden
        fill
        loading="eager"
        sizes="480px"
        className="mh-poster-hero-img mh-poster-hero-img-backdrop"
      />
      <Image
        src={slide.url}
        alt={slide.overlayTitle || 'KCNJ cultural hero'}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 74vw, 100vw"
        className={`mh-poster-hero-img mh-poster-hero-img-poster${isActive ? ' is-zooming' : ''}`}
        style={{ objectPosition: 'center center' }}
        onLoad={(event) => {
          if (!onPosterLoad) return;
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            onPosterLoad(naturalWidth / naturalHeight);
          }
        }}
      />
    </>
  );
}

/**
 * Modernist homepage poster hero: rotates event/tenant hero images (same resolver as HeroSection),
 * transparent logo in the header band (top-left of nav), no headline text overlay, and
 * Buy Tickets / fundraiser image at bottom-right for ticketed upcoming events.
 * @see .cursor/rules/hero_section_image_rotation.mdc — Overlay Logic (Buy Tickets Click Here Image Pattern)
 * @see .cursor/rules/hero_featured_event_banner_section.mdc — same overlay under featured banner
 */
export default function ModernistPosterHero() {
  const { settings: tenantSettings, loading: tenantSettingsLoading } = useTenantSettings();
  const heroFetchEnabled = useDeferredFetch(500);
  const cacheKey = getHomepageCacheKey('homepage_modernist_hero_cache');

  const [slides, setSlides] = useState<HeroOverlaySlide[]>([DEFAULT_SLIDE]);
  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState<HeroSlideCrossfade>({ a: 0, b: 1, showA: true });
  const [ready, setReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [heroDataVersion, setHeroDataVersion] = useState(0);
  /** Event details keyed by id — used for Buy Tickets overlay (hero_section_image_rotation.mdc). */
  const [eventsById, setEventsById] = useState<Record<number, EventDetailsDTO>>({});
  /**
   * Natural ratio of the slide on screen. The panel sizes itself to this so a
   * contained poster fills it edge to edge. Updated on load rather than on slide
   * change so the panel resizes once, together with the crossfade.
   */
  const [slideRatio, setSlideRatio] = useState<number | null>(null);

  const slidesRef = useRef(slides);
  const indexRef = useRef(index);
  const isPausedRef = useRef(isPaused);
  const slideRef = useRef(slide);
  const isCrossfadingRef = useRef(false);
  const pendingCrossfadeTargetRef = useRef<number | null>(null);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextRotationRef = useRef<((imageIndex: number) => void) | null>(null);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    slideRef.current = slide;
  }, [slide]);

  const applySlides = useCallback(
    (next: HeroOverlaySlide[], markReady: boolean) => {
      const safe = next.length > 0 ? next : [DEFAULT_SLIDE];
      setSlides(safe);
      slidesRef.current = safe;
      setIndex(0);
      indexRef.current = 0;
      setSlide({ a: 0, b: Math.min(1, safe.length - 1), showA: true });
      slideRef.current = { a: 0, b: Math.min(1, safe.length - 1), showA: true };
      isCrossfadingRef.current = false;
      pendingCrossfadeTargetRef.current = null;
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      if (markReady) {
        setReady(true);
        writeCache(cacheKey, safe);
      } else {
        setReady(false);
      }
    },
    [cacheKey]
  );

  useLayoutEffect(() => {
    const cached = readCache(cacheKey);
    if (cached) {
      applySlides(cached.slides, true);
      preloadUrls(cached.slides.map((s) => s.url));
      return;
    }
    applySlides([DEFAULT_SLIDE], false);
    preloadUrls([BUNDLED_EMERGENCY_HERO_IMAGE], 1);
  }, [cacheKey, applySlides]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(HOMEPAGE_CACHE_INVALIDATE_CHANNEL);
    channel.onmessage = () => {
      try {
        sessionStorage.removeItem(cacheKey);
      } catch {
        /* ignore */
      }
      applySlides([DEFAULT_SLIDE], false);
      setHeroDataVersion((v) => v + 1);
    };
    return () => channel.close();
  }, [cacheKey, applySlides]);

  useEffect(() => {
    if (!heroFetchEnabled || tenantSettingsLoading) return;

    let cancelled = false;

    const load = async () => {
      try {
        const eventUrls: string[] = [];
        const eventDurations: number[] = [];
        const eventOverlays: { title: string | null; description: string | null; eventId: number | null }[] =
          [];
        const displayEventHeroImages = tenantSettings?.displayEventHeroImages ?? true;

        const loadedEvents: Record<number, EventDetailsDTO> = {};

        if (displayEventHeroImages) {
          const tenantId = getTenantId();
          const heroList = await fetchHomepageHeroMediaList(tenantId);
          const capped = heroList.slice(0, HERO_SLIDER_CAP);
          const eventById = new Map<number, boolean>();

          for (const media of capped) {
            const url = getHeroSliderImageUrl(media);
            if (!url) continue;

            const eventId = media.eventId ?? media.event_id ?? null;
            if (eventId == null) continue;

            let upcoming = eventById.get(eventId);
            if (upcoming === undefined) {
              const event = await fetchEventDetailsByIdForTenant(eventId, tenantId);
              if (event) loadedEvents[eventId] = event;
              upcoming = !!(event && isUpcomingEventForHero(event));
              eventById.set(eventId, upcoming);
            }
            if (!upcoming) continue;

            eventUrls.push(url);
            eventDurations.push(getHeroMediaDurationMs(media));
            const title = media.title?.trim() || null;
            const description = media.description?.trim() || null;
            eventOverlays.push({ title, description, eventId });
          }
        }

        const resolved = resolveHeroImages({
          eventImageUrls: eventUrls,
          eventDurationsMs: eventDurations,
          tenantSettings: tenantSettings
            ? {
                defaultHeroImageUrlsJson: tenantSettings.defaultHeroImageUrlsJson,
                defaultHeroDisplayMode: tenantSettings.defaultHeroDisplayMode,
                defaultHeroIncludeWithEvents: tenantSettings.defaultHeroIncludeWithEvents,
                defaultHeroMaxDisplayCount: tenantSettings.defaultHeroMaxDisplayCount,
              }
            : null,
        });

        const nextSlides: HeroOverlaySlide[] = resolved.imageUrls.map((url, i) => {
          const isEventSlide = i < resolved.eventSlideCount;
          const overlay = isEventSlide ? eventOverlays[i] : null;
          return {
            url,
            durationMs: resolved.durationsMs[i] ?? 8000,
            overlayTitle: overlay?.title ?? null,
            overlayDescription: overlay?.description ?? null,
            eventId: overlay?.eventId ?? null,
          };
        });

        if (!cancelled) {
          setEventsById(loadedEvents);
          applySlides(nextSlides, true);
          preloadUrls(nextSlides.map((s) => s.url));
        }
      } catch (err) {
        console.error('[ModernistPosterHero] Failed to load hero slides:', err);
        if (!cancelled) applySlides([DEFAULT_SLIDE], true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [heroFetchEnabled, tenantSettingsLoading, tenantSettings, heroDataVersion, applySlides]);

  /** True crossfade: two stacked layers; no sequential fade-out gap before swapping `src`. */
  const beginCrossfadeTo = useCallback((toIdx: number) => {
    const list = slidesRef.current;
    const n = list.length;
    if (n < 2) {
      setIndex(toIdx);
      indexRef.current = toIdx;
      return;
    }

    if (isCrossfadingRef.current) return;

    const s = slideRef.current;
    const fromIdx = s.showA ? s.a : s.b;
    if (toIdx === fromIdx) return;

    isCrossfadingRef.current = true;
    pendingCrossfadeTargetRef.current = toIdx;

    const nextUrl = list[toIdx]?.url;
    if (nextUrl) preloadUrls([nextUrl], 1);

    // Load incoming into the hidden layer first…
    setSlide((prev) => (prev.showA ? { ...prev, b: toIdx } : { ...prev, a: toIdx }));

    // …then flip visibility on the next frames so both layers overlap during the fade.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSlide((prev) => ({ ...prev, showA: !prev.showA }));
      });
    });

    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
    }
    crossfadeTimeoutRef.current = setTimeout(() => {
      crossfadeTimeoutRef.current = null;
      const targetIdx = pendingCrossfadeTargetRef.current ?? toIdx;
      const n2 = slidesRef.current.length;

      setSlide((prev) => {
        const vIdx = prev.showA ? prev.a : prev.b;
        const preload = (vIdx + 1) % n2;
        return prev.showA
          ? { a: vIdx, b: preload, showA: true }
          : { a: preload, b: vIdx, showA: false };
      });

      setIndex(targetIdx);
      indexRef.current = targetIdx;
      isCrossfadingRef.current = false;
      pendingCrossfadeTargetRef.current = null;

      window.setTimeout(() => {
        if (!isPausedRef.current && scheduleNextRotationRef.current) {
          scheduleNextRotationRef.current(targetIdx);
        }
      }, 10);
    }, CROSSFADE_MS);
  }, []);

  const goNext = useCallback(() => {
    const n = slidesRef.current.length;
    if (n < 2) return;
    const s = slideRef.current;
    const fromIdx = s.showA ? s.a : s.b;
    beginCrossfadeTo((fromIdx + 1) % n);
  }, [beginCrossfadeTo]);

  const goPrev = useCallback(() => {
    const n = slidesRef.current.length;
    if (n < 2) return;
    const s = slideRef.current;
    const fromIdx = s.showA ? s.a : s.b;
    beginCrossfadeTo((fromIdx - 1 + n) % n);
  }, [beginCrossfadeTo]);

  const scheduleNextRotation = useCallback(
    (imageIndex: number) => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
        rotationTimeoutRef.current = null;
      }
      if (!ready || slidesRef.current.length < 2 || isPausedRef.current) return;

      const current = slidesRef.current[imageIndex];
      const ms = current?.durationMs ?? 8000;
      rotationTimeoutRef.current = setTimeout(() => {
        if (isPausedRef.current) return;
        goNext();
      }, ms);
    },
    [ready, goNext]
  );

  useEffect(() => {
    scheduleNextRotationRef.current = scheduleNextRotation;
  }, [scheduleNextRotation]);

  useEffect(() => {
    if (!ready || slides.length < 2 || isPaused) {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
        rotationTimeoutRef.current = null;
      }
      return;
    }
    if (isCrossfadingRef.current) return;
    scheduleNextRotation(index);
    return () => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
        rotationTimeoutRef.current = null;
      }
    };
  }, [ready, slides, index, isPaused, scheduleNextRotation]);

  useEffect(() => {
    return () => {
      if (touchHideRef.current) clearTimeout(touchHideRef.current);
      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
      if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
    };
  }, []);

  const current = slides[index] ?? DEFAULT_SLIDE;
  const hasMultiple = ready && slides.length > 1;
  const eventHref = current.eventId != null ? `/events/${current.eventId}` : '/events';
  const currentEvent =
    current.eventId != null ? eventsById[current.eventId] ?? null : null;
  /** Buy Tickets / fundraiser image — bottom-right (hero_section_image_rotation.mdc). */
  const overlayInfo = getOverlayInfo(currentEvent);

  const onPosterLoad = useCallback((ratio: number) => {
    setSlideRatio(ratio);
  }, []);

  const bumpControls = () => {
    setShowControls(true);
    if (touchHideRef.current) clearTimeout(touchHideRef.current);
    touchHideRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const slideA = slides[slide.a] ?? DEFAULT_SLIDE;
  const slideB = slides[slide.b] ?? slides[0] ?? DEFAULT_SLIDE;

  return (
    <section className="mh-poster-hero" aria-label="Homepage hero">
      <div className="mh-poster-hero-orb mh-poster-hero-orb--accent" aria-hidden />
      <div className="mh-poster-hero-orb mh-poster-hero-orb--olive" aria-hidden />

      <div className="mh-poster-hero-inner">
        <div className="mh-poster-hero-panels">
          <div className="mh-poster-hero-logo-panel">
            <Link href="/" title="KCNJ Home" aria-label="KCNJ Home" className="mh-poster-hero-logo-link">
              <Image
                src={HERO_LOGO}
                alt="KCNJ"
                width={900}
                height={900}
                className="mh-poster-hero-logo-img"
                priority
              />
            </Link>
          </div>

          <div
            className="mh-poster-hero-slide-panel"
            style={
              slideRatio
                ? ({ '--mh-hero-slide-ratio': String(slideRatio) } as React.CSSProperties)
                : undefined
            }
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={bumpControls}
          >
            <figure className="mh-poster-hero-media">
              {hasMultiple ? (
                <div className="mh-poster-hero-crossfade-stack">
                  <div
                    className={`mh-poster-hero-crossfade-layer${slide.showA ? ' is-visible' : ''}`}
                  >
                    <HeroSlideLayer
                      slide={slideA}
                      isActive={slide.showA}
                      priority={slide.showA}
                      onPosterLoad={slide.showA ? onPosterLoad : undefined}
                    />
                  </div>
                  <div
                    className={`mh-poster-hero-crossfade-layer${!slide.showA ? ' is-visible' : ''}`}
                  >
                    <HeroSlideLayer
                      slide={slideB}
                      isActive={!slide.showA}
                      priority={!slide.showA}
                      onPosterLoad={!slide.showA ? onPosterLoad : undefined}
                    />
                  </div>
                </div>
              ) : (
                <div className="mh-poster-hero-crossfade-stack">
                  <div className="mh-poster-hero-crossfade-layer is-visible">
                    <HeroSlideLayer
                      slide={current}
                      isActive
                      priority
                      onPosterLoad={onPosterLoad}
                    />
                  </div>
                </div>
              )}
            </figure>

            {overlayInfo && (
              <div className="mh-poster-hero-ticket-overlay">
                <Link
                  href={overlayInfo.href}
                  className="block cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={(e) => e.stopPropagation()}
                  title={overlayInfo.alt}
                  aria-label={overlayInfo.alt}
                  {...(overlayInfo.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- CTA asset sized per hero_section_image_rotation.mdc */}
                  <img
                    src={overlayInfo.image}
                    alt={overlayInfo.alt}
                    className="object-contain w-[150px] h-[52px] sm:w-[200px] sm:h-[70px]"
                  />
                </Link>
              </div>
            )}

            {hasMultiple && showControls && (
              <div className="mh-poster-hero-controls" aria-label="Hero slideshow controls">
                <button
                  type="button"
                  className="mh-poster-hero-control"
                  title="Previous Image"
                  aria-label="Previous Image"
                  onClick={(e) => {
                    e.preventDefault();
                    goPrev();
                  }}
                >
                  <ChevronLeft size={22} aria-hidden />
                </button>
                <button
                  type="button"
                  className="mh-poster-hero-control"
                  title={isPaused ? 'Play' : 'Pause'}
                  aria-label={isPaused ? 'Play' : 'Pause'}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsPaused((p) => !p);
                  }}
                >
                  {isPaused ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
                </button>
                <button
                  type="button"
                  className="mh-poster-hero-control"
                  title="Next Image"
                  aria-label="Next Image"
                  onClick={(e) => {
                    e.preventDefault();
                    goNext();
                  }}
                >
                  <ChevronRight size={22} aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mh-poster-hero-browse">
          <Link href={eventHref} className="mh-btn mh-btn-secondary">
            {current.eventId != null ? 'View event' : 'Browse all upcoming events'}
            <ChevronRight size={17} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
