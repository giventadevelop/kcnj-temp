'use client';

import { useState } from 'react';
import type { EventDetailsDTO, GalleryAlbumDTO } from '@/types';
import PublicListSearchCombobox from '@/components/public/PublicListSearchCombobox';
import { fetchPublicTypeahead } from '@/lib/publicTypeaheadSearch';

type GallerySearchMode = 'albums' | 'events';

interface GallerySearchProps {
  onSearch: (filters: {
    searchTerm: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  loading?: boolean;
  placeholder?: string;
  mode?: GallerySearchMode;
  /** Local items already loaded on the page (for instant local suggestions). */
  localItems?: Array<Record<string, unknown>>;
  /** Parent-committed filters (keeps UI in sync across album/event tab switches). */
  committedSearchTerm?: string;
  committedStartDate?: string;
  committedEndDate?: string;
}

export function GallerySearch({
  onSearch,
  loading = false,
  placeholder = 'Search by title…',
  mode = 'albums',
  localItems = [],
  committedSearchTerm = '',
  committedStartDate = '',
  committedEndDate = '',
}: GallerySearchProps) {
  const [searchDraft, setSearchDraft] = useState(committedSearchTerm);
  const [searchTerm, setSearchTerm] = useState(committedSearchTerm);
  const [startDate, setStartDate] = useState(committedStartDate);
  const [endDate, setEndDate] = useState(committedEndDate);

  const commitFilters = (title: string) => {
    const next = title.trim();
    setSearchDraft(next);
    setSearchTerm(next);
    onSearch({
      searchTerm: next,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitFilters(searchDraft);
  };

  const handleClear = () => {
    setSearchDraft('');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    onSearch({
      searchTerm: '',
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasFilters = Boolean(searchTerm || startDate || endDate);

  return (
    <form className="mh-events-search" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="gallerySearchTitle">Search by Title</label>
        {mode === 'albums' ? (
          <PublicListSearchCombobox<GalleryAlbumDTO & Record<string, unknown>>
            items={localItems as (GalleryAlbumDTO & Record<string, unknown>)[]}
            committedValue={searchTerm}
            onCommit={commitFilters}
            onInputChange={setSearchDraft}
            inputId="gallerySearchTitle"
            placeholder={placeholder}
            disabled={loading}
            searchRemote={(query) =>
              fetchPublicTypeahead<GalleryAlbumDTO & Record<string, unknown>>({
                resource: 'gallery-albums',
                query,
                containsFields: ['title', 'description'],
                extraParams: {
                  'isPublic.equals': 'true',
                  sort: 'eventDateStart,desc',
                },
              })
            }
            getSearchFields={(a) => [a.searchText, a.title, a.description, a.id]}
            getCommitValue={(a) => a.title || ''}
            formatPrimary={(a) => a.title || 'Untitled album'}
            formatSecondary={(a) =>
              [a.description, a.id != null ? `ID: ${a.id}` : null]
                .filter(Boolean)
                .join(' · ')
            }
          />
        ) : (
          <PublicListSearchCombobox<EventDetailsDTO & Record<string, unknown>>
            items={localItems as (EventDetailsDTO & Record<string, unknown>)[]}
            committedValue={searchTerm}
            onCommit={commitFilters}
            onInputChange={setSearchDraft}
            inputId="gallerySearchTitle"
            placeholder={placeholder}
            disabled={loading}
            searchRemote={(query) =>
              fetchPublicTypeahead<EventDetailsDTO & Record<string, unknown>>({
                resource: 'event-details',
                query,
                containsFields: ['title', 'caption'],
                extraParams: {
                  'isActive.equals': 'true',
                  sort: 'startDate,desc',
                },
              })
            }
            getSearchFields={(ev) => [ev.searchText, ev.title, ev.caption, ev.description, ev.id]}
            getCommitValue={(ev) => ev.title || ''}
            formatPrimary={(ev) => ev.title || 'Untitled event'}
            formatSecondary={(ev) =>
              [ev.caption, ev.id != null ? `ID: ${ev.id}` : null]
                .filter(Boolean)
                .join(' · ')
            }
          />
        )}
      </div>

      <div>
        <label>Date Range</label>
        <div className="mh-events-search-dates">
          <div>
            <label htmlFor="gallerySearchDateFrom">From</label>
            <input
              type="date"
              id="gallerySearchDateFrom"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="gallerySearchDateTo">To</label>
            <input
              type="date"
              id="gallerySearchDateTo"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="mh-events-search-actions mh-gallery-search-actions">
        <button
          type="submit"
          disabled={loading}
          className="mh-btn mh-btn-primary mh-gallery-action-btn"
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
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="mh-btn mh-btn-calendar mh-gallery-action-btn"
          title="Clear"
          aria-label="Clear search"
          disabled={loading && !hasFilters}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      {hasFilters && (
        <p className="mh-events-search-active">
          <strong>Search active:</strong>
          {searchTerm && ` Title contains "${searchTerm}"`}
          {searchTerm && (startDate || endDate) && ' and'}
          {startDate && endDate && ` date between "${startDate}" and "${endDate}"`}
          {startDate && !endDate && ` date from "${startDate}" onwards`}
          {!startDate && endDate && ` date until "${endDate}"`}
        </p>
      )}
    </form>
  );
}
