import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl, getTenantId } from '@/lib/env';

export type SchoolPageRecord = {
  id?: number;
  slug?: string;
  title?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type SchoolStaffRecord = {
  id?: number;
  staffCategory?: string;
  stage?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  qualification?: string;
  subjectName?: string;
  classTeacherOf?: string;
  profileImageUrl?: string;
  bio?: string;
  priorityOrder?: number;
  isActive?: boolean;
};

export type SchoolNamedRecord = {
  id?: number;
  name?: string;
  slug?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  activityKind?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type SchoolHighlightRecord = {
  id?: number;
  personName?: string;
  subtitle?: string;
  imageUrl?: string;
  academicYear?: string;
};

export type SchoolFeeInvoiceRecord = {
  id?: number;
  title?: string;
  academicYear?: string;
  feeKind?: string;
  studentName?: string;
  classLabel?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  amountDue?: number;
  currency?: string;
  status?: string;
};

export type NewsFlashRecord = {
  id?: number;
  headline?: string;
  title?: string;
  linkUrl?: string;
  link?: string;
};

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}

export async function fetchSchoolResource<T>(path: string, query: Record<string, string> = {}): Promise<T[]> {
  try {
    const params = new URLSearchParams({
      'tenantId.equals': getTenantId(),
      size: '100',
      ...query,
    });
    const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/${path}?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return asList<T>(await response.json());
  } catch (error) {
    console.error(`[school] ${path}`, error);
    return [];
  }
}

export async function fetchSchoolHome() {
  const today = new Date().toISOString().slice(0, 10);
  const [flashes, principalPages, facilities, highlights, events] = await Promise.all([
    fetchSchoolResource<NewsFlashRecord>('news-flashes', { sort: 'id,desc', 'isActive.equals': 'true' }),
    fetchSchoolResource<SchoolPageRecord>('school-pages', {
      'slug.equals': 'principals-message',
      'isActive.equals': 'true',
      size: '1',
    }),
    fetchSchoolResource<SchoolNamedRecord>('school-facilities', {
      sort: 'sortOrder,asc',
      'isActive.equals': 'true',
    }),
    fetchSchoolResource<SchoolHighlightRecord>('school-highlights', {
      sort: 'sortOrder,asc',
      'isActive.equals': 'true',
    }),
    fetchSchoolResource<{ id?: number; title?: string; startDate?: string; description?: string }>('event-details', {
      sort: 'startDate,asc',
      'startDate.greaterThanOrEqual': today,
    }),
  ]);
  return {
    flashes,
    principal: principalPages[0] || null,
    facilities: facilities.slice(0, 8),
    highlights: highlights.slice(0, 8),
    events: events.slice(0, 6),
  };
}
