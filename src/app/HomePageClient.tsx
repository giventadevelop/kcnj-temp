'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { bootstrapUserProfile } from '@/components/ProfileBootstrapperApiServerActions';
import type { FeaturedEventWithMedia } from '@/lib/homepage/featuredEvents';
import { scheduleHomepageHashScroll } from '@/lib/homepageHashScroll';
import ModernistHomePage from '@/components/modernist/ModernistHomePage';

function HomePageContent({
  initialFeaturedEvents,
  initialLiveEvents,
}: {
  initialFeaturedEvents: FeaturedEventWithMedia[];
  initialLiveEvents: FeaturedEventWithMedia[];
}) {
  // Hash navigation for #contact / #about-us (including "Open in new tab")
  useEffect(() => {
    const run = () => {
      const hash = window.location.hash;
      if (!hash) return () => {};
      const targetId = hash.substring(1);
      return scheduleHomepageHashScroll(targetId, { behavior: 'auto' });
    };

    let cancel = run();
    const onHashChange = () => {
      cancel();
      cancel = scheduleHomepageHashScroll(window.location.hash.substring(1), {
        behavior: 'smooth',
        settleDelaysMs: [150, 400],
      });
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancel();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return (
    <ModernistHomePage
      initialFeaturedEvents={initialFeaturedEvents}
      initialLiveEvents={initialLiveEvents}
    />
  );
}

export default function HomePageClient({
  initialFeaturedEvents,
  initialLiveEvents,
}: {
  initialFeaturedEvents: FeaturedEventWithMedia[];
  initialLiveEvents: FeaturedEventWithMedia[];
}) {
  const pathname = usePathname();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false);

  useEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      /* PublicOrganicDesignBody owns cleanup on route change */
    };
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId && user && !hasCheckedRedirect && typeof window !== 'undefined') {
      const currentPath = pathname || window.location.pathname;
      const hasJustSignedUp = sessionStorage.getItem('signup-redirected') === 'true';

      if (currentPath === '/' && hasJustSignedUp) {
        setHasCheckedRedirect(true);
        sessionStorage.removeItem('signup-redirected');

        const userData = {
          email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          imageUrl: user.imageUrl || '',
        };

        bootstrapUserProfile({ userId, userData })
          .catch((err) => {
            console.error('[HomePage] Bootstrap failed, but still redirecting:', err);
          })
          .finally(() => {
            setTimeout(() => {
              window.location.href = '/profile';
            }, 100);
          });
      } else {
        if (hasJustSignedUp && currentPath !== '/') {
          sessionStorage.removeItem('signup-redirected');
        }
        setHasCheckedRedirect(true);
      }
    }
  }, [isLoaded, isSignedIn, userId, user, pathname, hasCheckedRedirect]);

  return (
    <HomePageContent
      initialFeaturedEvents={initialFeaturedEvents}
      initialLiveEvents={initialLiveEvents}
    />
  );
}
