#!/usr/bin/env node
/**
 * Seed Bronze sponsors for the current tenant from flyer/logo images under
 * public/images/KCNJ/kcnj_sponsor_images/.
 *
 * Form fields were scraped from the image pixels (vision). Append-only:
 * skips create if a sponsor with the same name already exists for the tenant;
 * still uploads banner (and logo when applicable) and patches URLs.
 *
 * Usage (from repo root, backend must be up):
 *   node scripts/seed-kcnj-bronze-sponsors-from-images.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_TENANT_ID, API_JWT_USER/PASS
 */
import { readFileSync, existsSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { File } from 'node:buffer';
import {
  assertEnv,
  getServiceJwt,
  apiFetch,
  API_BASE_URL,
  TENANT_ID,
} from './mosc-in-migration/migration-api-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IMAGE_DIR = join(ROOT, 'public', 'images', 'KCNJ', 'kcnj_sponsor_images');

/**
 * Scraped from:
 *  - womens_bolly_workout.jpeg
 *  - dr_radhika_remadevi.jpeg
 *  - box_office_cinemas.jpeg
 */
const SPONSORS = [
  {
    key: 'womens-bollyworkout',
    name: "Women's Bollyworkout",
    companyName: "Women's Bollyworkout",
    type: 'Bronze',
    priorityRanking: 100,
    tagline: 'Zumba with Bollywood Music — Get Fit with Roshini',
    description: [
      "Women's Bollyworkout: Zumba with Bollywood music for women 30+.",
      'Lead instructor: Roshini. Location: Sheraton Parsippany, 199 Smith Road, Parsippany-Troy, NJ 07054.',
      'Tuesday 5:30–6:30 PM: Full Cardio with Bollywood Songs (Zumba).',
      'Friday 5:30–6:30 PM: 30 min body strengthening & 30 min cardio.',
      'Pricing: $15 single class (1/week); $10/class for 2 classes/week.',
      'Prepay: $10 off when prepaying 16 sessions; groups of 5+ get an extra $15 off the 16-session price.',
      'Phone: 201-417-9591.',
    ].join(' '),
    contactPhone: '201-417-9591',
    contactEmail: '',
    websiteUrl: '',
    imageFile: 'womens_bolly_workout.jpeg',
    imageRole: 'banner',
  },
  {
    key: 'prime-health-medical',
    name: 'Dr. Radhika Remadevi, MD',
    companyName: 'Prime Health Medical (PHM)',
    type: 'Bronze',
    priorityRanking: 110,
    tagline: 'Primary Care Physician — Board Certified Internal Medicine',
    description: [
      'Prime Health Medical (PHM) — Dr. Radhika Remadevi, MD, Primary Care Physician, Board Certified Internal Medicine.',
      'Winner of the Barbara Israel Award for Humanism in Medicine 2008–2009 (Monmouth Medical Center).',
      'Absolutely no wait time. Full 45 mins for all new patient visits. Same day and urgent visits.',
      'Evening and weekend hours. No double booking.',
      '1129 Bloomfield Ave, Suite 209, West Caldwell, NJ 07006.',
      'Phone: (973) 500-2686 · www.primehealthmed.com · primehealthmed@gmail.com',
    ].join(' '),
    contactPhone: '(973) 500-2686',
    contactEmail: 'primehealthmed@gmail.com',
    websiteUrl: 'https://www.primehealthmed.com',
    imageFile: 'dr_radhika_remadevi.jpeg',
    imageRole: 'banner',
  },
  {
    key: 'box-office-cinemas',
    name: 'Box Office Cinemas',
    companyName: 'Box Office Cinemas',
    type: 'Bronze',
    priorityRanking: 120,
    tagline: 'Box Office Cinemas',
    description: 'Box Office Cinemas (boc) — Bronze sponsor supporting KCNJ community events.',
    contactPhone: '',
    contactEmail: '',
    websiteUrl: '',
    imageFile: 'box_office_cinemas.jpeg',
    /** Logo-style asset — set both logo and banner URLs to the uploaded file. */
    imageRole: 'logo+banner',
  },
];

function mimeFor(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function extractUploadUrl(result) {
  if (!result || typeof result !== 'object') return null;
  if (Array.isArray(result.data) && result.data[0]) {
    return result.data[0].fileUrl || result.data[0].url || null;
  }
  return result.fileUrl || result.url || null;
}

async function findExistingByName(name, token) {
  const params = new URLSearchParams({
    'name.equals': name,
    'tenantId.equals': TENANT_ID,
    size: '5',
  });
  const { res, json } = await apiFetch(
    `/api/event-sponsors?${params.toString()}`,
    { method: 'GET' },
    token
  );
  if (!res.ok) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.content)) return json.content;
  if (Array.isArray(json?._embedded?.eventSponsors)) return json._embedded.eventSponsors;
  return [];
}

