const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const USER = process.env.AMPLIFY_API_JWT_USER || process.env.API_JWT_USER || process.env.NEXT_PUBLIC_API_JWT_USER;
const PASS = process.env.AMPLIFY_API_JWT_PASS || process.env.API_JWT_PASS || process.env.NEXT_PUBLIC_API_JWT_PASS;
const SOURCE = process.env.SOURCE_TENANT || 'mcefee_org_nj_7';
const TARGET = process.env.TARGET_TENANT || 'kcnj_parsippany_8';

async function getToken() {
  const res = await fetch(`${API_BASE}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS, rememberMe: true }),
  });
  if (!res.ok) throw new Error(`auth ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.id_token) throw new Error('no id_token');
  return data.id_token;
}

function headers(token, tenantId, contentType = 'application/json') {
  const h = {
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': tenantId,
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

function asArray(data, embeddedKey) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.content)) return data.content;
    if (data._embedded) {
      const emb = data._embedded;
      if (embeddedKey && Array.isArray(emb[embeddedKey])) return emb[embeddedKey];
      const first = Object.values(emb).find(Array.isArray);
      if (Array.isArray(first)) return first;
    }
  }
  return [];
}

async function listAll(token, tenantId, path, embeddedKey) {
  const out = [];
  let page = 0;
  for (;;) {
    const qs = new URLSearchParams({
      'tenantId.equals': tenantId,
      page: String(page),
      size: '50',
      sort: 'id,asc',
    });
    const res = await fetch(`${API_BASE}${path}?${qs}`, {
      headers: headers(token, tenantId, null),
    });
    if (!res.ok) throw new Error(`GET ${path} ${res.status} ${await res.text()}`);
    const data = await res.json();
    const chunk = asArray(data, embeddedKey);
    out.push(...chunk);
    const totalPages = data.page?.totalPages;
    if (typeof totalPages === 'number') {
      if (page + 1 >= totalPages) break;
    } else if (chunk.length < 50) {
      break;
    }
    page += 1;
    if (page > 40) break;
  }
  return out;
}

function stripEventForCreate(ev, targetTenant) {
  const {
    id,
    createdAt,
    updatedAt,
    discountCodes,
    ...rest
  } = ev;
  const now = new Date().toISOString();
  const payload = {
    ...rest,
    id: null,
    tenantId: targetTenant,
    createdAt: now,
    updatedAt: now,
    discountCodes: [],
  };
  // Keep eventType id reference if present; drop null nested fields
  if (ev.eventType && ev.eventType.id) {
    payload.eventType = { id: ev.eventType.id };
  } else {
    delete payload.eventType;
  }
  return payload;
}

function stripTeamForCreate(m, targetTenant) {
  const { id, createdAt, updatedAt, ...rest } = m;
  const now = new Date().toISOString();
  return {
    ...rest,
    id: null,
    tenantId: targetTenant,
    createdAt: now,
    updatedAt: now,
  };
}

