/**
 * Responsive header ribbon assets for public pages (not the homepage hero).
 * Files live under public/images/header_ribbons/.
 */
export const HEADER_RIBBON = {
  mobile: '/images/header_ribbons/header_ribbon_mobile_1200x720.jpg',
  tablet: '/images/header_ribbons/header_ribbon_tablet_1600x560.jpg',
  desktop: '/images/header_ribbons/header_ribbon_desktop_fallback_2100x500.jpg',
  desktopRetina: '/images/header_ribbons/header_ribbon_desktop_retina_3360x800.jpg',
} as const;

/** Single-URL fallback when a full responsive picture is not used. */
export const DEFAULT_HEADER_RIBBON_IMAGE = HEADER_RIBBON.desktop;
