'use client';

import { useState } from 'react';
import { PollVotingCard } from '@/components/polls/PollVotingCard';
import { RealTimePollResults } from '@/components/polls/RealTimePollResults';
import { PollComments } from '@/components/polls/PollComments';
import { PollStatusIndicator } from '@/components/polls/PollStatusIndicator';
import { PollAnalyticsDashboard } from '@/components/polls/PollAnalyticsDashboard';
import type { EventPollDTO, EventPollOptionDTO } from '@/types';

interface PollDetailsPageProps {
  poll: EventPollDTO;
  options: EventPollOptionDTO[];
  userId?: number;
}

const POLL_TABS = [
  {
    id: 'vote',
    label: 'Vote',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'results',
    label: 'Results',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'comments',
    label: 'Comments',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
] as const;

export function PollDetailsPage({ poll, options, userId }: PollDetailsPageProps) {
  const [activeTab, setActiveTab] = useState('vote');

  const handleVoteSubmitted = () => {
    console.log('Vote submitted successfully');
  };

  const handleCommentAdded = () => {
    console.log('Comment added successfully');
  };

  return (
    <div className="mh-events-page mh-polls-page mh-poll-detail">
      <div className="mh-events-body">
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="mh-poll-back"
            title="Back to Polls"
            aria-label="Back to Polls"
            type="button"
          >
            <span className="mh-poll-back-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span>Back to Polls</span>
          </button>

          <h1 className="mh-poll-detail-title">{poll.title}</h1>
          {poll.description && (
            <p className="mh-poll-detail-lede">{poll.description}</p>
          )}
          <PollStatusIndicator poll={poll} showCountdown showDetails />
        </div>

        <div className="mh-poll-tabs" role="tablist" aria-label="Poll sections">
          {POLL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`mh-btn mh-poll-tab mh-poll-tab--${tab.id}${isActive ? ' is-active' : ''}`}
                title={tab.label}
                aria-label={tab.label}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {activeTab === 'vote' && (
            <div className="mh-poll-detail-panel">
              <PollVotingCard
                poll={poll}
                options={options}
                userId={userId}
                onVoteSubmitted={handleVoteSubmitted}
              />
            </div>
          )}

          {activeTab === 'results' && (
            <div className="mh-poll-detail-panel">
              <RealTimePollResults poll={poll} options={options} />
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="mh-poll-detail-panel">
              <PollComments
                poll={poll}
                userId={userId}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="mh-poll-detail-panel">
              <PollAnalyticsDashboard poll={poll} options={options} />
            </div>
          )}
        </div>

        <div className="mh-poll-detail-panel mh-poll-detail-info">
          <h3>Poll Information</h3>
          <p>Details about this poll</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Start Date:</span>
              <p>
                {new Date(poll.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {poll.endDate && (
              <div>
                <span className="font-medium">End Date:</span>
                <p>
                  {new Date(poll.endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            <div>
              <span className="font-medium">Max Responses:</span>
              <p>{poll.maxResponsesPerUser || 1} per user</p>
            </div>

            <div>
              <span className="font-medium">Multiple Choice:</span>
              <p>{poll.allowMultipleChoices ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <span className="font-medium">Anonymous:</span>
              <p>{poll.isAnonymous ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <span className="font-medium">Results Visible:</span>
              <p>{poll.resultsVisibleTo || 'All'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
