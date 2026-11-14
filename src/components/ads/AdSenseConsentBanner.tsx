'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTenantSettings } from '@/components/TenantSettingsProvider';
import {
  ADSENSE_CONSENT_EVENT,
  ADSENSE_CONSENT_OPEN_EVENT,
  readAdsenseConsent,
  requestAdsenseConsentPrompt,
  writeAdsenseConsent,
  type AdsenseConsentChoice,
} from '@/lib/adsense/adsenseConsent';

interface AdSenseConsentBannerProps {
  variant?: 'banner' | 'settings-link';
}

export default function AdSenseConsentBanner({ variant = 'banner' }: AdSenseConsentBannerProps) {
  const pathname = usePathname();
  const { showGoogleAdsense } = useTenantSettings();
  const [choice, setChoice] = useState<AdsenseConsentChoice | null | undefined>(undefined);
  const [forcedOpen, setForcedOpen] = useState(false);

  useEffect(() => {
    const sync = () => setChoice(readAdsenseConsent());
    const open = () => setForcedOpen(true);
    sync();
    window.addEventListener(ADSENSE_CONSENT_EVENT, sync);
    window.addEventListener(ADSENSE_CONSENT_OPEN_EVENT, open);
    return () => {
      window.removeEventListener(ADSENSE_CONSENT_EVENT, sync);
      window.removeEventListener(ADSENSE_CONSENT_OPEN_EVENT, open);
    };
  }, []);

  const adsEnabled = showGoogleAdsense && !pathname?.startsWith('/admin');
  if (!adsEnabled) {
    return null;
  }

  if (variant === 'settings-link') {
    return (
      <button
        type="button"
        onClick={() => requestAdsenseConsentPrompt()}
        className="text-gray-400 hover:text-gray-200 font-inter text-[11px] md:text-xs underline-offset-2 hover:underline"
      >
        Cookie settings
      </button>
    );
  }

  const open = choice === null || forcedOpen;
  if (choice === undefined || !open) {
    return null;
  }

  const choose = (next: AdsenseConsentChoice) => {
    writeAdsenseConsent(next);
    setForcedOpen(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
      role="dialog"
      aria-labelledby="adsense-consent-title"
      aria-describedby="adsense-consent-body"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <p id="adsense-consent-title" className="font-inter text-sm font-semibold text-white">
            Cookies and advertising
          </p>
          <p id="adsense-consent-body" className="mt-1 font-inter text-sm leading-relaxed text-gray-300">
            Kerala Center of New Jersey uses Google AdSense. Ads and their cookies load only if you accept. Read the{' '}
            <Link href="/privacy" className="text-blue-300 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-blue-300 underline-offset-2 hover:underline">
              Terms and Conditions
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className="rounded-lg border border-gray-500 px-4 py-2 font-inter text-sm font-semibold text-gray-100 hover:bg-gray-800"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-lg bg-blue-500 px-4 py-2 font-inter text-sm font-semibold text-white hover:bg-blue-600"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
