import { proxyApiPath } from '@/lib/proxyApiPath';

const SUGGESTION_LIMIT = 20;

export interface FetchPublicTypeaheadOptions {
  /** Backend resource under `/api/proxy/{resource}` (e.g. `event-sponsors`). */
  resource: string;
  query: string;
  /** Fields to query with `.contains` in parallel. */
  containsFields: string[];
  /** Extra criteria (do NOT include tenantId.equals — proxy injects it). */
  extraParams?: Record<string, string>;
  size?: number;
}

function itemKey(item: Record<string, unknown>): string {
  if (item.id != null) return `id:${item.id}`;
  return `row:${JSON.stringify(item).slice(0, 80)}`;
}

function mergeById<T extends Record<string, unknown>>(lists: T[][]): T[] {
  const byKey = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      const key = itemKey(item);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values()).slice(0, SUGGESTION_LIMIT);
}

async function fetchProxyList<T>(
  resource: string,
  params: URLSearchParams,
): Promise<T[]> {
  const path = proxyApiPath(`/api/proxy/${resource}?${params.toString()}`);
  const response = await fetch(path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? (data as T[]) : [];
}

/**
 * Multi-field public typeahead against `/api/proxy/{resource}`.
 * Parallel `.contains` queries (+ numeric `id.equals` when query is an integer), then merge/dedupe.
 */
export async function fetchPublicTypeahead<T extends Record<string, unknown>>(
  options: FetchPublicTypeaheadOptions,
): Promise<T[]> {
  const trimmed = options.query.trim();
  if (!trimmed) return [];

  const size = String(options.size ?? SUGGESTION_LIMIT);
  const base = new URLSearchParams({
    page: '0',
    size,
    ...(options.extraParams ?? {}),
  });

  const requests: Promise<T[]>[] = options.containsFields.map((field) => {
    const params = new URLSearchParams(base);
    params.set(`${field}.contains`, trimmed);
    return fetchProxyList<T>(options.resource, params);
  });

  if (/^\d+$/.test(trimmed)) {
    const params = new URLSearchParams(base);
    params.set('id.equals', trimmed);
    requests.push(fetchProxyList<T>(options.resource, params));
  }

  const results = await Promise.all(requests);
  return mergeById(results);
}
