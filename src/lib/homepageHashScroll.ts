/**
 * Homepage hash scroll helpers.
 * For #about-us / #contact, scroll to the section eyebrow label
 * (first child div > span) so the sticky header sits just above it.
 */

export function resolveHomepageAnchorElement(targetId: string): HTMLElement | null {
  const section = document.getElementById(targetId);
  if (!section) return null;

  if (targetId === 'about-us' || targetId === 'contact') {
    if (targetId === 'contact') {
      const contactLabel = document.getElementById('contact-label');
      if (contactLabel instanceof HTMLElement) return contactLabel;
    }
    if (targetId === 'about-us') {
      const aboutLabel =
        document.getElementById('about-us-label') || document.getElementById('about-label');
      if (aboutLabel instanceof HTMLElement) return aboutLabel;
    }

    const firstDiv = section.querySelector(':scope > div');
    const label = firstDiv?.querySelector(':scope > span');
    if (label instanceof HTMLElement) return label;

    const eyebrow = section.querySelector('.mh-eyebrow');
    if (eyebrow instanceof HTMLElement) return eyebrow;
  }

  return section;
}

/** Measure the fixed glass header so anchors clear it. */
export function getStickyHeaderOffset(): number {
  const header = document.querySelector('.header-glass') as HTMLElement | null;
  const height = header?.getBoundingClientRect().height;
  if (height && height > 0) {
    return Math.ceil(height) + 12;
  }
  return 188;
}

export function scrollToHomepageHash(
  targetId: string,
  behavior: ScrollBehavior = 'smooth'
): boolean {
  const target = resolveHomepageAnchorElement(targetId);
  if (!target) return false;

  const offset = getStickyHeaderOffset();
  const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export type ScheduleHomepageHashScrollOptions = {
  /** Prefer `auto` on cold loads (new tab / hard navigation) so layout shifts do not cancel a smooth scroll. */
  behavior?: ScrollBehavior;
  /** Extra re-scrolls after the target appears (hero images, tenant settings, etc. change page height). */
  settleDelaysMs?: number[];
  maxWaitMs?: number;
};

/**
 * Wait for a homepage hash target, scroll to it, then re-apply after layout settles.
 * Returns a cancel function for use in useEffect cleanup.
 *
 * Critical for "Open link in new tab" on `/#contact`: the contact section is
 * client-rendered, so the browser's native hash scroll runs too early (or not
 * at all). We also set `history.scrollRestoration = 'manual'` so the browser
 * does not fight our offset scroll when the `#contact` node appears later.
 */
export function scheduleHomepageHashScroll(
  targetId: string,
  options: ScheduleHomepageHashScrollOptions = {}
): () => void {
  const {
    behavior = 'auto',
    settleDelaysMs = [150, 400, 900, 1800],
    maxWaitMs = 15000,
  } = options;

  if (typeof window === 'undefined') return () => {};

  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch {
    /* ignore */
  }

  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const startTime = Date.now();

  const clearTimers = () => {
    timers.forEach((t) => clearTimeout(t));
    timers.length = 0;
  };

  const scrollOnce = (scrollBehavior: ScrollBehavior) => {
    if (cancelled) return false;
    return scrollToHomepageHash(targetId, scrollBehavior);
  };

  const afterFound = () => {
    scrollOnce(behavior);
    for (const delay of settleDelaysMs) {
      timers.push(
        setTimeout(() => {
          // Later passes use instant scroll so image/layout growth does not leave the anchor mid-viewport.
          scrollOnce('auto');
        }, delay)
      );
    }
  };

  const waitForElementAndScroll = () => {
    if (cancelled) return;

    const element = document.getElementById(targetId);
    if (element) {
      // One frame so layout for the newly mounted section is measurable.
      requestAnimationFrame(() => {
        if (!cancelled) afterFound();
      });
      return;
    }

    if (Date.now() - startTime < maxWaitMs) {
      timers.push(setTimeout(waitForElementAndScroll, 100));
    }
  };

  waitForElementAndScroll();

  return () => {
    cancelled = true;
    clearTimers();
  };
}
