'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { EventSponsorsDTO } from '@/types';
import { proxyApiPath } from '@/lib/proxyApiPath';

const SUGGESTION_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 280;

export interface SponsorsCatalogSearchProps {
  committedValue: string;
  onCommit: (value: string) => void;
  onInputChange?: (value: string) => void;
  inputId?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Public `/sponsors` catalog search (rule: typeahead_search_combobox).
 * Typing updates the suggestion menu only (name.contains). Catalog refetch
 * happens on Enter, suggestion pick, "Click Enter for more", or Clear.
 */
export default function SponsorsCatalogSearch({
  committedValue,
  onCommit,
  onInputChange,
  inputId = 'sponsorSearch',
  placeholder = 'Enter sponsor name…',
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
        const params = new URLSearchParams({
          'isActive.equals': 'true',
          sort: 'priorityRanking,asc',
          page: '0',
          size: String(SUGGESTION_LIMIT),
          'name.contains': trimmed,
        });
        const response = await fetch(
          proxyApiPath(`/api/proxy/event-sponsors?${params.toString()}`),
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          setSuggestions([]);
          setSuggestionTotal(0);
          return;
        }
        const data = await response.json();
        const list = Array.isArray(data) ? (data as EventSponsorsDTO[]) : [];
        const totalHeader = response.headers.get('x-total-count');
        const total = totalHeader ? parseInt(totalHeader, 10) : list.length;
        setSuggestions(list.slice(0, SUGGESTION_LIMIT));
        setSuggestionTotal(Number.isFinite(total) ? total : list.length);
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
