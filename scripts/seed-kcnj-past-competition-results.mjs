#!/usr/bin/env node
/**
 * Seed one past KCNJ painting competition with published podium results.
 *
 * Usage: node scripts/seed-kcnj-past-competition-results.mjs
 */
import { existsSync, readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { File } from 'node:buffer';
import {
  assertEnv,
  getServiceJwt,
  apiFetch,
  TENANT_ID,
} from './mosc-in-migration/migration-api-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EVENT_TYPE_ID = Number(process.env.EVENT_TYPE_ID || 13);
const TITLE = 'KCNJ Summer Painting Competition';
const IMAGE_PATH = resolve(ROOT, 'public/images/KCNJ/events/parsippany-onam-painting-2026.jpg');

function extractList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.content)) return json.content;
  return [];
}

async function findEventByTitle(title, token) {
  const qs = new URLSearchParams({
    'title.equals': title,
    'tenantId.equals': TENANT_ID,
    size: '5',
  });
  const { res, json } = await apiFetch(`/api/event-details?${qs.toString()}`, { method: 'GET' }, token);
  if (!res.ok) return null;
  return extractList(json).find((e) => e.title === title) || null;
}

async function createEvent(token) {
  const now = new Date().toISOString();
  const payload = {
    title: TITLE,
    caption: 'Onam theme · Ages 7–11 · Awards announced',
    description: [
      'Kerala Center of New Jersey hosted a summer painting competition for young artists.',
      'Theme: Onam. Age group: 7–11. Participants brought their own coloring utensils;',
      'organizers provided a chart and pencil. Awards were announced at Volunteers Park.',
    ].join(' '),
    startDate: '2026-07-19',
    endDate: '2026-07-19',
    promotionStartDate: '2026-06-01',
    startTime: '10:00:00',
    endTime: '12:30:00',
    timezone: 'America/New_York',
    location: 'Volunteers Park, 435 N Beverwyck Rd, Lake Hiawatha, NJ 07034',
    directionsToVenue: '',
    admissionType: 'free',
    isActive: true,
    allowGuests: false,
    requireGuestApproval: false,
    enableGuestPricing: false,
    isRegistrationRequired: true,
    isSportsEvent: false,
    isCompetitionEvent: true,
    isLive: false,
    isFeaturedEvent: false,
    featuredEventPriorityRanking: 0,
    liveEventPriorityRanking: 0,
    isRecurring: false,
    paymentFlowMode: 'STRIPE_ONLY',
    manualPaymentEnabled: false,
    tenantId: TENANT_ID,
    eventType: { id: EVENT_TYPE_ID },
    donationMetadata: JSON.stringify({ isFundraiserEvent: false, isCharityEvent: false }),
    fromEmail: 'contactus@keralacenter.org',
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
    throw new Error(`Create event failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

async function uploadHeroImage(eventId, token) {
  if (!existsSync(IMAGE_PATH)) {
    console.warn(`No flyer at ${IMAGE_PATH}; skipping image upload.`);
    return;
  }
  const buf = readFileSync(IMAGE_PATH);
  const formData = new FormData();
  formData.append('file', new File([buf], basename(IMAGE_PATH), { type: 'image/jpeg' }));
  const params = new URLSearchParams({
    eventId: String(eventId),
    eventFlyer: 'true',
    isEventManagementOfficialDocument: 'false',
    isHeroImage: 'true',
    isActiveHeroImage: 'true',
    isHomePageHeroImage: 'false',
    isFeaturedEventImage: 'false',
    isFeaturedImage: 'false',
    isPublic: 'true',
    title: TITLE.slice(0, 120),
    description: 'Summer painting competition flyer',
    tenantId: TENANT_ID,
    displayOrder: '0',
  });
  const { res, text } = await apiFetch(
    `/api/event-medias/upload?${params.toString()}`,
    { method: 'POST', body: formData },
    token
  );
  if (!res.ok) {
    console.warn(`Image upload failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

async function findCompetitions(eventId, token) {
  const qs = new URLSearchParams({
    'eventId.equals': String(eventId),
    size: '20',
  });
  const { json } = await apiFetch(`/api/event-competitions?${qs.toString()}`, { method: 'GET' }, token);
  return extractList(json);
}

async function createCompetition(eventId, token) {
  const now = new Date().toISOString();
  const payload = {
    name: 'Onam Theme Painting · Ages 7–11',
    description: 'Individual painting competition. Theme: Onam.',
    competitionType: 'INDIVIDUAL',
    eligibleAudience: 'YOUTH_ONLY',
    categoryCode: 'PAINTING',
    divisionLabel: 'Ages 7–11',
    feeAmount: 0,
    timeLimitMinutes: 60,
    requiresSoundtrack: false,
    displayOrder: 0,
    isActive: true,
    disciplineCode: 'ART',
    minAge: 7,
    maxAge: 11,
    maxPlacements: 3,
    requiresTeamName: false,
    tenantId: TENANT_ID,
    event: { id: eventId },
    createdAt: now,
    updatedAt: now,
  };
  const { res, json, text } = await apiFetch(
    '/api/event-competitions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`Create competition failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

async function findResults(eventId, token) {
  const qs = new URLSearchParams({
    'eventId.equals': String(eventId),
    size: '50',
  });
  const { json } = await apiFetch(`/api/event-competition-results?${qs.toString()}`, { method: 'GET' }, token);
  return extractList(json);
}

async function createResult(eventId, competitionId, spec, token) {
  const now = new Date().toISOString();
  const payload = {
    displayName: spec.displayName,
    placement: spec.placement,
    placementLabel: spec.placementLabel,
    prizeTitle: spec.prizeTitle,
    prizeDetails: spec.prizeDetails,
    pointsAwarded: spec.pointsAwarded,
    winnerPhotoUrl: '',
    notes: spec.notes,
    isPublished: true,
    publishedAt: now,
    tenantId: TENANT_ID,
    event: { id: eventId },
    competition: { id: competitionId },
    createdAt: now,
    updatedAt: now,
  };
  const { res, json, text } = await apiFetch(
    '/api/event-competition-results',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`Create result "${spec.displayName}" failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

async function findContentBlocks(eventId, token) {
  const qs = new URLSearchParams({
    'eventId.equals': String(eventId),
    size: '20',
  });
  const { json } = await apiFetch(
    `/api/event-competition-content-blocks?${qs.toString()}`,
    { method: 'GET' },
    token
  );
  return extractList(json);
}

async function createContentBlock(eventId, blockType, title, bodyMarkdown, sortOrder, token) {
  const now = new Date().toISOString();
  const payload = {
    blockType,
    title,
    bodyMarkdown,
    sortOrder,
    tenantId: TENANT_ID,
    event: { id: eventId },
    createdAt: now,
    updatedAt: now,
  };
  const { res, json, text } = await apiFetch(
    '/api/event-competition-content-blocks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    console.warn(`Content block "${title}" skipped (${res.status}): ${text.slice(0, 300)}`);
    return null;
  }
  return json;
}

const COMPETITION_NAME = 'Onam Theme Painting · Ages 7–11';

const WINNERS = [
  {
    displayName: 'Ananya Krishnan',
    placement: 1,
    placementLabel: '1st Place',
    prizeTitle: 'Best in Theme',
    prizeDetails: 'Certificate and watercolor set',
    pointsAwarded: 10,
    notes: '',
  },
  {
    displayName: 'Rohan Nair',
    placement: 2,
    placementLabel: '2nd Place',
    prizeTitle: "Judges' Choice",
    prizeDetails: 'Certificate and sketchbook',
    pointsAwarded: 7,
    notes: '',
  },
  {
    displayName: 'Meera Varghese',
    placement: 3,
    placementLabel: '3rd Place',
    prizeTitle: 'Honorable mention',
    prizeDetails: 'Certificate and art kit',
    pointsAwarded: 5,
    notes: '',
  },
];

async function main() {
  assertEnv();
  const token = await getServiceJwt();

  let event = await findEventByTitle(TITLE, token);
  if (event?.id) {
    console.log(`Reusing existing event id=${event.id} "${TITLE}"`);
    await uploadHeroImage(event.id, token);
  } else {
    event = await createEvent(token);
    console.log(`Created event id=${event.id} "${TITLE}"`);
    await uploadHeroImage(event.id, token);
  }

  const competitions = await findCompetitions(event.id, token);
  let competition = competitions.find((c) => c.name?.includes('Ages 7')) || competitions[0];
  if (!competition?.id) {
    try {
      competition = await createCompetition(event.id, token);
      console.log(`Created competition id=${competition.id}`);
    } catch (err) {
      console.warn(`Competition catalog unavailable (${err.message}); seeding podium via content block.`);
      competition = null;
    }
  } else {
    console.log(`Reusing competition id=${competition.id}`);
  }

  const existingResults = await findResults(event.id, token);
  if (existingResults.length === 0 && competition?.id) {
    for (const winner of WINNERS) {
      const created = await createResult(event.id, competition.id, winner, token);
      console.log(`Created result id=${created.id} ${winner.placementLabel} ${winner.displayName}`);
    }
  } else if (existingResults.length > 0) {
    console.log(`Event already has ${existingResults.length} result(s); skipping result seed.`);
  }

  const blocks = await findContentBlocks(event.id, token);
  if (!blocks.some((b) => (b.blockType || '').toUpperCase() === 'RESULTS_PODIUM')) {
    const podium = WINNERS.map((w) => ({
      displayName: w.displayName,
      placement: w.placement,
      placementLabel: w.placementLabel,
      prizeTitle: w.prizeTitle,
      prizeDetails: w.prizeDetails,
      pointsAwarded: w.pointsAwarded,
      notes: w.notes,
      isPublished: true,
      competition: { name: COMPETITION_NAME },
    }));
    const created = await createContentBlock(
      event.id,
      'RESULTS_PODIUM',
      'Official placements',
      JSON.stringify(podium),
      0,
      token
    );
    if (created?.id) console.log(`Created RESULTS_PODIUM block id=${created.id}`);
  }
  if (!blocks.some((b) => (b.title || '') === 'Awards notes')) {
    const created = await createContentBlock(
      event.id,
      'RESULTS',
      'Awards notes',
      'Certificates were presented on July 19, 2026 at Volunteers Park.\nWinners may collect prize kits from the Kerala Center office during the following weekend.',
      1,
      token
    );
    if (created?.id) console.log(`Created RESULTS notes block id=${created.id}`);
  }

  const emptyTitle = 'KCNJ Youth Recitation Showcase';
  let emptyEvent = await findEventByTitle(emptyTitle, token);
  if (!emptyEvent?.id) {
    const now = new Date().toISOString();
    const { res, json, text } = await apiFetch(
      '/api/event-details',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: emptyTitle,
          caption: 'Spoken word · Results pending',
          description:
            'A youth recitation showcase hosted by Kerala Center of New Jersey. Official placements will be posted here after the judges’ announcement.',
          startDate: '2026-06-14',
          endDate: '2026-06-14',
          promotionStartDate: '2026-05-01',
          startTime: '14:00:00',
          endTime: '16:00:00',
          timezone: 'America/New_York',
          location: 'Kerala Center, Parsippany, NJ',
          directionsToVenue: '',
          admissionType: 'free',
          isActive: true,
          allowGuests: false,
          requireGuestApproval: false,
          enableGuestPricing: false,
          isRegistrationRequired: true,
          isSportsEvent: false,
          isCompetitionEvent: true,
          isLive: false,
          isFeaturedEvent: false,
          featuredEventPriorityRanking: 0,
          liveEventPriorityRanking: 0,
          isRecurring: false,
          paymentFlowMode: 'STRIPE_ONLY',
          manualPaymentEnabled: false,
          tenantId: TENANT_ID,
          eventType: { id: EVENT_TYPE_ID },
          donationMetadata: JSON.stringify({ isFundraiserEvent: false, isCharityEvent: false }),
          fromEmail: 'contactus@keralacenter.org',
          createdAt: now,
          updatedAt: now,
        }),
      },
      token
    );
    if (!res.ok) {
      console.warn(`Empty-state event skipped (${res.status}): ${text.slice(0, 400)}`);
    } else {
      emptyEvent = json;
      console.log(`Created empty-results event id=${emptyEvent.id} "${emptyTitle}"`);
    }
  } else {
    console.log(`Reusing empty-results event id=${emptyEvent.id}`);
  }

  console.log(`Done. Open Past Events on /events and expand Result for "${TITLE}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
