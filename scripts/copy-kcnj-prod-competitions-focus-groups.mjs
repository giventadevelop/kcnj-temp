#!/usr/bin/env node
/**
 * Copy competition + focus-group data from KCNJ-prod tenant → this project's tenant.
 *
 * Source: keralacenter_org_9 (kcnj-prod)
 * Target: kcnj_parsippany_8 (kcnj-temp) — from .env.local NEXT_PUBLIC_TENANT_ID
 *
 * Idempotent: skips creates when a matching row already exists (by slug/name/placement).
 * Does not invent focus groups if source has none.
 *
 * Usage (from repo root):
 *   node scripts/copy-kcnj-prod-competitions-focus-groups.mjs
 *
 * Optional:
 *   COPY_API_BASE_URL=https://event-site-manager-dev.com
 *   SOURCE_TENANT=keralacenter_org_9
 *   TARGET_TENANT=kcnj_parsippany_8
 *   SOURCE_EVENT_ID=38
 *   TARGET_EVENT_ID=32
 *   DRY_RUN=1
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
}

const API =
  process.env.COPY_API_BASE_URL ||
  process.env.MOSC_API_BASE_URL ||
  'https://event-site-manager-dev.com';
const SRC = process.env.SOURCE_TENANT || 'keralacenter_org_9';
const DST = process.env.TARGET_TENANT || process.env.NEXT_PUBLIC_TENANT_ID || 'kcnj_parsippany_8';
const SOURCE_EVENT_ID = Number(process.env.SOURCE_EVENT_ID || 38);
const TARGET_EVENT_ID = Number(process.env.TARGET_EVENT_ID || 32);
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const JWT_USER =
  process.env.AMPLIFY_API_JWT_USER ||
  process.env.API_JWT_USER ||
  process.env.NEXT_PUBLIC_API_JWT_USER;
const JWT_PASS =
  process.env.AMPLIFY_API_JWT_PASS ||
  process.env.API_JWT_PASS ||
  process.env.NEXT_PUBLIC_API_JWT_PASS;

function log(...args) {
  console.log('[copy-comp-fg]', ...args);
}

async function getToken() {
  const res = await fetch(`${API}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: JWT_USER, password: JWT_PASS, rememberMe: true }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`auth ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  return json.id_token;
}

async function api(method, path, tenant, body, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': tenant,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] =
      method === 'PATCH' ? 'application/merge-patch+json' : 'application/json';
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

function asList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.content)) return json.content;
  if (json?._embedded) {
    const key = Object.keys(json._embedded)[0];
    if (Array.isArray(json._embedded[key])) return json._embedded[key];
  }
  return [];
}

async function list(path, tenant, token, extra = {}) {
  const qs = new URLSearchParams({
    'tenantId.equals': tenant,
    size: '200',
    page: '0',
    sort: 'id,asc',
    ...extra,
  });
  const { res, json, text } = await api('GET', `${path}?${qs}`, tenant, undefined, token);
  if (!res.ok) throw new Error(`GET ${path} (${tenant}) ${res.status}: ${text.slice(0, 300)}`);
  return asList(json);
}

function stripNested(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  delete out.event;
  delete out.competition;
  delete out.competitionDay;
  delete out.participantProfile;
  delete out.registration;
  delete out.winnerMedia;
  delete out.workMedia;
  delete out.focusGroup;
  return out;
}

async function copyFocusGroups(token) {
  const src = await list('/api/focus-groups', SRC, token);
  const dst = await list('/api/focus-groups', DST, token);
  const bySlug = new Map(dst.map((g) => [g.slug, g]));
  const idMap = new Map();
  let created = 0;
  let skipped = 0;

  log(`focus-groups src=${src.length} dst=${dst.length}`);
  if (src.length === 0) {
    log('No focus groups on source tenant — nothing to copy.');
    return idMap;
  }

  for (const g of src) {
    const existing = bySlug.get(g.slug);
    if (existing) {
      idMap.set(g.id, existing.id);
      skipped += 1;
      log(`skip focus-group slug=${g.slug} → dst id=${existing.id}`);
      continue;
    }
    const now = new Date().toISOString();
    const payload = {
      ...stripNested(g),
      tenantId: DST,
      name: g.name,
      slug: g.slug,
      description: g.description || '',
      coverImageUrl: g.coverImageUrl || undefined,
      isActive: g.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    if (DRY_RUN) {
      log(`DRY create focus-group ${g.slug}`);
      continue;
    }
    const { res, json, text } = await api('POST', '/api/focus-groups', DST, payload, token);
    if (!res.ok) throw new Error(`POST focus-group ${g.slug}: ${res.status} ${text.slice(0, 400)}`);
    idMap.set(g.id, json.id);
    created += 1;
    log(`created focus-group ${g.slug} id=${json.id}`);
  }
  log(`focus-groups done created=${created} skipped=${skipped}`);
  return idMap;
}

async function copyEventFocusLinks(token, focusGroupIdMap) {
  const srcLinks = await list('/api/event-focus-groups', SRC, token);
  if (srcLinks.length === 0) {
    log('No event_focus_groups on source — skip.');
    return;
  }
  const srcEvents = await list('/api/event-details', SRC, token);
  const dstEvents = await list('/api/event-details', DST, token);
  const eventIdMap = new Map();
  for (const se of srcEvents) {
    const match =
      dstEvents.find((d) => d.title === se.title) ||
      dstEvents.find(
        (d) =>
          se.title &&
          d.title &&
          d.title.toLowerCase().includes('painting') &&
          se.title.toLowerCase().includes('painting')
      );
    if (match) eventIdMap.set(se.id, match.id);
  }

  const dstLinks = await list('/api/event-focus-groups', DST, token);
  const key = (eventId, fgId) => `${eventId}:${fgId}`;
  const existing = new Set(
    dstLinks.map((l) => key(l.eventId ?? l.event?.id, l.focusGroupId ?? l.focusGroup?.id))
  );

  let created = 0;
  let skipped = 0;
  for (const link of srcLinks) {
    const srcEventId = link.eventId ?? link.event?.id;
    const srcFgId = link.focusGroupId ?? link.focusGroup?.id;
    const dstEventId = eventIdMap.get(srcEventId);
    const dstFgId = focusGroupIdMap.get(srcFgId);
    if (!dstEventId || !dstFgId) {
      log(`skip link event ${srcEventId}→? fg ${srcFgId}→? (unmapped)`);
      skipped += 1;
      continue;
    }
    if (existing.has(key(dstEventId, dstFgId))) {
      skipped += 1;
      continue;
    }
    const now = new Date().toISOString();
    const payload = {
      tenantId: DST,
      event: { id: dstEventId },
      focusGroup: { id: dstFgId },
      createdAt: now,
      updatedAt: now,
    };
    if (DRY_RUN) {
      log(`DRY link event=${dstEventId} fg=${dstFgId}`);
      continue;
    }
    const { res, text } = await api('POST', '/api/event-focus-groups', DST, payload, token);
    if (!res.ok) throw new Error(`POST event-focus-groups: ${res.status} ${text.slice(0, 400)}`);
    created += 1;
  }
  log(`event-focus-groups created=${created} skipped=${skipped}`);
}

async function deleteChildrenForEvent(token, eventId) {
  const regs = await list('/api/event-competition-registrations', DST, token, {
    'eventId.equals': String(eventId),
  });
  for (const r of regs) {
    if (DRY_RUN) {
      log(`DRY DELETE registration ${r.id}`);
      continue;
    }
    const { res, text } = await api(
      'DELETE',
      `/api/event-competition-registrations/${r.id}`,
      DST,
      undefined,
      token
    );
    if (!res.ok && res.status !== 404) {
      log(`warn DELETE registration ${r.id}: ${res.status} ${text.slice(0, 200)}`);
    }
  }

  const results = await list('/api/event-competition-results', DST, token, {
    'eventId.equals': String(eventId),
  });
  for (const r of results) {
    if (DRY_RUN) {
      log(`DRY DELETE result ${r.id}`);
      continue;
    }
    const { res, text } = await api(
      'DELETE',
      `/api/event-competition-results/${r.id}`,
      DST,
      undefined,
      token
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`DELETE result ${r.id}: ${res.status} ${text.slice(0, 300)}`);
    }
  }

  const blocks = await list('/api/event-competition-content-blocks', DST, token, {
    'eventId.equals': String(eventId),
  });
  for (const b of blocks) {
    if (DRY_RUN) {
      log(`DRY DELETE content-block ${b.id}`);
      continue;
    }
    const { res, text } = await api(
      'DELETE',
      `/api/event-competition-content-blocks/${b.id}`,
      DST,
      undefined,
      token
    );
    if (!res.ok && res.status !== 404) {
      log(`warn DELETE content-block ${b.id}: ${res.status} ${text.slice(0, 200)}`);
    }
  }

  const comps = await list('/api/event-competitions', DST, token, {
    'eventId.equals': String(eventId),
  });
  for (const c of comps) {
    if (DRY_RUN) {
      log(`DRY DELETE competition ${c.id} ${c.name}`);
      continue;
    }
    const { res, text } = await api(
      'DELETE',
      `/api/event-competitions/${c.id}`,
      DST,
      undefined,
      token
    );
    if (!res.ok && res.status !== 404) {
      // Some backends soft-fail deletes; deactivate instead so public UI ignores them.
      log(`warn DELETE competition ${c.id}: ${res.status} — deactivating instead`);
      await api(
        'PATCH',
        `/api/event-competitions/${c.id}`,
        DST,
        {
          id: c.id,
          tenantId: DST,
          isActive: false,
          name: `${c.name} (archived)`,
          updatedAt: new Date().toISOString(),
        },
        token
      );
    } else if (res.ok) {
      // Confirm gone; if still listed later, deactivate leftover after create.
      log(`deleted competition ${c.id} ${c.name}`);
    }
  }

  const days = await list('/api/event-competition-days', DST, token, {
    'eventId.equals': String(eventId),
  });
  for (const d of days) {
    if (DRY_RUN) {
      log(`DRY DELETE day ${d.id}`);
      continue;
    }
    const { res, text } = await api(
      'DELETE',
      `/api/event-competition-days/${d.id}`,
      DST,
      undefined,
      token
    );
    if (!res.ok && res.status !== 404) {
      log(`warn DELETE day ${d.id}: ${res.status} ${text.slice(0, 200)}`);
    }
  }
}

async function upsertSettings(token) {
  const srcSettings = await list('/api/event-competition-settings', SRC, token, {
    'eventId.equals': String(SOURCE_EVENT_ID),
  });
  const dstSettings = await list('/api/event-competition-settings', DST, token, {
    'eventId.equals': String(TARGET_EVENT_ID),
  });
  const src = srcSettings[0];
  if (!src) {
    log('No source competition settings — skip settings.');
    return;
  }
  const payload = {
    tenantId: DST,
    audienceMode: src.audienceMode,
    registrationMode: src.registrationMode,
    registrationOpen: !!src.registrationOpen,
    allowTicketSales: !!src.allowTicketSales,
    pointsFirst: src.pointsFirst,
    pointsSecond: src.pointsSecond,
    pointsThird: src.pointsThird,
    pointsFourth: src.pointsFourth,
    defaultMaxPlacements: src.defaultMaxPlacements,
    championEnabled: !!src.championEnabled,
    championExcludeGroupPoints: !!src.championExcludeGroupPoints,
    resultsDisplayMode: src.resultsDisplayMode,
    eligibilityText: src.eligibilityText || '',
    event: { id: TARGET_EVENT_ID },
    updatedAt: new Date().toISOString(),
  };
  if (dstSettings[0]) {
    if (DRY_RUN) {
      log(`DRY PATCH settings id=${dstSettings[0].id}`);
      return;
    }
    const { res, text } = await api(
      'PATCH',
      `/api/event-competition-settings/${dstSettings[0].id}`,
      DST,
      { ...payload, id: dstSettings[0].id },
      token
    );
    if (!res.ok) throw new Error(`PATCH settings: ${res.status} ${text.slice(0, 400)}`);
    log(`patched settings id=${dstSettings[0].id}`);
  } else {
    if (DRY_RUN) {
      log('DRY POST settings');
      return;
    }
    const { res, json, text } = await api(
      'POST',
      '/api/event-competition-settings',
      DST,
      { ...payload, createdAt: new Date().toISOString() },
      token
    );
    if (!res.ok) throw new Error(`POST settings: ${res.status} ${text.slice(0, 400)}`);
    log(`created settings id=${json?.id}`);
  }
}

async function copyCompetitionsAndResults(token) {
  const srcComps = await list('/api/event-competitions', SRC, token, {
    'eventId.equals': String(SOURCE_EVENT_ID),
  });
  if (srcComps.length === 0) {
    log(`No competitions on source event ${SOURCE_EVENT_ID}`);
    return;
  }

  const dstEventList = await list('/api/event-details', DST, token, {
    'id.equals': String(TARGET_EVENT_ID),
  });
  if (dstEventList.length === 0) {
    throw new Error(`Target event ${TARGET_EVENT_ID} not found on ${DST}`);
  }

  log(
    `Replacing target event ${TARGET_EVENT_ID} competition graph with source event ${SOURCE_EVENT_ID} (${srcComps.length} comps)`
  );
  await deleteChildrenForEvent(token, TARGET_EVENT_ID);
  await upsertSettings(token);

  const srcDays = await list('/api/event-competition-days', SRC, token, {
    'eventId.equals': String(SOURCE_EVENT_ID),
  });
  const dayIdMap = new Map();
  for (const d of srcDays) {
    const now = new Date().toISOString();
    const payload = {
      tenantId: DST,
      dayLabel: d.dayLabel,
      eventDate: d.eventDate,
      venueName: d.venueName || '',
      venueAddress: d.venueAddress || '',
      sortOrder: d.sortOrder ?? 0,
      notes: d.notes || '',
      event: { id: TARGET_EVENT_ID },
      createdAt: now,
      updatedAt: now,
    };
    if (DRY_RUN) {
      log(`DRY POST day ${d.dayLabel}`);
      continue;
    }
    const { res, json, text } = await api(
      'POST',
      '/api/event-competition-days',
      DST,
      payload,
      token
    );
    if (!res.ok) throw new Error(`POST day: ${res.status} ${text.slice(0, 400)}`);
    dayIdMap.set(d.id, json.id);
    log(`created day id=${json.id} ${d.dayLabel}`);
  }

  // If source has no days, keep a single Competition Day for public schedule UX
  if (srcDays.length === 0 && !DRY_RUN) {
    const now = new Date().toISOString();
    const { res, json, text } = await api(
      'POST',
      '/api/event-competition-days',
      DST,
      {
        tenantId: DST,
        dayLabel: 'Competition Day',
        eventDate: dstEventList[0].startDate || '2026-08-30',
        venueName: 'Kerala Center of New Jersey',
        venueAddress: dstEventList[0].location || 'Parsippany, NJ',
        sortOrder: 0,
        notes: 'Copied from prod painting competition',
        event: { id: TARGET_EVENT_ID },
        createdAt: now,
        updatedAt: now,
      },
      token
    );
    if (!res.ok) log(`warn POST default day: ${res.status} ${text.slice(0, 200)}`);
    else log(`created default day id=${json?.id}`);
  }

  const compIdMap = new Map();
  for (const c of srcComps) {
    const now = new Date().toISOString();
    const payload = {
      tenantId: DST,
      name: c.name,
      description: c.description || '',
      competitionType: c.competitionType || 'INDIVIDUAL',
      eligibleAudience: c.eligibleAudience || 'YOUTH_ONLY',
      categoryCode: c.categoryCode || 'ART',
      divisionLabel: c.divisionLabel || '',
      feeAmount: c.feeAmount ?? 0,
      displayOrder: c.displayOrder ?? 0,
      isActive: c.isActive !== false,
      disciplineCode: c.disciplineCode || 'ART',
      minAge: c.minAge,
      maxAge: c.maxAge,
      maxPlacements: c.maxPlacements,
      requiresSoundtrack: !!c.requiresSoundtrack,
      requiresTeamName: !!c.requiresTeamName,
      timeLimitMinutes: c.timeLimitMinutes,
      event: { id: TARGET_EVENT_ID },
      createdAt: now,
      updatedAt: now,
    };
    const srcDayId = c.competitionDay?.id;
    if (srcDayId && dayIdMap.get(srcDayId)) {
      payload.competitionDay = { id: dayIdMap.get(srcDayId) };
    }
    if (DRY_RUN) {
      log(`DRY POST competition ${c.name}`);
      continue;
    }
    const { res, json, text } = await api('POST', '/api/event-competitions', DST, payload, token);
    if (!res.ok) throw new Error(`POST competition ${c.name}: ${res.status} ${text.slice(0, 400)}`);
    compIdMap.set(c.id, json.id);
    log(`created competition ${c.name} id=${json.id}`);
  }

  const srcResults = await list('/api/event-competition-results', SRC, token, {
    'eventId.equals': String(SOURCE_EVENT_ID),
  });
  let resultsCreated = 0;
  for (const r of srcResults) {
    const srcCompId = r.competition?.id ?? r.competitionId;
    const dstCompId = compIdMap.get(srcCompId);
    if (!dstCompId && !DRY_RUN) {
      log(`skip result ${r.displayName} — competition unmapped`);
      continue;
    }
    const now = new Date().toISOString();
    const payload = {
      tenantId: DST,
      displayName: r.displayName,
      placement: r.placement,
      placementLabel: r.placementLabel || '',
      prizeTitle: r.prizeTitle || r.placementLabel || '',
      prizeDetails: r.prizeDetails || '',
      pointsAwarded: r.pointsAwarded ?? 0,
      winnerPhotoUrl: r.winnerPhotoUrl || undefined,
      workPhotoUrl: r.workPhotoUrl || undefined,
      notes: r.notes || `Copied from ${SRC} event ${SOURCE_EVENT_ID}`,
      isPublished: r.isPublished !== false,
      publishedAt: r.publishedAt || now,
      event: { id: TARGET_EVENT_ID },
      competition: { id: dstCompId || 0 },
      createdAt: now,
      updatedAt: now,
    };
    if (DRY_RUN) {
      log(`DRY POST result ${r.displayName} placement=${r.placement}`);
      continue;
    }
    const { res, text } = await api('POST', '/api/event-competition-results', DST, payload, token);
    if (!res.ok) {
      throw new Error(`POST result ${r.displayName}: ${res.status} ${text.slice(0, 400)}`);
    }
    resultsCreated += 1;
  }
  log(`results created=${resultsCreated} (source had ${srcResults.length})`);

  // Deactivate any leftover competitions on the target event that were not created this run
  const keepNames = new Set(srcComps.map((c) => c.name));
  const leftover = await list('/api/event-competitions', DST, token, {
    'eventId.equals': String(TARGET_EVENT_ID),
  });
  for (const c of leftover) {
    if (keepNames.has(c.name)) continue;
    if (DRY_RUN) {
      log(`DRY deactivate leftover ${c.id} ${c.name}`);
      continue;
    }
    await api(
      'PATCH',
      `/api/event-competitions/${c.id}`,
      DST,
      {
        id: c.id,
        tenantId: DST,
        isActive: false,
        name: c.name.includes('(archived)') ? c.name : `${c.name} (archived)`,
        updatedAt: new Date().toISOString(),
      },
      token
    );
    log(`deactivated leftover competition ${c.id} ${c.name}`);
  }

  const srcBlocks = await list('/api/event-competition-content-blocks', SRC, token, {
    'eventId.equals': String(SOURCE_EVENT_ID),
  });
  for (const b of srcBlocks) {
    const now = new Date().toISOString();
    const payload = {
      tenantId: DST,
      blockType: b.blockType,
      title: b.title || '',
      bodyMarkdown: b.bodyMarkdown || '',
      sortOrder: b.sortOrder ?? 0,
      isVisible: b.isVisible !== false,
      event: { id: TARGET_EVENT_ID },
      createdAt: now,
      updatedAt: now,
    };
    if (DRY_RUN) {
      log(`DRY POST content-block ${b.title}`);
      continue;
    }
    const { res, text } = await api(
      'POST',
      '/api/event-competition-content-blocks',
      DST,
      payload,
      token
    );
    if (!res.ok) {
      log(`warn POST content-block: ${res.status} ${text.slice(0, 250)}`);
    } else {
      log(`created content-block ${b.title || b.blockType}`);
    }
  }

  // Align public event flags/title with source painting competition
  const srcEvents = await list('/api/event-details', SRC, token, {
    'id.equals': String(SOURCE_EVENT_ID),
  });
  const srcEvent = srcEvents[0];
  if (srcEvent && !DRY_RUN) {
    const patch = {
      id: TARGET_EVENT_ID,
      tenantId: DST,
      title: srcEvent.title || dstEventList[0].title,
      caption: srcEvent.caption || dstEventList[0].caption || '',
      description: srcEvent.description || dstEventList[0].description || '',
      startDate: srcEvent.startDate || dstEventList[0].startDate,
      endDate: srcEvent.endDate || srcEvent.startDate || dstEventList[0].endDate,
      startTime: srcEvent.startTime || dstEventList[0].startTime || '10:00:00',
      endTime: srcEvent.endTime || dstEventList[0].endTime || '13:00:00',
      timezone: srcEvent.timezone || dstEventList[0].timezone || 'America/New_York',
      location: srcEvent.location || dstEventList[0].location || '',
      admissionType: srcEvent.admissionType || dstEventList[0].admissionType || 'free',
      isActive: true,
      isCompetitionEvent: true,
      isRegistrationRequired: !!(srcEvent.isRegistrationRequired ?? dstEventList[0].isRegistrationRequired),
      allowGuests: !!(srcEvent.allowGuests ?? dstEventList[0].allowGuests),
      requireGuestApproval: !!(srcEvent.requireGuestApproval ?? dstEventList[0].requireGuestApproval),
      enableGuestPricing: !!(srcEvent.enableGuestPricing ?? dstEventList[0].enableGuestPricing),
      enableQrCode: (srcEvent.enableQrCode ?? dstEventList[0].enableQrCode) !== false,
      isSportsEvent: !!(srcEvent.isSportsEvent ?? dstEventList[0].isSportsEvent),
      isLive: !!(srcEvent.isLive ?? dstEventList[0].isLive),
      isFeaturedEvent: !!(srcEvent.isFeaturedEvent ?? dstEventList[0].isFeaturedEvent),
      featuredEventPriorityRanking:
        srcEvent.featuredEventPriorityRanking ??
        dstEventList[0].featuredEventPriorityRanking ??
        0,
      liveEventPriorityRanking:
        srcEvent.liveEventPriorityRanking ?? dstEventList[0].liveEventPriorityRanking ?? 0,
      paymentFlowMode: srcEvent.paymentFlowMode || dstEventList[0].paymentFlowMode || 'STRIPE_ONLY',
      updatedAt: new Date().toISOString(),
    };
    if (dstEventList[0].eventType?.id) patch.eventType = { id: dstEventList[0].eventType.id };
    const { res, text } = await api(
      'PATCH',
      `/api/event-details/${TARGET_EVENT_ID}`,
      DST,
      patch,
      token
    );
    if (!res.ok) log(`warn PATCH event-details: ${res.status} ${text.slice(0, 250)}`);
    else log(`patched target event ${TARGET_EVENT_ID} title/flags from source`);
  }
}

async function verify(token) {
  const comps = await list('/api/event-competitions', DST, token, {
    'eventId.equals': String(TARGET_EVENT_ID),
  });
  const results = await list('/api/event-competition-results', DST, token, {
    'eventId.equals': String(TARGET_EVENT_ID),
  });
  const fgs = await list('/api/focus-groups', DST, token);
  log('VERIFY focus-groups=', fgs.length);
  log(
    'VERIFY competitions=',
    comps.map((c) => c.name).join(' | ')
  );
  log('VERIFY results=', results.length);
  for (const r of results.sort((a, b) => (a.placement || 0) - (b.placement || 0))) {
    log(
      `  ${r.competition?.name || '?'} · ${r.placementLabel} · ${r.displayName} · photo=${!!r.workPhotoUrl}`
    );
  }
}

async function main() {
  if (!JWT_USER || !JWT_PASS) throw new Error('Missing API_JWT_USER / API_JWT_PASS');
  log(`API=${API}`);
  log(`SRC=${SRC} event=${SOURCE_EVENT_ID}`);
  log(`DST=${DST} event=${TARGET_EVENT_ID}`);
  log(`DRY_RUN=${DRY_RUN}`);
  const token = await getToken();
  log('authenticated');

  const fgMap = await copyFocusGroups(token);
  await copyEventFocusLinks(token, fgMap);
  await copyCompetitionsAndResults(token);
  await verify(token);
  log('DONE');
}

main().catch((err) => {
  console.error('[copy-comp-fg] FAILED:', err);
  process.exit(1);
});
