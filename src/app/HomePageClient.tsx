'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { bootstrapUserProfile } from '@/components/ProfileBootstrapperApiServerActions';
import type { FeaturedEventWithMedia } from '@/lib/homepage/featuredEvents';
import ModernistHomePage from '@/components/modernist/ModernistHomePage';

function HomePageContent({ initialFeaturedEvents }: { initialFeaturedEvents: FeaturedEventWithMedia[] }) {
  // Hash navigation for #team-section and other anchors
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const targetId = hash.substring(1);
      const maxWaitTime = 15000;
      const pollInterval = 100;
      const startTime = Date.now();
      const headerHeight = 128;

      const waitForElementAndScroll = () => {
        const element = document.getElementById(targetId);
        if (element) {
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'smooth',
          });
          return;
        }
        if (Date.now() - startTime < maxWaitTime) {
          setTimeout(waitForElementAndScroll, pollInterval);
        }
      };

      waitForElementAndScroll();
    };

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    return () => window.removeEventListener('hashchange', handleHashNavigation);
  }, []);

  return <ModernistHomePage initialFeaturedEvents={initialFeaturedEvents} />;
}

export default function HomePageClient({
  initialFeaturedEvents,
}: {
  initialFeaturedEvents: FeaturedEventWithMedia[];
}) {
  const pathname = usePathname();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false);

  useEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      document.body.classList.remove('modernist-home', 'organic-home');
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

  return <HomePageContent initialFeaturedEvents={initialFeaturedEvents} />;
}
