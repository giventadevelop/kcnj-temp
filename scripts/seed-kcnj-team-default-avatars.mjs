#!/usr/bin/env node
/**
 * For the current tenant (.env.local NEXT_PUBLIC_TENANT_ID):
 * - Rename every executive committee member to "Team Member 1", "Team Member 2", …
 * - Upload the same default avatar as each member's profile image
 *
 * Usage (from repo root; backend must be up):
 *   node scripts/seed-kcnj-team-default-avatars.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_TENANT_ID, API_JWT_USER/PASS
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
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

const DEFAULT_AVATAR =
  process.env.KCNJ_DEFAULT_TEAM_AVATAR ||
  resolve(
    REPO_ROOT,
    'public/images/mcefee_team_members/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg'
  );

async function listAllMembers(token) {
  const params = new URLSearchParams({
    'tenantId.equals': TENANT_ID,
    page: '0',
    size: '200',
    sort: 'priorityOrder,asc',
  });
  const { res, json, text } = await apiFetch(
    `/api/executive-committee-team-members?${params}`,
    { method: 'GET' },
    token
  );
  if (!res.ok) {
    throw new Error(`List members failed (${res.status}): ${text.slice(0, 400)}`);
  }
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.content)) return json.content;
  if (Array.isArray(json?._embedded?.['executive-committee-team-members'])) {
    return json._embedded['executive-committee-team-members'];
  }
  return [];
}

function extractUploadUrl(result) {
  if (!result || typeof result !== 'object') return null;
  if (Array.isArray(result.data) && result.data[0]) {
    return result.data[0].fileUrl || result.data[0].url || null;
  }
  return result.fileUrl || result.url || null;
}

async function uploadProfileImage(memberId, imagePath, token) {
  const buf = readFileSync(imagePath);
  // ASCII-safe filename (S3 signing can fail on long/unicode names)
  const file = new File([buf], `team-member-${memberId}-default.jpg`, {
    type: 'image/jpeg',
  });
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams({
    eventId: '0',
    executiveTeamMemberID: String(memberId),
    eventFlyer: 'false',
    isEventManagementOfficialDocument: 'false',
    isHeroImage: 'false',
    isActiveHeroImage: 'false',
    isFeaturedImage: 'false',
    isPublic: 'true',
    isTeamMemberProfileImage: 'true',
    title: `Team Member Profile Image - ${memberId}`,
    description: 'Default placeholder profile image',
    tenantId: TENANT_ID,
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
    throw new Error(`Upload for member ${memberId} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return extractUploadUrl(json);
}

async function patchMember(memberId, payload, token) {
  const { res, text } = await apiFetch(
    `/api/executive-committee-team-members/${memberId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({
        id: memberId,
        tenantId: TENANT_ID,
        ...payload,
      }),
    },
    token
  );
  if (!res.ok) {
    throw new Error(`PATCH member ${memberId} failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

async function main() {
  assertEnv();

  if (!existsSync(DEFAULT_AVATAR)) {
    throw new Error(`Missing default avatar: ${DEFAULT_AVATAR}`);
  }

  console.log(`[seed-team-default] API=${API_BASE_URL} tenant=${TENANT_ID}`);
  console.log(`[seed-team-default] avatar=${DEFAULT_AVATAR}`);

  const token = await getServiceJwt();
  const existing = await listAllMembers(token);
  if (!existing.length) {
    console.log('[seed-team-default] No team members found for this tenant — nothing to update.');
    return;
  }

  const sorted = [...existing].sort(
    (a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0)
  );

  console.log(`[seed-team-default] Updating ${sorted.length} member(s)…`);

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const id = row?.id;
    if (id == null) continue;

    const n = i + 1;
    const firstName = 'Team';
    const lastName = `Member ${n}`;
    const title = 'Volunteer';
    const designation = 'Volunteer';

    await patchMember(
      id,
      {
        firstName,
        lastName,
        title,
        designation,
        priorityOrder: (n - 1) * 10,
        isActive: true,
      },
      token
    );

    const imageUrl = await uploadProfileImage(id, DEFAULT_AVATAR, token);
    if (imageUrl) {
      await patchMember(id, { profileImageUrl: imageUrl }, token);
      console.log(`  ✓ ${firstName} ${lastName} (id=${id}) image ok`);
    } else {
      console.warn(`  ✓ ${firstName} ${lastName} (id=${id}) — renamed but no image URL returned`);
    }
  }

  const after = await listAllMembers(token);
  console.log(`[seed-team-default] Done. Tenant now has ${after.length} member(s):`);
  for (const row of after.sort((a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0))) {
    console.log(
      `  ${String(row.priorityOrder ?? '').padStart(3)}  ${row.firstName} ${row.lastName} — ${row.designation || row.title} — ${row.profileImageUrl ? 'img ok' : 'NO IMG'}`
    );
  }
}

main().catch((err) => {
  console.error('[seed-team-default] FAILED:', err);
  process.exit(1);
});
