export const ADSENSE_CONSENT_STORAGE_KEY = 'adsense-consent';
export const ADSENSE_CONSENT_EVENT = 'adsense-consent-change';
export const ADSENSE_CONSENT_OPEN_EVENT = 'adsense-consent-open';

export type AdsenseConsentChoice = 'accepted' | 'rejected';

export function readAdsenseConsent(): AdsenseConsentChoice | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(ADSENSE_CONSENT_STORAGE_KEY);
    if (value === 'accepted' || value === 'rejected') {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeAdsenseConsent(choice: AdsenseConsentChoice): void {
  window.localStorage.setItem(ADSENSE_CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new Event(ADSENSE_CONSENT_EVENT));
}

export function requestAdsenseConsentPrompt(): void {
  window.dispatchEvent(new Event(ADSENSE_CONSENT_OPEN_EVENT));
}
