"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Mail, Phone, MapPin } from "lucide-react";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTenantSettings } from "@/components/TenantSettingsProvider";
import GoogleAdSenseRegion from "@/components/ads/GoogleAdSenseRegion";
import { SocialIconLink } from "@/components/social/SocialIconLink";
import { scrollToHomepageHash } from "@/lib/homepageHashScroll";

// Back-to-top button component with comprehensive styling
const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 min-w-[56px] min-h-[56px]
        bg-blue-600 hover:bg-blue-700 active:bg-blue-800
        text-white rounded-full
        flex items-center justify-center
        shadow-xl hover:shadow-2xl
        font-inter font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        touch-manipulation
        ${isVisible ? 'translate-y-0 opacity-100 visible' : 'translate-y-4 opacity-0 invisible'}
      `}
      aria-label="Back to top"
    >
      <ArrowUp
        className="w-6 h-6 transition-transform duration-300 group-hover:-translate-y-0.5"
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </button>
  );
};

const Footer = () => {
  const pathname = usePathname();
  const { settings, organizationIdentity } = useTenantSettings();
  const hasAnySocial = settings?.facebookUrl?.trim() || settings?.instagramUrl?.trim() || settings?.twitterUrl?.trim() || settings?.linkedinUrl?.trim() || settings?.youtubeUrl?.trim() || settings?.tiktokUrl?.trim();
  const rawEmail = settings?.email?.trim() || '';
  const contactEmail =
    rawEmail.toLowerCase() === 'contactus@kcnj.org' ? 'keralacenternj@gmail.com' : rawEmail;
  const contactPhone = settings?.phoneNumber?.trim() || '';
  const footerDescription = organizationIdentity.description?.trim() || '';

  const handleHomeHashClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: '/#about-us' | '/#contact'
  ) => {
    if (pathname !== '/' && pathname !== '/charity-theme') return;
    e.preventDefault();
    const targetId = href.slice(2);
    window.history.pushState(null, '', href.slice(1));
    scrollToHomepageHash(targetId, 'smooth');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <footer
      className="bg-gray-900 text-gray-300 footer-edge-to-edge footer-main mt-12 md:mt-20"
      data-testid="main-footer"
      role="contentinfo"
    >
      {/* Main Footer Content */}
      <div className="w-full bg-gray-900 footer-main-inner">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-10 pb-8 md:pt-16 md:pb-12">
          <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-12">

            {/* Column 1: Logo and Social Media */}
            <div className="footer-brand flex flex-col items-center text-center md:items-start md:text-left">
              <Link href="/" className="inline-block mb-4 md:mb-6" title="KCNJ Home" aria-label="KCNJ Home">
                <Image
                  src="/images/KCNJ/logo_latest-transparent.png"
                  alt="KCNJ — Kerala Center of New Jersey"
                  width={320}
                  height={320}
                  priority
                  className="h-32 w-auto sm:h-36 md:h-40 lg:h-44"
                />
              </Link>

              {footerDescription ? (
                <p className="footer-brand-desc text-gray-400 mb-5 md:mb-6 font-inter text-sm leading-relaxed max-w-[34ch] md:max-w-none">
                  {footerDescription}
                </p>
              ) : null}

              {hasAnySocial && (
                <div className="mb-2 md:mb-0 w-full">
                  <p className="text-white font-inter font-medium text-sm mb-3 md:mb-4">
                    Follow our journey
                  </p>
                  <ul className="mh-social-icon-row flex flex-wrap justify-center md:justify-start gap-2">
                    {settings?.facebookUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="facebook"
                          href={settings.facebookUrl.trim()}
                          ariaLabel="Follow us on Facebook"
                        />
                      </li>
                    )}
                    {settings?.instagramUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="instagram"
                          href={settings.instagramUrl.trim()}
                          ariaLabel="Follow us on Instagram"
                        />
                      </li>
                    )}
                    {settings?.twitterUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="twitter"
                          href={settings.twitterUrl.trim()}
                          ariaLabel="Follow us on X (Twitter)"
                        />
                      </li>
                    )}
                    {settings?.linkedinUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="linkedin"
                          href={settings.linkedinUrl.trim()}
                          ariaLabel="Connect with us on LinkedIn"
                        />
                      </li>
                    )}
                    {settings?.youtubeUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="youtube"
                          href={settings.youtubeUrl.trim()}
                          ariaLabel="Subscribe to our YouTube channel"
                        />
                      </li>
                    )}
                    {settings?.tiktokUrl?.trim() && (
                      <li>
                        <SocialIconLink
                          platform="tiktok"
                          href={settings.tiktokUrl.trim()}
                          ariaLabel="Follow us on TikTok"
                        />
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Column 2: Contact Information */}
            <div className="footer-contact">
              <h6 className="footer-heading text-white font-inter font-semibold text-base md:text-lg mb-4 md:mb-6 tracking-wide">
                Get in Touch
              </h6>

              <div className="space-y-3.5 md:space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="footer-contact-icon text-blue-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <p className="footer-address text-gray-400 font-inter text-sm leading-relaxed text-left">
                    <span className="block font-medium text-gray-300">KCNJ</span>
                    <span className="block">
                      Kerala Center of New Jersey
                    </span>
                    <span className="block mt-1">New Jersey, USA</span>
                  </p>
                </div>

                {contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="footer-contact-icon text-blue-400 flex-shrink-0" strokeWidth={2} />
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      className="text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white"
                    >
                      {contactPhone}
                    </a>
                  </div>
                )}

                {contactEmail && (
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail size={18} className="footer-contact-icon text-blue-400 flex-shrink-0" strokeWidth={2} />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-blue-400 hover:text-blue-300 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-300 break-all"
                    >
                      {contactEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Columns 3–4: link groups — 2-up on mobile, separate grid cells on md+ */}
            <div className="footer-nav-pair grid grid-cols-2 gap-5 sm:gap-8 md:contents">
              <div className="footer-quick-links min-w-0">
                <h6 className="footer-heading text-white font-inter font-semibold text-base md:text-lg mb-4 md:mb-6 tracking-wide">
                  Quick Links
                </h6>
                <nav aria-label="Footer quick links">
                  <ul className="space-y-2.5 md:space-y-3">
                    <li>
                      <Link
                        href="/"
                        className="footer-link text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white block py-0.5"
                      >
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/#about-us"
                        onClick={(e) => handleHomeHashClick(e, '/#about-us')}
                        className="footer-link text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white block py-0.5"
                      >
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/events"
                        className="footer-link text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white block py-0.5"
                      >
                        Events
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/gallery"
                        className="footer-link text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white block py-0.5"
                      >
                        Gallery
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/#contact"
                        onClick={(e) => handleHomeHashClick(e, '/#contact')}
                        className="footer-link text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white block py-0.5"
                      >
                        Contact
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>

              <div className="footer-ways min-w-0">
                <h6 className="footer-heading text-white font-inter font-semibold text-base md:text-lg mb-4 md:mb-6 tracking-wide">
                  Ways to Help
                </h6>
                <nav aria-label="Footer ways to help">
                  <ul className="space-y-2.5 md:space-y-3">
                    <li>
                      <Link
                        href="/sponsors"
                        className="footer-link text-gray-300 hover:text-blue-400 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-400 block py-0.5"
                      >
                        Corporate Sponsorship
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/sign-up"
                        className="footer-link text-gray-300 hover:text-blue-400 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-400 block py-0.5"
                      >
                        Membership
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/#contact"
                        onClick={(e) => handleHomeHashClick(e, '/#contact')}
                        className="footer-link text-gray-300 hover:text-blue-400 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-400 block py-0.5"
                      >
                        Newsletter Signup
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

          </div>
        </div>
      </div>

      <GoogleAdSenseRegion
        region="footer_strip"
        className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-3 md:py-4 bg-gray-900"
        format="horizontal"
        minHeight={90}
      />

      {/* Copyright Section */}
      <div className="footer-bottom bg-gray-900 border-t border-gray-800 w-full">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col justify-center items-center gap-1">
            <p className="text-gray-400 font-inter text-xs md:text-sm text-center leading-relaxed max-w-[28ch] md:max-w-none">
              © 2026 KCNJ
              <span className="block md:inline md:before:content-['·'] md:before:mx-1.5">
                Kerala Center of New Jersey
              </span>
            </p>
            <p className="text-gray-500 font-inter text-[11px] md:text-xs text-center">
              Powered by{' '}
              <a
                href="https://www.giventa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
              >
                Giventa Inc., USA
              </a>
              .
            </p>
            <p className="text-gray-500 font-inter text-[11px] md:text-xs text-center">
              <a
                href="https://www.giventa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
              >
                www.giventa.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <BackToTopButton />
    </footer>
  );
};

export default Footer;