async function createSponsor(spec, token) {
  const now = new Date().toISOString();
  const payload = {
    name: spec.name,
    type: spec.type,
    companyName: spec.companyName || '',
    tagline: spec.tagline || '',
    description: spec.description || '',
    websiteUrl: spec.websiteUrl || undefined,
    contactEmail: spec.contactEmail || undefined,
    contactPhone: spec.contactPhone || undefined,
    isActive: true,
    priorityRanking: spec.priorityRanking,
    tenantId: TENANT_ID,
    createdAt: now,
    updatedAt: now,
  };

  const { res, json, text } = await apiFetch(
    '/api/event-sponsors',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`Create "${spec.name}" failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

async function uploadSponsorImage(sponsorId, imagePath, imageType, token) {
  const buf = readFileSync(imagePath);
  const safeFileName = basename(imagePath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const formData = new FormData();
  formData.append('file', new File([buf], safeFileName, { type: mimeFor(imagePath) }));

  const backendImageType = `${imageType.toUpperCase()}_IMAGE`;
  const params = new URLSearchParams({
    eventId: '0',
    entityId: String(sponsorId),
    imageType: backendImageType,
    title: `Sponsor ${imageType} - ${sponsorId}`.slice(0, 120),
    description: `Bronze sponsor ${imageType} from KCNJ seed`,
    tenantId: TENANT_ID,
    isPublic: 'true',
  });

  const url = `${API_BASE_URL}/api/event-medias/upload/sponsor-image?${params.toString()}`;
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
    throw new Error(
      `Upload ${imageType} for sponsor ${sponsorId} failed (${res.status}): ${text.slice(0, 400)}`
    );
  }
  return extractUploadUrl(json);
}

async function patchSponsorUrls(sponsorId, urls, token) {
  const body = {
    id: sponsorId,
    tenantId: TENANT_ID,
    updatedAt: new Date().toISOString(),
    ...urls,
  };
  const { res, text } = await apiFetch(
    `/api/event-sponsors/${sponsorId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(body),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`PATCH sponsor ${sponsorId} URLs failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

async function seedOne(spec, token) {
  const imagePath = join(IMAGE_DIR, spec.imageFile);
  if (!existsSync(imagePath)) {
    throw new Error(`Sponsor image not found: ${imagePath}`);
  }

  let sponsorId;
  let created = false;
  const existing = await findExistingByName(spec.name, token);
  if (existing.length > 0) {
    sponsorId = existing[0].id;
    console.log(
      `[seed-kcnj-sponsors] Already exists id=${sponsorId} "${spec.name}" — skip create; upload/patch images.`
    );
  } else {
    const row = await createSponsor(spec, token);
    sponsorId = row?.id;
    if (sponsorId == null) {
      throw new Error(`Create returned no id: ${JSON.stringify(row)}`);
    }
    created = true;
    console.log(`[seed-kcnj-sponsors] ✓ Created id=${sponsorId} "${spec.name}" (${spec.type})`);
  }

  const roles =
    spec.imageRole === 'logo+banner'
      ? ['logo', 'banner']
      : spec.imageRole === 'logo'
        ? ['logo']
        : ['banner'];

  const urls = {};
  for (const role of roles) {
    const fileUrl = await uploadSponsorImage(sponsorId, imagePath, role, token);
    if (!fileUrl) {
      console.warn(`[seed-kcnj-sponsors] ⚠ Upload ${role} returned no fileUrl for id=${sponsorId}`);
      continue;
    }
    if (role === 'logo') urls.logoUrl = fileUrl;
    if (role === 'banner') urls.bannerImageUrl = fileUrl;
    console.log(`[seed-kcnj-sponsors] ✓ ${role}=${fileUrl}`);
  }

  // Backend may ignore priorityRanking on POST — always patch rank + any image URLs.
  await patchSponsorUrls(
    sponsorId,
    { priorityRanking: spec.priorityRanking, ...urls },
    token
  );
  console.log(
    `[seed-kcnj-sponsors] ✓ Patched rank=${spec.priorityRanking}${Object.keys(urls).length ? ' + image URLs' : ''} on id=${sponsorId}`
  );

  return { id: sponsorId, created, urls };
}

async function main() {
  assertEnv();
  console.log(`[seed-kcnj-sponsors] API=${API_BASE_URL} tenant=${TENANT_ID}`);
  console.log(`[seed-kcnj-sponsors] images=${IMAGE_DIR}`);
  console.log(`[seed-kcnj-sponsors] seeding ${SPONSORS.length} Bronze sponsor(s)`);

  const token = await getServiceJwt();
  const results = [];
  for (const spec of SPONSORS) {
    console.log(`[seed-kcnj-sponsors] plan: ${spec.name} | ${spec.type} | rank=${spec.priorityRanking}`);
    console.log(`[seed-kcnj-sponsors] image=${spec.imageFile}`);
    results.push(await seedOne(spec, token));
  }

  console.log('[seed-kcnj-sponsors] DONE');
  for (const r of results) {
    console.log(
      `  id=${r.id} created=${r.created} banner=${r.urls?.bannerImageUrl || '-'} logo=${r.urls?.logoUrl || '-'}`
    );
  }
}

main().catch((err) => {
  console.error('[seed-kcnj-sponsors] FAILED:', err);
  process.exit(1);
});
