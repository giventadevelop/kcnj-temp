'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { ExecutiveCommitteeTeamMemberDTO } from '@/types';
import { parseExecutiveCommitteeTeamMembersResponse } from '@/lib/parseExecutiveCommitteeTeamMembersResponse';
import Modal from '@/components/ui/Modal';
import { getHomepageCacheKey } from '@/lib/homepageCacheKeys';
import TeamPageBackground from './TeamPageBackground';
import PageHeaderRibbonMedia from '@/components/PageHeaderRibbonMedia';
import '@/styles/modernist-homepage.css';

/** Max characters to show in card before "Read more". Longer bios open in popup. */
const BIO_TRUNCATE_LENGTH = 120;
/** Show "Read more" when bio exceeds this (so button appears whenever text is visibly truncated). */
const BIO_READ_MORE_THRESHOLD = 50;

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<ExecutiveCommitteeTeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImages, setShowImages] = useState(false);
  const [page, setPage] = useState(0);
  const [profileModalMember, setProfileModalMember] = useState<ExecutiveCommitteeTeamMemberDTO | null>(null);
  const pageSize = 20;

  const CACHE_KEY = getHomepageCacheKey('team_page_cache');
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setTeamMembers(parseExecutiveCommitteeTeamMembersResponse(data));
            setLoading(false);
            setShowImages(true);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to read team cache:', error);
      }

      try {
        const response = await fetch(
          '/api/proxy/executive-committee-team-members?isActive.equals=true&sort=priorityOrder,asc',
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          console.log('Backend unavailable - team members not loaded:', response.statusText);
          setTeamMembers([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const teamMembersList = parseExecutiveCommitteeTeamMembersResponse(data);

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: teamMembersList, timestamp: Date.now() })
          );
        } catch (error) {
          console.warn('Failed to cache team data:', error);
        }

        setTeamMembers(teamMembersList);
        setLoading(false);
        setShowImages(true);
      } catch (error) {
        console.log('Backend connection error - team members not loaded:', error);
        setTeamMembers([]);
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, [CACHE_KEY, CACHE_DURATION]);

  const getFullName = (member: ExecutiveCommitteeTeamMemberDTO) =>
    `${member.firstName} ${member.lastName}`.trim();

  const parseExpertise = (expertise?: string): string[] => {
    if (!expertise) return [];
    try {
      const parsed = JSON.parse(expertise);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return expertise.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getDefaultProfileImage = (member: ExecutiveCommitteeTeamMemberDTO) =>
    member.profileImageUrl || '/images/user_profile_loading.webp';

  const totalCount = teamMembers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const currentPage = page + 1;
  const startItem = totalCount > 0 ? page * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min(page * pageSize + pageSize, totalCount) : 0;
  const isPrevDisabled = page === 0 || loading;
  const isNextDisabled = page >= totalPages - 1 || loading;
  const paginatedTeamMembers = teamMembers.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) {
      setPage(0);
    }
  }, [totalPages, page]);

  return (
    <>
      <TeamPageBackground />
      <main className="mh-events-page modernist-home mh-team-page">
        <section className="mh-events-hero" aria-label="Team">
          <PageHeaderRibbonMedia />
          <div className="mh-events-hero-scrim" aria-hidden="true" />
          <div className="mh-events-hero-content">
            <div className="mh-events-hero-kicker">
              <span className="mh-dot" aria-hidden="true" />
              <span>Leadership</span>
            </div>
            <h1>Our Team</h1>
            <p className="mh-events-hero-lede">
              Meet the dedicated professionals working together to make a positive impact in our
              communities.
            </p>
          </div>
        </section>

        <div className="mh-events-body">
          <Modal
            isOpen={!!profileModalMember}
            onClose={() => setProfileModalMember(null)}
            title={profileModalMember ? getFullName(profileModalMember) : ''}
            size="lg"
          >
            {profileModalMember && (
              <div className="mh-team-modal space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {showImages && (
                    <div className="mh-team-modal-photo flex-shrink-0">
                      <Image
                        src={getDefaultProfileImage(profileModalMember)}
                        alt={getFullName(profileModalMember)}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          if (t) t.src = '/images/user_profile_loading.webp';
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <p className="mh-team-modal-role">
                      {profileModalMember.designation?.trim() ||
                        profileModalMember.title?.trim() ||
                        '—'}
                    </p>
                    {profileModalMember.title && profileModalMember.designation && (
                      <p className="mh-team-modal-designation">{profileModalMember.title}</p>
                    )}
                  </div>
                </div>
                {profileModalMember.bio && (
                  <div>
                    <h4 className="mh-team-modal-heading">About</h4>
                    <p className="mh-team-modal-text">{profileModalMember.bio}</p>
                  </div>
                )}
                {profileModalMember.expertise &&
                  parseExpertise(profileModalMember.expertise).length > 0 && (
                    <div>
                      <h4 className="mh-team-modal-heading">Expertise</h4>
                      <div className="mh-team-expertise">
                        {parseExpertise(profileModalMember.expertise).map((skill, i) => (
                          <span key={i} className="mh-tag mh-tag-neutral">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {(profileModalMember.email ||
                  profileModalMember.linkedinUrl ||
                  profileModalMember.twitterUrl ||
                  profileModalMember.websiteUrl) && (
                  <div className="mh-team-modal-contact">
                    <h4 className="mh-team-modal-heading">Contact</h4>
                    <div className="space-y-2">
                      {profileModalMember.email && (
                        <a
                          href={`mailto:${profileModalMember.email}`}
                          className="mh-team-contact-link"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          {profileModalMember.email}
                        </a>
                      )}
                      <div className="mh-team-social">
                        {profileModalMember.linkedinUrl && (
                          <a
                            href={profileModalMember.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mh-team-social-link"
                            aria-label="LinkedIn"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </a>
                        )}
                        {profileModalMember.twitterUrl && (
                          <a
                            href={profileModalMember.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mh-team-social-link"
                            aria-label="Twitter"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.665 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.427 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                          </a>
                        )}
                        {profileModalMember.websiteUrl && (
                          <a
                            href={profileModalMember.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mh-team-social-link"
                            aria-label="Website"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>

          <div className="mh-events-toolbar">
            <div className="mh-events-head">
              <h2>Executive committee</h2>
              {totalCount > 0 && (
                <span className="mh-tag mh-tag-accent">
                  {totalCount} member{totalCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="mh-events-hint">
              Sorted by priority — lower numbers appear first.
            </p>
          </div>

          {loading ? (
            <div className="mh-events-loading">Loading team members…</div>
          ) : teamMembers.length === 0 ? (
            <div className="mh-events-empty">
              <p>Team members information is temporarily unavailable.</p>
              <p className="mh-events-hint">Please check back later.</p>
            </div>
          ) : (
            <>
              <div className="mh-team-grid">
                {paginatedTeamMembers.map((member) => {
                  const name = getFullName(member);
                  const role = member.designation?.trim() || member.title?.trim() || '—';
                  const expertise = parseExpertise(member.expertise);

                  return (
                    <article key={member.id} className="mh-team-card">
                      <figure className="mh-team-photo">
                        {showImages ? (
                          <Image
                            src={getDefaultProfileImage(member)}
                            alt={name}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 340px"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/user_profile_loading.webp';
                            }}
                          />
                        ) : (
                          <div className="mh-team-photo-placeholder" aria-hidden="true" />
                        )}
                      </figure>
                      <h3 className="mh-team-name">{name}</h3>
                      <p className="mh-team-title">{role}</p>
                      {member.bio && (
                        <>
                          <p className="mh-team-bio">
                            {member.bio.length <= BIO_TRUNCATE_LENGTH
                              ? member.bio
                              : `${member.bio.slice(0, BIO_TRUNCATE_LENGTH).trim()}…`}
                          </p>
                          {member.bio.length > BIO_READ_MORE_THRESHOLD && (
                            <button
                              type="button"
                              onClick={() => setProfileModalMember(member)}
                              className="mh-link mh-team-readmore"
                              aria-label={`Read full profile of ${name}`}
                            >
                              Read more →
                            </button>
                          )}
                        </>
                      )}
                      {expertise.length > 0 && (
                        <div className="mh-team-expertise">
                          {expertise.map((skill, skillIndex) => (
                            <span key={skillIndex} className="mh-tag mh-tag-neutral">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {(member.email ||
                        member.linkedinUrl ||
                        member.twitterUrl ||
                        member.websiteUrl) && (
                        <div className="mh-team-card-contact">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="mh-team-contact-link"
                              title={member.email}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              <span>{member.email}</span>
                            </a>
                          )}
                          <div className="mh-team-social">
                            {member.linkedinUrl && (
                              <a
                                href={member.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mh-team-social-link"
                                aria-label={`${name} on LinkedIn`}
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            )}
                            {member.twitterUrl && (
                              <a
                                href={member.twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mh-team-social-link"
                                aria-label={`${name} on Twitter`}
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.665 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.427 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                              </a>
                            )}
                            {member.websiteUrl && (
                              <a
                                href={member.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mh-team-social-link"
                                aria-label={`${name} website`}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {totalCount > 0 && (
                <div className="mh-events-pagination">
                  <div className="mh-events-pagination-row">
                    <button
                      onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                      disabled={isPrevDisabled}
                      className="mh-btn mh-btn-readmore mh-events-page-btn"
                      title="Previous Page"
                      aria-label="Previous Page"
                      type="button"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                      Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    </div>

                    <button
                      onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                      disabled={isNextDisabled}
                      className="mh-btn mh-btn-readmore mh-events-page-btn"
                      title="Next Page"
                      aria-label="Next Page"
                      type="button"
                    >
                      Next
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>

                  <p className="mh-events-count">
                    Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
                    <strong>{totalCount}</strong> team members
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
