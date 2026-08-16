#!/usr/bin/env node
/**
 * Replace event_details (+ hero media) for the current tenant with KCNJ charity-site
 * events scraped from events.html + flyer image transcription.
 *
 * Source: F:\project_workspace\NJ-Malayalees-MCEEFEE-Charity-Site\events.html
 * Images:  ...\images\
 *
 * When flyers only have a month range (e.g. AUG-SEP 2026), start/end are the last
 * Saturday / Sunday of those months (per product request).
 *
 * Usage: node scripts/seed-mcefee-events-from-charity-site.mjs
 */
import { config } from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { File } from 'node:buffer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
config({ path: resolve(REPO_ROOT, '.env.local') });

const {
  assertEnv,
  getServiceJwt,
  apiFetch,
  API_BASE_URL,
  TENANT_ID,
} = await import('./mosc-in-migration/migration-api-lib.mjs');

const IMAGE_DIR =
  process.env.KCNJ_EVENTS_IMAGE_DIR ||
  'F:\\project_workspace\\NJ-Malayalees-MCEEFEE-Charity-Site\\images';

const EVENT_TYPE_ID = Number(process.env.KCNJ_EVENT_TYPE_ID || 13); // Cultural Festival

/** Last Sat (start) / Sun (end) of a calendar month (1–12). */
function lastWeekendOfMonth(year, month, which) {
  const d = new Date(year, month, 0); // last day of month
  const want = which === 'sunday' ? 0 : 6;
  while (d.getDay() !== want) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Scraped from events.html + flyer OCR (image-edit / vision transcription of posters).
 * HTML lists 2 upcoming + 2 past; flyers enrich performers/contacts when no exact day.
 */
const EVENTS = [
  {
    key: 'spark-onam-2026',
    title: 'Spark of Kerala Season 2',
    caption: 'Celebrating the Vibrant Spirit of Onam · USA Tour',
    description: [
      'KCNJ presents Spark of Kerala Season 2 — a showcase of performance arts and rhythm celebrating the vibrant spirit of Onam.',
      'Featuring Biju Narayanan with Suhaid Kukku, Sudheesh, Keerthana S K, Anna Prasad, Shiju, Yasir, Vipin, Suneesh and live orchestra.',
      'Show direction: Vipin Manohar. Powered by Spectrum Auto; show partners Daily Delight and EventGram.',
      'Booking: Sujith +1 (551) 283-2437 · Arun +1 (551) 221-1972 · contactus@mcefee.org',
    ].join('\n\n'),
    // Flyer: AUG-SEP 2026 (no day) → last Sat Aug / last Sun Sep
    startDate: lastWeekendOfMonth(2026, 8, 'saturday'),
    endDate: lastWeekendOfMonth(2026, 9, 'sunday'),
    promotionStartDate: '2026-06-01',
    startTime: '05:00 PM',
    endTime: '10:00 PM',
    location: 'USA Tour — New Jersey & select cities',
    admissionType: 'ticketed',
    isFeaturedEvent: true,
    featuredEventPriorityRanking: 1,
    // Prefer landscape wide flyer so homepage/events cards span full width
    image: 'spark_kerala_event_2026_aug_wide.jpg',
    imageMime: 'image/jpeg',
  },
  {
    key: 'veena-2026',
    title: 'Nadha Varnika Veena Concert',
    caption: 'USA Fall Tour 2026',
    description: [
      'KCNJ presents Nādha Varnika — a classical Veena concert on the USA Fall Tour 2026.',
      'Featuring Sangita Kala Acharya Dr. R.S. Jayalakshmi, Kumari Charulatha Chandrasekar, and Kannan Tripunithura.',
      'Booking: Krish (210) 549-7622 · Arun (551) 221-1972 · www.mcefee.org',
    ].join('\n\n'),
    // HTML: OCT-NOV 2026 · flyer: USA FALL TOUR 2026
    startDate: lastWeekendOfMonth(2026, 10, 'saturday'),
    endDate: lastWeekendOfMonth(2026, 11, 'sunday'),
    promotionStartDate: '2026-08-01',
    startTime: '05:00 PM',
    endTime: '09:00 PM',
    location: 'USA Tour — select cities',
    admissionType: 'ticketed',
    isFeaturedEvent: true,
    featuredEventPriorityRanking: 2,
    image: 'veena_concert_2026_wide.jpg',
    imageMime: 'image/jpeg',
  },
  {
    key: 'spark-past-2026',
    title: 'Spark of Kerala Season 2',
    caption: 'USA Tour · A showcase of Kerala culture',
    description: [
      'Past presentation of Spark of Kerala Season 2 — a showcase of Kerala culture: performance, arts and rhythm with live orchestra.',
      'Featuring Biju Narayan, Dayyana Hameed, Sidhique Roshan, Suhaid Kukku, Anna Prasad, Keerthana S K, Sudheesh, Shiju, Suneeshmon, Vipinkumar, Yasir.',
      'Booking archive: Sujith +1 (551) 283-2437 · Arun +1 (551) 221-1972 · contactus@mcefee.org',
    ].join('\n\n'),
    // HTML Past: MAY-JUN 2026
    startDate: lastWeekendOfMonth(2026, 5, 'saturday'),
    endDate: lastWeekendOfMonth(2026, 6, 'sunday'),
    promotionStartDate: '2026-03-01',
    startTime: '05:00 PM',
    endTime: '10:00 PM',
    location: 'USA Tour',
    admissionType: 'ticketed',
    isFeaturedEvent: false,
    featuredEventPriorityRanking: 0,
    image: 'spark_kerala_event_2026_fb_banner.jpg',
    imageMime: 'image/jpeg',
  },
  {
    key: 'spark-2025',
    title: 'Spark of Kerala',
    caption: 'A showcase of performance arts and rhythm · USA 2025',
    description: [
      'Past presentation of Spark of Kerala — a showcase of performance arts and rhythm across the USA.',
      'Featuring Swasika, Afsal, Mokksha, Akhila Anand, Veda Mithra, Sidhique Roshan, Kukku, Minnale Nazeer, Shiju, Vipin Kumar, Jojo Mathew, Suneeshmon.',
      'Tour sponsors: World Wide Property Management, Global Collision & Body Works LLC.',
      'Booking archive: Sujith +1 551-283-2437 · Arun +1 551-221-1972 · contactus@mcefee.org',
    ].join('\n\n'),
    // HTML Past: AUG-SEP 2025
    startDate: lastWeekendOfMonth(2025, 8, 'saturday'),
    endDate: lastWeekendOfMonth(2025, 9, 'sunday'),
    promotionStartDate: '2025-06-01',
    startTime: '05:00 PM',
    endTime: '10:00 PM',
    location: 'USA Tour',
    admissionType: 'ticketed',
    isFeaturedEvent: false,
    featuredEventPriorityRanking: 0,
    image: 'spark_kerala_event_2025.jpeg',
    imageMime: 'image/jpeg',
  },
];

function normalizeList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.content)) return json.content;
  return [];
}

