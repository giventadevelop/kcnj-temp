'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { EventSponsorsDTO } from '@/types';
import { proxyApiPath } from '@/lib/proxyApiPath';
import { SponsorContactSocialIconRow } from '@/components/sponsors/SponsorCard';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import '@/styles/modernist-homepage.css';

const PAGE_SIZE = 20;

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<EventSponsorsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useLayoutEffect(() => {
    document.body.classList.add('modernist-home', 'organic-home');
    return () => {
      /* PublicOrganicDesignBody owns cleanup on route change */
    };
  }, []);

  useEffect(() => {
    async function fetchSponsors() {
      setLoading(true);
      setFetchError(false);
      try {
        const params = new URLSearchParams({
          sort: 'priorityRanking,asc',
          page: (currentPage - 1).toString(),
          size: PAGE_SIZE.toString(),
          'isActive.equals': 'true',
        });

        if (searchTerm.trim()) {
          params.append('name.contains', searchTerm.trim());
        }

        const response = await fetch(
          proxyApiPath(`/api/proxy/event-sponsors?${params.toString()}`),
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }
        );

        if (response.ok) {
          const data = await response.json();
          const sponsorsList = Array.isArray(data) ? data : [];
          const totalCountHeader = response.headers.get('x-total-count');
          const count = totalCountHeader
            ? parseInt(totalCountHeader, 10)
            : sponsorsList.length;
          const pages = Math.ceil(count / PAGE_SIZE) || 1;

          setSponsors(sponsorsList);
          setTotalCount(count);
          setTotalPages(pages);
        } else {
          setFetchError(true);
          setSponsors([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      } catch (error) {
        console.error('Error fetching sponsors:', error);
        setFetchError(true);
        setSponsors([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    }

    fetchSponsors();
  }, [currentPage, searchTerm]);

  const handleSearch = () => {
    setIsSearching(true);
    setSearchTerm(searchDraft.trim());
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearchTerm('');
    setCurrentPage(1);
    setIsSearching(false);
  };

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const startItem = totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem =
    totalCount > 0
      ? (currentPage - 1) * PAGE_SIZE + sponsors.length
      : 0;

  return (
    <main className="mh-events-page modernist-home mh-sponsors-page">
      <section className="mh-events-hero" aria-label="Sponsors">
        <PageHeaderRibbonMedia />
        <div className="mh-events-hero-scrim" aria-hidden="true" />
        <div className="mh-events-hero-content">
          <div className="mh-events-hero-kicker">
            <span className="mh-dot" aria-hidden="true" />
            <span>KCNJ partners</span>
          </div>
          <h1>Our Sponsors</h1>
          <p className="mh-events-hero-lede">
            Meet the organizations that support our community initiatives.
          </p>
        </div>
      </section>

      <div className="mh-events-body">
        <div className="mh-events-toolbar">
          <div className="mh-events-head">
            <h2>Community Partners</h2>
          </div>
          <p className="mh-events-hint">
            Grateful for the sponsors who make our events and community programs
            possible.
          </p>

          <div className="mh-events-search">
            <div>
              <label htmlFor="sponsorSearch">Search by Name</label>
              <input
                type="text"
                id="sponsorSearch"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Enter sponsor name…"
              />
            </div>

            <div className="mh-events-search-actions">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || isSearching}
                className="mh-btn mh-btn-primary"
                title="Search"
                aria-label="Search"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {loading || isSearching ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                onClick={clearSearch}
                className="mh-btn mh-btn-calendar"
                title="Clear"
                aria-label="Clear search"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear
              </button>
            </div>

            {searchTerm && (
              <p className="mh-events-search-active">
                <strong>Search active:</strong> Name contains &quot;{searchTerm}
                &quot;
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mh-events-loading">Loading sponsors…</div>
        ) : fetchError ? (
          <div className="mh-events-error">
            Sorry, we couldn&apos;t load sponsors at this time. Please try again
            later.
          </div>
        ) : sponsors.length === 0 ? (
          <div className="mh-events-empty">
            <h3>
              {searchTerm ? 'No sponsors found' : 'No sponsors available'}
            </h3>
            <p>
              {searchTerm
                ? `No sponsors match "${searchTerm}". Try a different search term.`
                : "We're currently seeking sponsors for our events. Contact us to learn about sponsorship opportunities!"}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="mh-btn mh-btn-ghost"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mh-events-grid">
              {sponsors.map((sponsor, index) => (
                <article
                  className="mh-event-card"
                  key={sponsor.id ?? `${sponsor.name}-${index}`}
                >
                  {(sponsor.bannerImageUrl || sponsor.type) && (
                    <figure className="mh-event-card-media mh-sponsor-card-media">
                      {sponsor.bannerImageUrl ? (
                        <Image
                          src={sponsor.bannerImageUrl}
                          alt={sponsor.name || 'Sponsor banner'}
                          width={1600}
                          height={900}
                          sizes="100vw"
                          className="mh-event-card-media-img"
                        />
                      ) : (
                        <div
                          className="mh-sponsor-card-placeholder"
                          aria-hidden="true"
                        />
                      )}
                      {sponsor.type && (
                        <span className="mh-event-card-badge">
                          {sponsor.type}
                        </span>
                      )}
                    </figure>
                  )}

                  <div className="mh-event-card-body">
                    {sponsor.companyName && (
                      <div className="mh-event-card-meta">
                        <span className="mh-event-card-date">
                          {sponsor.companyName}
                        </span>
                      </div>
                    )}

                    <h3>{sponsor.name}</h3>

                    {sponsor.tagline && (
                      <p className="mh-event-card-desc mh-sponsor-card-tagline">
                        {sponsor.tagline}
                      </p>
                    )}

                    <div className="mh-sponsor-card-contacts">
                      <SponsorContactSocialIconRow sponsor={sponsor} />
                    </div>

                    {typeof sponsor.id !== 'undefined' && (
                      <div className="mh-event-card-actions">
                        <Link
                          href={`/sponsors/${sponsor.id}`}
                          className="mh-btn mh-btn-primary"
                          title={`View sponsor details for ${sponsor.name}`}
                          aria-label={`View sponsor details for ${sponsor.name}`}
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Sponsor Details
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="mh-events-pagination">
              <div className="mh-events-pagination-row">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrevPage || loading}
                  className="mh-btn mh-btn-readmore mh-events-page-btn"
                  title="Previous Page"
                  aria-label="Previous Page"
                  type="button"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous
                </button>

                <div className="mh-events-page-info">
                  Page <strong>{currentPage}</strong> of{' '}
                  <strong>{Math.max(totalPages, 1)}</strong>
                </div>

                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasNextPage || loading}
                  className="mh-btn mh-btn-readmore mh-events-page-btn"
                  title="Next Page"
                  aria-label="Next Page"
                  type="button"
                >
                  Next
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              <div className="mh-events-count">
                {totalCount > 0 ? (
                  <>
                    Showing <strong>{startItem}</strong> to{' '}
                    <strong>{endItem}</strong> of <strong>{totalCount}</strong>{' '}
                    sponsor{totalCount !== 1 ? 's' : ''}
                  </>
                ) : (
                  'No sponsors found'
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
