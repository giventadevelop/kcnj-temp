'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import '@/styles/modernist-homepage.css';

/**
 * Public routes that should NOT use the homepage organic design system.
 * Admin stays on the default admin UI; MOSC shells have their own layouts.
 */
function shouldApplyOrganicDesign(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/mosc')) return false;
  return true;
}

/**
 * Applies `modernist-home` + `organic-home` on public pages so events, gallery,
 * about, contact, membership, etc. share the homepage design system.
 * Mounted from ConditionalLayout (main app chrome only).
 */
export default function PublicOrganicDesignBody() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const apply = shouldApplyOrganicDesign(pathname);
    if (apply) {
      document.body.classList.add('modernist-home', 'organic-home');
    } else {
      document.body.classList.remove('modernist-home', 'organic-home');
    }
    return () => {
      document.body.classList.remove('modernist-home', 'organic-home');
    };
  }, [pathname]);

  return null;
}