function stripMediaForCreate(media, targetTenant, newEventId) {
  const {
    id,
    createdAt,
    updatedAt,
    eventId,
    preSignedUrl,
    preSignedUrlExpiresAt,
    thumbnailPreSignedUrl,
    thumbnailPreSignedUrlExpiresAt,
    ...rest
  } = media;
  const now = new Date().toISOString();
  return {
    ...rest,
    id: null,
    tenantId: targetTenant,
    eventId: newEventId,
    preSignedUrl: null,
    preSignedUrlExpiresAt: null,
    thumbnailPreSignedUrl: null,
    thumbnailPreSignedUrlExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function post(token, tenantId, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headers(token, tenantId),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`POST ${path} ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function patchSettings(token, tenantId, patch) {
  // list settings for tenant
  const qs = new URLSearchParams({ 'tenantId.equals': tenantId, size: '1' });
  const res = await fetch(`${API_BASE}/api/tenant-settings?${qs}`, {
    headers: headers(token, tenantId, null),
  });
  if (!res.ok) throw new Error(`settings list ${res.status}`);
  const rows = asArray(await res.json(), 'tenantSettings');
  if (!rows.length) {
    console.warn('No tenant_settings row for', tenantId);
    return null;
  }
  const row = rows[0];
  const payload = { ...patch, id: row.id, tenantId };
  const patchRes = await fetch(`${API_BASE}/api/tenant-settings/${row.id}`, {
    method: 'PATCH',
    headers: headers(token, tenantId, 'application/merge-patch+json'),
    body: JSON.stringify(payload),
  });
  const text = await patchRes.text();
  if (!patchRes.ok) throw new Error(`settings patch ${patchRes.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

(async () => {
  if (!USER || !PASS) throw new Error('JWT user/pass missing in .env.local');
  console.log('API', API_BASE);
  console.log('Copy', SOURCE, '->', TARGET);

  const token = await getToken();
  console.log('Authenticated');

  const [sourceEvents, sourceTeam, targetEvents, targetTeam] = await Promise.all([
    listAll(token, SOURCE, '/api/event-details', 'eventDetails'),
    listAll(token, SOURCE, '/api/executive-committee-team-members', 'executiveCommitteeTeamMembers'),
    listAll(token, TARGET, '/api/event-details', 'eventDetails'),
    listAll(token, TARGET, '/api/executive-committee-team-members', 'executiveCommitteeTeamMembers'),
  ]);

  console.log({
    sourceEvents: sourceEvents.length,
    sourceTeam: sourceTeam.length,
    targetEventsBefore: targetEvents.length,
    targetTeamBefore: targetTeam.length,
  });

  // Dry-run info: upcoming active on source
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sourceEvents.filter((e) => e.isActive && e.startDate && String(e.startDate).slice(0, 10) >= today);
  console.log('Source upcoming active (>= today):', upcoming.length, upcoming.map((e) => ({ id: e.id, title: e.title, startDate: e.startDate })));

  const existingTitles = new Set(targetEvents.map((e) => `${e.title}||${e.startDate}`));
  const existingTeamKeys = new Set(targetTeam.map((m) => `${m.firstName}|${m.lastName}|${m.title || ''}`));

  const eventIdMap = new Map(); // sourceId -> targetId
  let createdEvents = 0;
  let skippedEvents = 0;

  for (const ev of sourceEvents) {
    const key = `${ev.title}||${ev.startDate}`;
    if (existingTitles.has(key)) {
      skippedEvents += 1;
      const existing = targetEvents.find((t) => t.title === ev.title && t.startDate === ev.startDate);
      if (existing?.id && ev.id) eventIdMap.set(ev.id, existing.id);
      continue;
    }
    const payload = stripEventForCreate(ev, TARGET);
    const created = await post(token, TARGET, '/api/event-details', payload);
    createdEvents += 1;
    if (ev.id && created?.id) eventIdMap.set(ev.id, created.id);
    console.log('Created event', created?.id, created?.title);
  }

  // Copy homepage-relevant medias for mapped events
  let createdMedia = 0;
  for (const [sourceEventId, targetEventId] of eventIdMap.entries()) {
    const qs = new URLSearchParams({
      'tenantId.equals': SOURCE,
      'eventId.equals': String(sourceEventId),
      size: '50',
    });
    const res = await fetch(`${API_BASE}/api/event-medias?${qs}`, {
      headers: headers(token, SOURCE, null),
    });
    if (!res.ok) {
      console.warn('media list failed for event', sourceEventId, res.status);
      continue;
    }
    const medias = asArray(await res.json(), 'eventMedias');
    // Prefer hero / homepage hero images; if none, copy up to 3
    const preferred = medias.filter((m) => m.isHomePageHeroImage || m.isHeroImage || m.eventMediaType === 'EVENT_BANNER' || m.eventMediaType === 'HERO_IMAGE');
    const toCopy = (preferred.length ? preferred : medias).slice(0, 3);

    // existing media for target event
    const tqs = new URLSearchParams({
      'tenantId.equals': TARGET,
      'eventId.equals': String(targetEventId),
      size: '50',
    });
    const tres = await fetch(`${API_BASE}/api/event-medias?${tqs}`, {
      headers: headers(token, TARGET, null),
    });
    const existingMedia = tres.ok ? asArray(await tres.json(), 'eventMedias') : [];
    const existingUrls = new Set(existingMedia.map((m) => m.fileUrl).filter(Boolean));

    for (const media of toCopy) {
      if (media.fileUrl && existingUrls.has(media.fileUrl)) continue;
      const payload = stripMediaForCreate(media, TARGET, targetEventId);
      try {
        await post(token, TARGET, '/api/event-medias', payload);
        createdMedia += 1;
      } catch (err) {
        console.warn('media create failed', media.id, String(err).slice(0, 200));
      }
    }
  }

  let createdTeam = 0;
  let skippedTeam = 0;
  for (const m of sourceTeam) {
    const key = `${m.firstName}|${m.lastName}|${m.title || ''}`;
    if (existingTeamKeys.has(key)) {
      skippedTeam += 1;
      continue;
    }
    const payload = stripTeamForCreate(m, TARGET);
    const created = await post(token, TARGET, '/api/executive-committee-team-members', payload);
    createdTeam += 1;
    console.log('Created team', created?.id, created?.firstName, created?.lastName);
  }

  // Enable homepage sections on target tenant
  try {
    await patchSettings(token, TARGET, {
      showEventsSectionInHomePage: true,
      showExecutiveCommitteeSectionInHomePage: true,
      showTeamMembersSectionInHomePage: true,
      showSponsorsSectionInHomePage: true,
    });
    console.log('Updated tenant_settings homepage flags for', TARGET);
  } catch (err) {
    console.warn('settings update failed:', String(err));
  }

  console.log(JSON.stringify({
    createdEvents,
    skippedEvents,
    createdMedia,
    createdTeam,
    skippedTeam,
    eventIdMapSize: eventIdMap.size,
  }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
