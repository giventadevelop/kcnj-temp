'use client';

import { useEffect, useRef } from 'react';

/** How often public event listings refetch while the page stays open. */
export const LISTING_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function scheduleIdleWork(task: () => void): number {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(() => task(), { timeout: 2500 });
  }
  return window.setTimeout(task, 0);
}

function cancelIdleWork(handle: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
    return;
  }
  window.clearTimeout(handle);
}

/**
 * Refetch listings in the background every 30 minutes without a full page reload.
 *
 * Uses Page Visibility so a hidden tab does not fetch, then refreshes when the
 * user returns if the interval has elapsed. Uses `pageshow` for back-forward
 * cache restores and `requestIdleCallback` so the swap happens when the browser
 * is idle. Callers must update React state in place and must not set a loading
 * flag that unmounts existing content.
 */
export function useSilentListingRefresh(
  onRefresh: (signal: AbortSignal) => void | Promise<void>,
  enabled: boolean = true
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastRunAtRef = useRef(Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const idleHandleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const run = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      lastRunAtRef.current = Date.now();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void Promise.resolve(onRefreshRef.current(controller.signal)).catch(() => {
        /* Keep the current UI if a background refetch fails. */
      });
    };

    const runWhenIdle = () => {
      if (idleHandleRef.current != null) {
        cancelIdleWork(idleHandleRef.current);
      }
      idleHandleRef.current = scheduleIdleWork(run);
    };

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastRunAtRef.current >= LISTING_REFRESH_INTERVAL_MS) {
        runWhenIdle();
      }
    }, LISTING_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRunAtRef.current >= LISTING_REFRESH_INTERVAL_MS) {
        runWhenIdle();
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || Date.now() - lastRunAtRef.current >= LISTING_REFRESH_INTERVAL_MS) {
        runWhenIdle();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      if (idleHandleRef.current != null) {
        cancelIdleWork(idleHandleRef.current);
      }
      abortRef.current?.abort();
    };
  }, [enabled]);
}
