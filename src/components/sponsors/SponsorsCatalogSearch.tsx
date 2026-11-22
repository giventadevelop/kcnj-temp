'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { EventSponsorsDTO } from '@/types';
import {
  fetchPublicSearchPage,
  matchesPublicSearchFields,
  mergePublicSearchItems,
  PUBLIC_SPONSOR_SEARCH_FIELDS,
} from '@/lib/publicTypeaheadSearch';

const SUGGESTION_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 280;

export interface SponsorsCatalogSearchProps {
  committedValue: string;
  onCommit: (value: string) => void;
  onInputChange?: (value: string) => void;
  localItems?: EventSponsorsDTO[];
  inputId?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Public `/sponsors` catalog search (rule: typeahead_search_combobox).
 * Typing updates the suggestion menu only (searchText.contains — name, company,
 * tagline, description, OCR). Catalog refetch happens on Enter, suggestion pick,
 * "Click Enter for more", or Clear.
 */
export default function SponsorsCatalogSearch({
  committedValue,
  onCommit,
  onInputChange,
  localItems = [],
  inputId = 'sponsorSearch',
  placeholder = 'Search by name, company, type, or id…',
  disabled = false,
}: SponsorsCatalogSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;

  const [inputValue, setInputValue] = useState(committedValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<EventSponsorsDTO[]>([]);
  const [suggestionTotal, setSuggestionTotal] = useState(0);

  useEffect(() => {
    setInputValue(committedValue);
    onInputChange?.(committedValue);
  }, [committedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSuggestionSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestionTotal(0);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const localMatches = localItems.filter((sponsor) =>
          matchesPublicSearchFields(
            [
              sponsor.searchText,
              sponsor.name,
              sponsor.companyName,
              sponsor.tagline,
              sponsor.description,
              sponsor.type,
              sponsor.id,
            ],
            trimmed,
          ),
        );

        const remote = await fetchPublicSearchPage<EventSponsorsDTO>({
          resource: 'event-sponsors',
          query: trimmed,
          containsFields: PUBLIC_SPONSOR_SEARCH_FIELDS,
          extraParams: {
            'isActive.equals': 'true',
            sort: 'priorityRanking,asc',
          },
          page: 0,
          size: SUGGESTION_LIMIT,
        });

        const merged = mergePublicSearchItems(
          [localMatches, remote.items],
          SUGGESTION_LIMIT,
        );
        setSuggestions(merged);
        setSuggestionTotal(Math.max(remote.totalCount, merged.length));
      } catch {
        setSuggestions([]);
        setSuggestionTotal(0);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const commitSearch = (value: string) => {
    const next = value.trim();
    setInputValue(next);
    onInputChange?.(next);
    onCommit(next);
    setOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onInputChange?.('');
    setSuggestions([]);
    setSuggestionTotal(0);
    onCommit('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full mh-typeahead mh-sponsors-catalog-search">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={placeholder}
          autoComplete="off"
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          className="mh-typeahead-input"
          onChange={(e) => {
            const next = e.target.value;
            if (!next.trim()) {
              handleClear();
              return;
            }
            setInputValue(next);
            onInputChange?.(next);
            setOpen(true);
            runSuggestionSearch(next);
          }}
          onFocus={() => {
            setOpen(true);
            if (inputValue.trim()) runSuggestionSearch(inputValue);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              if (inputValue.trim()) runSuggestionSearch(inputValue);
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              commitSearch(inputValue);
            }
          }}
        />
        {inputValue ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none z-10"
            title="Clear search"
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && inputValue.trim() ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-none border border-[var(--mh-neutral-300)] bg-[var(--mh-surface)] py-1 shadow-lg"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--mh-neutral-700)]">Searching…</li>
          ) : suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--mh-neutral-700)]">
              No matches. Press Enter to filter by this text.
            </li>
          ) : (
            <>
              {suggestions.map((sponsor) => {
                const key = sponsor.id != null ? `id:${sponsor.id}` : `name:${sponsor.name}`;
                return (
                  <li key={key} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commitSearch(sponsor.name || '')}
                      className="w-full px-4 py-2.5 text-left transition-colors"
                    >
                      <span className="block text-sm font-medium">
                        {sponsor.name || 'Unnamed sponsor'}
                      </span>
                      {sponsor.companyName || sponsor.type || sponsor.id != null ? (
                        <span className="block text-xs text-[var(--mh-neutral-700)] mt-0.5">
                          {[
                            sponsor.companyName,
                            sponsor.type,
                            sponsor.id != null ? `ID: ${sponsor.id}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
              {suggestionTotal > SUGGESTION_LIMIT ? (
                <li>
                  <button
                    type="button"
                    className="mh-sponsors-search-more w-full px-4 py-2.5 text-left text-sm font-semibold"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitSearch(inputValue)}
                  >
                    Click Enter for more
                  </button>
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
