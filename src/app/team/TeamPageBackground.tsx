'use client';

import { useLayoutEffect } from 'react';
import '@/styles/modernist-homepage.css';

/**
 * Applies the Modernist organic design system (same as home) to the Team page.
 */
export default function TeamPageBackground() {
  useLayoutEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      /* PublicOrganicDesignBody owns cleanup on route change */
    };
  }, []);

  return null;
}
