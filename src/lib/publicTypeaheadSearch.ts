import { proxyApiPath } from '@/lib/proxyApiPath';

export const PUBLIC_TYPEAHEAD_LIMIT = 20;

/** Parallel `.contains` fields for public `/events` and gallery events. */
export const PUBLIC_EVENT_SEARCH_FIELDS = [
  'searchText',
  'title',
  'caption',
  'description',
  'location',
] as const;

/** Parallel `.contains` fields for public gallery albums. */
export const PUBLIC_GALLERY_ALBUM_SEARCH_FIELDS = [
  'searchText',
  'title',
  'description',
  'eventLocation',
] as const;

/** Parallel `.contains` fields for public `/sponsors`. */
export const PUBLIC_SPONSOR_SEARCH_FIELDS = [
  'searchText',
  'name',
  'companyName',
  'tagline',
  'description',
  'type',
] as const;

/** Lowercase, hyphens to spaces, collapse whitespace. Tokens are words of length >= 2. */
export function normalizePublicSearchQuery(raw: string): { phrase: string; tokens: string[] } {
  const phrase = raw
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = phrase.split(' ').filter((token) => token.length >= 2);
  return { phrase, tokens };
}

/** Local match: every token must appear in the joined, hyphen-normalized haystack. */
export function matchesPublicSearchFields(
  fields: Array<string | number | null | undefined>,
  query: string,
): boolean {
  const { phrase, tokens } = normalizePublicSearchQuery(query);
  if (!phrase) return true;
  const haystack = fields
    .map((value) => (value == null ? '' : String(value)))
    .join(' ')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
  if (tokens.length === 0) return haystack.includes(phrase);
  return tokens.every((token) => haystack.includes(token));
}

/** Append field.contains for the phrase, or each token (JHipster ANDs repeated .contains). Never ocrText. */
export function applyContainsTokens(params: URLSearchParams, field: string, query: string): void {
  const { phrase, tokens } = normalizePublicSearchQuery(query);
  if (!phrase) return;
  if (tokens.length <= 1) {
    params.append(`${field}.contains`, phrase);
    return;
  }
  for (const token of tokens) {
    params.append(`${field}.contains`, token);
  }
}

export function parseProxyList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T[];
    const embedded = obj._embedded;
    if (embedded && typeof embedded === 'object') {
      const first = Object.values(embedded as Record<string, unknown>)[0];
      if (Array.isArray(first)) return first as T[];
    }
  }
  return [];
}

export function mergePublicSearchItems<T extends { id?: number | string | null }>(
  lists: T[][],
  limit: number,
): T[] {
  const byKey = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      const key = item.id != null ? `id:${item.id}` : null;
      if (!key || byKey.has(key)) continue;
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values()).slice(0, limit);
}

export interface PublicSearchPageResult<T> {
  items: T[];
  totalCount: number;
}

async function fetchProxyJob<T>(
  resource: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<{ items: T[]; totalCount: number }> {
  const res = await fetch(
    proxyApiPath(`/api/proxy/${resource}?${params.toString()}`),
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal,
    },
  );
  if (!res.ok) return { items: [], totalCount: 0 };
  const items = parseProxyList<T>(await res.json());
  const header = res.headers.get('x-total-count');
  const totalCount = header ? parseInt(header, 10) : items.length;
  return {
    items,
    totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
  };
}

function buildParallelJobs<T extends { id?: number | string | null }>(options: {
  resource: string;
  query: string;
  containsFields: string[];
  extraParams?: Record<string, string>;
  page: number;
  size: number;
  signal?: AbortSignal;
}): Promise<{ items: T[]; totalCount: number }>[] {
  const raw = options.query.trim();
  const { phrase } = normalizePublicSearchQuery(raw);
  const base = {
    page: String(options.page),
    size: String(options.size),
    ...(options.extraParams ?? {}),
  };

  const jobs: Promise<{ items: T[]; totalCount: number }>[] = [];
  if (phrase) {
    for (const field of options.containsFields) {
      const params = new URLSearchParams(base);
      applyContainsTokens(params, field, raw);
      jobs.push(fetchProxyJob<T>(options.resource, params, options.signal));
    }
  }

  if (/^\d+$/.test(raw)) {
    const params = new URLSearchParams(base);
    params.set('id.equals', raw);
    jobs.push(fetchProxyJob<T>(options.resource, params, options.signal));
  }

  return jobs;
}

/**
 * Public listing typeahead: same-origin `/api/proxy/*` (no tenantId.equals).
 * Matches contains-fields in parallel plus numeric id, then merges/dedupes.
 */
export async function fetchPublicTypeahead<T extends { id?: number | string | null }>(options: {
  resource: string;
  query: string;
  containsFields: readonly string[] | string[];
  extraParams?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<T[]> {
  const trimmed = options.query.trim();
  if (!trimmed) return [];

  const jobs = buildParallelJobs<T>({
    resource: options.resource,
    query: trimmed,
    containsFields: [...options.containsFields],
    extraParams: options.extraParams,
    page: 0,
    size: PUBLIC_TYPEAHEAD_LIMIT,
    signal: options.signal,
  });
  const results = await Promise.all(jobs);
  return mergePublicSearchItems(
    results.map((r) => r.items),
    PUBLIC_TYPEAHEAD_LIMIT,
  );
}

/**
 * Paginated public listing search: parallel `.contains` (OR via merge) + numeric id.
 * totalCount is max(x-total-count) across jobs.
 */
export async function fetchPublicSearchPage<T extends { id?: number | string | null }>(options: {
  resource: string;
  query: string;
  containsFields: readonly string[] | string[];
  extraParams?: Record<string, string>;
  page: number;
  size: number;
  signal?: AbortSignal;
}): Promise<PublicSearchPageResult<T>> {
  const trimmed = options.query.trim();
  if (!trimmed) {
    const params = new URLSearchParams({
      page: String(options.page),
      size: String(options.size),
      ...(options.extraParams ?? {}),
    });
    return fetchProxyJob<T>(options.resource, params, options.signal);
  }

  const jobs = buildParallelJobs<T>({
    resource: options.resource,
    query: trimmed,
    containsFields: [...options.containsFields],
    extraParams: options.extraParams,
    page: options.page,
    size: options.size,
    signal: options.signal,
  });
  const results = await Promise.all(jobs);
  const items = mergePublicSearchItems(
    results.map((r) => r.items),
    options.size,
  );
  const totalCount = Math.max(
    items.length,
    ...results.map((r) => r.totalCount),
  );
  return { items, totalCount };
}
