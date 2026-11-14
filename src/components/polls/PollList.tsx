'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { EventPollDTO, EventPollOptionDTO } from '@/types';
import { fetchEventPollsServer, fetchEventPollOptionsServer } from '@/app/admin/polls/ApiServerActions';
import { PollVotingCard } from './PollVotingCard';
import PublicListSearchCombobox from '@/components/public/PublicListSearchCombobox';
import { fetchPublicTypeahead } from '@/lib/publicTypeaheadSearch';
import '@/styles/modernist-homepage.css';

interface PollListProps {
  eventId?: number;
  userId?: number;
  onPollSelect?: (poll: EventPollDTO, options: EventPollOptionDTO[]) => void;
}

export function PollList({ eventId, userId, onPollSelect }: PollListProps) {
  const [polls, setPolls] = useState<EventPollDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPoll, setSelectedPoll] = useState<EventPollDTO | null>(null);
  const [pollOptions, setPollOptions] = useState<EventPollOptionDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const loadPolls = async () => {
      setIsLoading(true);
      try {
        const filters: Record<string, any> = {
          'isActive.equals': true,
          page: currentPage,
          size: pageSize,
          sort: 'createdAt,desc',
        };

        if (eventId) {
          filters['eventId.equals'] = eventId;
        }

        if (searchTerm) {
          filters['title.contains'] = searchTerm;
        }

        const result = await fetchEventPollsServer(filters);
        setPolls(result.data);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error('Error loading polls:', error);
        setPolls([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolls();
  }, [eventId, currentPage, searchTerm]);

  const commitSearch = (value: string) => {
    setSearchInput(value);
    setSearchTerm(value.trim());
    setCurrentPage(0);
  };

  const handleSearch = () => {
    commitSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(0);
  };

  const handlePollClick = async (poll: EventPollDTO) => {
    try {
      const options = await fetchEventPollOptionsServer({
        'pollId.equals': poll.id,
        'isActive.equals': true,
      });

      setSelectedPoll(poll);
      setPollOptions(options);
      onPollSelect?.(poll, options);
    } catch (error) {
      console.error('Error loading poll options:', error);
      setSelectedPoll(poll);
      setPollOptions([]);
      onPollSelect?.(poll, []);
    }
  };

  const getPollStatus = (poll: EventPollDTO) => {
    const now = new Date();
    const startDate = new Date(poll.startDate);
    const endDate = poll.endDate ? new Date(poll.endDate) : null;

    if (!poll.isActive) {
      return { text: 'Inactive', className: 'mh-poll-status mh-poll-status--inactive' };
    }
    if (now < startDate) {
      return { text: 'Not Started', className: 'mh-poll-status mh-poll-status--upcoming' };
    }
    if (endDate && now > endDate) {
      return { text: 'Ended', className: 'mh-poll-status mh-poll-status--ended' };
    }
    return { text: 'Active', className: 'mh-poll-status mh-poll-status--active' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPollActive = (poll: EventPollDTO) => {
    const now = new Date();
    const startDate = new Date(poll.startDate);
    const endDate = poll.endDate ? new Date(poll.endDate) : null;
    return poll.isActive && now >= startDate && (!endDate || now <= endDate);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min((currentPage + 1) * pageSize, totalCount) : 0;

  if (selectedPoll) {
    return (
      <div className="mh-polls-detail">
        <div className="mh-events-toolbar">
          <div className="mh-events-head">
            <h2>{selectedPoll.title}</h2>
            <button
              type="button"
              onClick={() => setSelectedPoll(null)}
              className="mh-btn mh-btn-readmore"
              title="Back to Polls"
              aria-label="Back to Polls"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Polls
            </button>
          </div>
        </div>
        <div className="mh-polls-vote-panel">
          <PollVotingCard
            poll={selectedPoll}
            options={pollOptions}
            userId={userId}
            onVoteSubmitted={() => setSelectedPoll(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mh-polls-content">
      <div className="mh-events-toolbar">
        <div className="mh-events-head">
          <h2>Available Polls</h2>
          {totalCount > 0 && (
            <span className="mh-tag mh-tag-accent">
              {totalCount} poll{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <p className="mh-events-hint">
          Browse active community polls. Vote when a poll is open, or open the full page for details.
        </p>

        <div className="mh-events-search">
          <div>
            <label htmlFor="pollSearchTitle">Search by Title</label>
            <PublicListSearchCombobox<EventPollDTO & Record<string, unknown>>
              items={polls as (EventPollDTO & Record<string, unknown>)[]}
              committedValue={searchTerm}
              onCommit={commitSearch}
              onInputChange={setSearchInput}
              inputId="pollSearchTitle"
              placeholder="Enter poll title..."
              searchRemote={(query) => {
                const extraParams: Record<string, string> = {
                  'isActive.equals': 'true',
                  sort: 'createdAt,desc',
                };
                if (eventId != null) {
                  extraParams['eventId.equals'] = String(eventId);
                }
                return fetchPublicTypeahead<EventPollDTO & Record<string, unknown>>({
                  resource: 'event-polls',
                  query,
                  containsFields: ['title', 'description'],
                  extraParams,
                });
              }}
              getSearchFields={(p) => [p.title, p.description, p.id]}
              getCommitValue={(p) => p.title || ''}
              formatPrimary={(p) => p.title || 'Untitled poll'}
              formatSecondary={(p) =>
                [p.description, p.id != null ? `ID: ${p.id}` : null]
                  .filter(Boolean)
                  .join(' · ')
              }
            />
          </div>
          <div className="mh-events-search-actions">
            <button
              type="button"
              onClick={handleSearch}
              className="mh-btn mh-btn-primary"
              title="Search Polls"
              aria-label="Search Polls"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </button>
            {(searchTerm || searchInput) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="mh-btn mh-btn-calendar"
                title="Clear Search"
                aria-label="Clear Search"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {searchTerm && (
          <p className="mh-events-search-active">
            Showing results for “{searchTerm}”
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="mh-events-loading">Loading polls…</div>
      ) : polls.length === 0 ? (
        <div className="mh-events-empty">
          <h3>No polls available</h3>
          <p>
            {searchTerm
              ? 'No polls match your search. Try a different title.'
              : 'There are no active polls at this time. Check back soon.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mh-events-grid">
            {polls.map((poll) => {
              const status = getPollStatus(poll);
              const active = isPollActive(poll);

              return (
                <article
                  className={`mh-event-card mh-poll-card ${active ? '' : 'mh-poll-card--inactive'}`}
                  key={poll.id}
                >
                  <figure className="mh-event-card-media mh-poll-card-media">
                    <div className="mh-poll-card-placeholder" aria-hidden="true">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <span className={status.className}>{status.text}</span>
                  </figure>

                  <div className="mh-event-card-body">
                    <div className="mh-event-card-meta">
                      <span className="mh-event-card-date">Starts {formatDate(poll.startDate)}</span>
                      <span
                        className={`mh-event-card-admission ${
                          poll.allowMultipleChoices
                            ? 'mh-event-card-admission--ticketed'
                            : 'mh-event-card-admission--free'
                        }`}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        {poll.allowMultipleChoices ? 'Multiple choice' : 'Single choice'}
                      </span>
                    </div>

                    <h3>{poll.title}</h3>

                    {poll.description && (
                      <p className="mh-event-card-desc">{poll.description}</p>
                    )}

                    <p className="mh-event-card-where">
                      {poll.endDate ? `Ends ${formatDate(poll.endDate)}` : 'No end date'}
                      {' · '}
                      Max {poll.maxResponsesPerUser || 1} per user
                      {poll.isAnonymous ? ' · Anonymous' : ''}
                    </p>

                    <div className="mh-event-card-actions">
                      <button
                        type="button"
                        disabled={!active}
                        onClick={() => handlePollClick(poll)}
                        className={`mh-btn ${active ? 'mh-btn-tickets' : 'mh-btn-readmore'}`}
                        title={active ? 'Vote Now' : 'View Details'}
                        aria-label={active ? 'Vote Now' : 'View Details'}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        {active ? 'Vote Now' : 'View Details'}
                      </button>

                      <Link
                        href={`/polls/${poll.id}`}
                        className="mh-btn mh-btn-details"
                        title="View Full Page"
                        aria-label="View Full Page"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                        Full Page
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!isLoading && (
            <div className="mh-events-pagination">
              <div className="mh-events-pagination-row">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0 || isLoading}
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
                  Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
                </div>

                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages - 1 || isLoading}
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

              <div className="mh-events-count">
                {totalCount > 0 ? (
                  <>
                    Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
                    <strong>{totalCount}</strong> poll{totalCount !== 1 ? 's' : ''}
                  </>
                ) : (
                  'No polls found'
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
