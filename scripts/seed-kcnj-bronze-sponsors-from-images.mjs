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
 * Scraped from flyer/logo images under kcnj_sponsor_images/ and Final/.
 */
const SPONSORS = [
  {
    key: 'trinity-realty-investments',
    name: 'Trinity Realty Investments',
    companyName: 'Trinity Realty Investments',
    type: 'Bronze',
    /** High priority (gold-tier display) — sits with Gold sponsors at rank 1–2. */
    priorityRanking: 2,
    tagline: 'Building Dreams, Creating Wealth',
    description: [
      'Trinity Realty Investments — real estate investment across the USA (TX, TN, NJ and beyond).',
      'Short-term vacation rental cabins, real estate appreciation, tax benefits, 1031 exchange opportunities.',
      'Why invest: stable cash flow, long-term appreciation, economies of scale, tax benefits,',
      'community building, recession resilience, property management, leverage.',
      'Phone: 201-315-2225 · www.trinityrealty.biz',
    ].join(' '),
    contactPhone: '201-315-2225',
    contactEmail: '',
    websiteUrl: 'https://www.trinityrealty.biz',
    imageFile: 'Final/trinity_realty_landscape.jpeg',
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
    imageFile: 'Final/box_office_cinemas.jpeg',
    /** Logo-style asset — set both logo and banner URLs to the uploaded file. */
    imageRole: 'logo+banner',
  },
  {
    key: 'dr-miriam-thomas',
    name: 'Dr. Miriam Thomas',
    companyName: 'Pediatric Care of Morris',
    type: 'Bronze',
    priorityRanking: 130,
    tagline: 'Pediatric Care of Morris — Welcoming New Patients',
    description: [
      'Pediatric Care of Morris — Dr. Miriam Thomas.',
      '25+ years experience. No wait times. Same-day appointments. Round-the-clock comprehensive coverage.',
      '16 Pocono Rd STE 204, Denville, NJ 07834.',
      'Phone: (973) 627-6129.',
    ].join(' '),
    contactPhone: '(973) 627-6129',
    contactEmail: '',
    websiteUrl: '',
    imageFile: 'Final/dr_miriam_landscape.jpeg',
    imageRole: 'banner',
  },
  {
    key: 'jiby-thomas-kwik-mortgage',
    name: 'Jiby Thomas',
    companyName: 'Kwik Mortgage Corporation',
    type: 'Bronze',
    priorityRanking: 140,
    tagline: 'Unlock Your Dream Home with Kwik Mortgage',
    description: [
      'Jiby Thomas, Mortgage Banker (NMLS #1793429) — Kwik Mortgage Corporation (NMLS #138075).',
      'Home purchase loans, refinancing, first-time buyer programs, FHA/VA/conventional, jumbo and investment property loans.',
      'Local expertise, fast approvals, personalized guidance, competitive rates.',
      '959 Route 46 East, Suite 401, Parsippany, NJ 07054.',
      'Office: (908) 731-7606 · Cell: (914) 573-1616 · Jthomas@kwikmtg.com · www.kwikmtg.com',
    ].join(' '),
    contactPhone: '(908) 731-7606',
    contactEmail: 'Jthomas@kwikmtg.com',
    websiteUrl: 'https://www.kwikmtg.com',
    imageFile: 'Final/Kwik_Mortgage.png',
    imageRole: 'banner',
  },
  {
    key: 'manisha-patel-cpa',
    name: 'Manisha Patel, CPA',
    companyName: 'Manisha Patel CPA LLC',
    type: 'Bronze',
    priorityRanking: 150,
    tagline: 'Certified Public Accountant · IRS Certified Acceptance Agent',
    description: [
      'Manisha Patel, CPA — Certified Public Accountant, IRS Certified Acceptance Agent, Financial Services Professional, Healthcare Planner.',
      'Personal & business taxes, bookkeeping, payroll, retirement & education planning, will & trust, 401K/IRA rollovers, life insurance.',
      '269 Baldwin Rd UNIT 202, Parsippany, NJ 07054.',
      'Phone: 862-222-5819 · mpatel@manishapatelcpa.com · manishapatelcpa.com',
    ].join(' '),
    contactPhone: '862-222-5819',
    contactEmail: 'mpatel@manishapatelcpa.com',
    websiteUrl: 'https://manishapatelcpa.com',
    imageFile: 'Final/manisha_patel_cpa.png',
    imageRole: 'banner',
  },
  {
    key: 'meena-upadhyay',
    name: 'Meena Upadhyay',
    companyName: 'New York Life',
    type: 'Bronze',
    priorityRanking: 160,
    tagline: 'Financial Services Professional — Forbes Best-in-State 2026',
    description: [
      'Meena Upadhyay — Financial Services Professional with New York Life.',
      'Forbes Best-in-State Financial Security Professionals 2026 (Shook Research).',
      'Phone: (732) 529-5814 · mupadhyay@ft.newyorklife.com',
    ].join(' '),
    contactPhone: '(732) 529-5814',
    contactEmail: 'mupadhyay@ft.newyorklife.com',
    websiteUrl: '',
    imageFile: 'Final/meena_upadhyay.jpeg',
    imageRole: 'banner',
  },
  {
    key: 'raman-abrol-cpa',
    name: 'Raman Abrol, CPA',
    companyName: 'Raman Abrol, CPA',
    type: 'Bronze',
    priorityRanking: 170,
    tagline: 'Certified Public Accountant',
    description: [
      'Raman Abrol, CPA — business consulting, tax planning & consultation, IRS & state audit representation,',
      'regulatory tax compliance for US and India, formation of business entities, audit/compliance/review services,',
      'accounting, sales tax & payroll, tax preparation for individuals & businesses.',
      '1130 US Highway 46 West, Suite #27, Parsippany, NJ 07054.',
      'Tel: 973-331-5178 · Cell: 973-896-3541 · Fax: 973-718-4666 · raman@racpaus.com',
    ].join(' '),
    contactPhone: '973-331-5178',
    contactEmail: 'raman@racpaus.com',
    websiteUrl: '',
    imageFile: 'Final/Raman_Abrol.png',
    imageRole: 'banner',
  },
  {
    key: 'veda-dental-aesthetics',
    name: 'Veda Dental Aesthetics',
    companyName: 'Veda Family Dentistry',
    type: 'Bronze',
    priorityRanking: 180,
    tagline: 'Family Dentistry — Devipriya Thirugnanasambandam DDS',
    description: [
      'Veda Dental Aesthetics / Veda Family Dentistry — Devipriya Thirugnanasambandam DDS.',
      'Invisalign, implants, cosmetic veneers, dentures, bridges, crowns, root canals, fillings, extractions, whitening, smile design, pediatric care.',
      'Accepts major PPO plans; in-house membership and flexible payment options.',
      'West New York: 5405 Bergenline Ave, West New York, NJ 07093 · (201) 223-4444.',
      'Dover: 30 Orchard Street, Dover, NJ 07801 · (973) 366-0311 · vedafamilydentistry.com',
    ].join(' '),
    contactPhone: '(201) 223-4444',
    contactEmail: '',
    websiteUrl: 'https://vedafamilydentistry.com',
    imageFile: 'Final/Veda_dental_aesthetics.png',
    imageRole: 'banner',
  },
  {
    key: 'womens-bollyworkout',
    name: "Women's Bollyworkout",
    companyName: "Women's Bollyworkout",
    type: 'Bronze',
    priorityRanking: 190,
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
    imageFile: 'Final/womens_bollyworkout.jpeg',
    imageRole: 'banner',
  },
  {
    key: 'giventa',
    name: 'Giventa',
    companyName: 'Giventa Inc',
    type: 'Bronze',
    priorityRanking: 200,
    tagline: 'Providing AI-Based Solutions',
    description: [
      'Giventa Inc — community platforms, software services, and AI-based solutions.',
      'Website designed and developed by Giventa for the Parsippany Malayali community; powering keralacenter.org.',
      'New Jersey, USA · sales@giventa.com · www.giventa.com',
    ].join(' '),
    contactPhone: '',
    contactEmail: 'sales@giventa.com',
    websiteUrl: 'https://www.giventa.com',
    imageFile: 'Final/giventa_kcnj_flyer.jpeg',
    imageRole: 'banner',
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
  let rows = [];
  if (Array.isArray(json)) rows = json;
  else if (Array.isArray(json?.content)) rows = json.content;
  else if (Array.isArray(json?._embedded?.eventSponsors)) rows = json._embedded.eventSponsors;
  // Backend name.equals may be case-insensitive or loose — keep exact name matches only.
  return rows.filter((row) => row?.name === name);
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

  // Backend may ignore priorityRanking on POST — always patch rank + metadata + any image URLs.
  await patchSponsorUrls(
    sponsorId,
    {
      priorityRanking: spec.priorityRanking,
      tagline: spec.tagline || '',
      description: spec.description || '',
      companyName: spec.companyName || '',
      contactPhone: spec.contactPhone || undefined,
      contactEmail: spec.contactEmail || undefined,
      websiteUrl: spec.websiteUrl || undefined,
      ...urls,
    },
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