async function listEvents(token) {
  const params = new URLSearchParams({
    'tenantId.equals': TENANT_ID,
    page: '0',
    size: '200',
    sort: 'id,asc',
  });
  const { res, json, text } = await apiFetch(
    `/api/event-details?${params}`,
    { method: 'GET' },
    token
  );
  if (!res.ok) throw new Error(`List events failed (${res.status}): ${text.slice(0, 400)}`);
  return normalizeList(json);
}

async function listMediaForEvent(eventId, token) {
  const params = new URLSearchParams({
    'eventId.equals': String(eventId),
    'tenantId.equals': TENANT_ID,
    page: '0',
    size: '100',
  });
  const { res, json } = await apiFetch(`/api/event-medias?${params}`, { method: 'GET' }, token);
  if (!res.ok) return [];
  return normalizeList(json);
}

async function deleteMedia(id, token) {
  const { res, text } = await apiFetch(`/api/event-medias/${id}`, { method: 'DELETE' }, token);
  if (!res.ok && res.status !== 404) {
    console.warn(`  warn: delete media ${id} → ${res.status} ${text.slice(0, 120)}`);
  }
}

async function deleteEvent(id, token) {
  const { res, text } = await apiFetch(`/api/event-details/${id}`, { method: 'DELETE' }, token);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete event ${id} failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

async function createEvent(spec, token) {
  const now = new Date().toISOString();
  const payload = {
    title: spec.title,
    caption: spec.caption,
    description: spec.description,
    startDate: spec.startDate,
    endDate: spec.endDate,
    promotionStartDate: spec.promotionStartDate,
    startTime: spec.startTime,
    endTime: spec.endTime,
    timezone: 'America/New_York',
    location: spec.location,
    directionsToVenue: '',
    admissionType: spec.admissionType,
    isActive: true,
    allowGuests: false,
    requireGuestApproval: false,
    enableGuestPricing: false,
    isRegistrationRequired: false,
    isSportsEvent: false,
    isCompetitionEvent: false,
    isLive: false,
    isFeaturedEvent: !!spec.isFeaturedEvent,
    featuredEventPriorityRanking: spec.featuredEventPriorityRanking || 0,
    liveEventPriorityRanking: 0,
    isRecurring: false,
    paymentFlowMode: 'STRIPE_ONLY',
    manualPaymentEnabled: false,
    tenantId: TENANT_ID,
    eventType: { id: EVENT_TYPE_ID },
    donationMetadata: JSON.stringify({ isFundraiserEvent: false, isCharityEvent: false }),
    fromEmail: 'contactus@mcefee.org',
    createdAt: now,
    updatedAt: now,
  };

  const { res, json, text } = await apiFetch(
    '/api/event-details',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`Create "${spec.title}" failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

function extractUploadUrl(result) {
  if (!result || typeof result !== 'object') return null;
  if (Array.isArray(result.data) && result.data[0]) {
    return result.data[0].fileUrl || result.data[0].url || null;
  }
  return result.fileUrl || result.url || null;
}

async function uploadHeroImage(eventId, spec, token) {
  const imagePath = join(IMAGE_DIR, spec.image);
  const buf = readFileSync(imagePath);
  // Keep filenames / query params ASCII-safe — S3 signing can fail on unicode.
  const safeTitle = (spec.title || 'Event').normalize('NFKD').replace(/[^\x20-\x7E]/g, '');
  const safeCaption = (spec.caption || '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '');
  const safeFileName = spec.image.replace(/[^a-zA-Z0-9._-]/g, '_');
  const formData = new FormData();
  formData.append('file', new File([buf], safeFileName, { type: spec.imageMime }));

  const params = new URLSearchParams({
    eventId: String(eventId),
    eventFlyer: 'true',
    isEventManagementOfficialDocument: 'false',
    isHeroImage: 'true',
    isActiveHeroImage: 'true',
    isHomePageHeroImage: 'true',
    isFeaturedEventImage: String(!!spec.isFeaturedEvent),
    isFeaturedImage: String(!!spec.isFeaturedEvent),
    isPublic: 'true',
    title: safeTitle.slice(0, 120),
    description: safeCaption.slice(0, 200),
    tenantId: TENANT_ID,
    displayOrder: '0',
  });

  const url = `${API_BASE_URL}/api/event-medias/upload?${params.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': TENANT_ID,
    },
    body: formData,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(`Upload for event ${eventId} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return extractUploadUrl(json);
}

async function main() {
  assertEnv();
  console.log(`[seed-events] API=${API_BASE_URL} tenant=${TENANT_ID}`);
  console.log(`[seed-events] images=${IMAGE_DIR}`);
  console.log(`[seed-events] eventTypeId=${EVENT_TYPE_ID}`);

  for (const e of EVENTS) {
    const p = join(IMAGE_DIR, e.image);
    if (!existsSync(p)) throw new Error(`Missing image: ${p}`);
    console.log(
      `  plan: ${e.title} | ${e.startDate} → ${e.endDate} | ${e.image}`
    );
  }

  const token = await getServiceJwt();
  const existing = await listEvents(token);
  console.log(`[seed-events] Found ${existing.length} existing event(s) — deleting media + events…`);

  for (const row of existing) {
    if (row?.id == null) continue;
    const medias = await listMediaForEvent(row.id, token);
    for (const m of medias) {
      if (m?.id != null) await deleteMedia(m.id, token);
    }
    await deleteEvent(row.id, token);
    console.log(`  deleted event id=${row.id} "${row.title}" (+ ${medias.length} media)`);
  }

  console.log(`[seed-events] Creating ${EVENTS.length} events…`);
  for (const spec of EVENTS) {
    const created = await createEvent(spec, token);
    const id = created?.id;
    if (id == null) {
      throw new Error(`Create returned no id for ${spec.title}: ${JSON.stringify(created)}`);
    }
    const imageUrl = await uploadHeroImage(id, spec, token);
    console.log(
      `  ✓ id=${id} ${spec.title} ${spec.startDate}→${spec.endDate} img=${imageUrl ? 'ok' : 'MISSING'}`
    );
  }

  const after = await listEvents(token);
  console.log(`[seed-events] Done. Tenant now has ${after.length} event(s):`);
  for (const row of after.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))) {
    console.log(`  ${row.startDate}  ${row.title}  featured=${row.isFeaturedEvent}`);
  }
}

main().catch((err) => {
  console.error('[seed-events] FAILED:', err);
  process.exit(1);
});
