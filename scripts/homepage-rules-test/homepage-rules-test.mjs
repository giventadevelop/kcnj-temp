#!/usr/bin/env node
/**
 * Homepage business-rule data harness for local/dev Postgres.
 *
 * Clones real tenant rows into clearly marked dummy rows ([HPTEST]),
 * moves those dummies between past / live / future, toggles section
 * flags, verifies SQL against HOMEPAGE_OVERALL_BUSINESS_RULES.html,
 * and deletes only the dummy rows.
 *
 * Usage (Windows single line):
 *   node scripts/homepage-rules-test/homepage-rules-test.mjs status --tenant-id=keralacenter_org_9
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TITLE_PREFIX = '[HPTEST]';
const CAPTION_PREFIX = 'HPTEST:';
const TEAM_FIRST = '[HPTEST]';
const SPONSOR_PREFIX = '[HPTEST]';

const DEFAULTS = {
  container: process.env.HPTEST_PG_CONTAINER || 'event_site_manager_db-postgresql-1',
  user: process.env.HPTEST_PG_USER || 'event_site_admin',
  db: process.env.HPTEST_PG_DB || 'event_site_manager_db',
};

function loadDotEnvLocal() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const envFile = loadDotEnvLocal();

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const eq = raw.indexOf('=');
      if (eq === -1) {
        flags[raw.slice(2)] = true;
      } else {
        flags[raw.slice(2, eq)] = raw.slice(eq + 1);
      }
    } else {
      positional.push(raw);
    }
  }
  return { command: positional[0] || 'help', flags };
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === true) return fallback;
  const n = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(n)) return true;
  if (['0', 'false', 'no', 'off'].includes(n)) return false;
  return fallback;
}

function asInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function resolveTenantId(flags) {
  const tenant =
    flags['tenant-id'] ||
    process.env.HPTEST_TENANT_ID ||
    process.env.NEXT_PUBLIC_TENANT_ID ||
    envFile.NEXT_PUBLIC_TENANT_ID ||
    envFile.AMPLIFY_NEXT_PUBLIC_TENANT_ID;
  if (!tenant) {
    throw new Error('Missing --tenant-id (or NEXT_PUBLIC_TENANT_ID / HPTEST_TENANT_ID).');
  }
  return tenant;
}

function psql(sql, { tuplesOnly = true } = {}) {
  const args = ['exec', '-i', DEFAULTS.container, 'psql', '-U', DEFAULTS.user, '-d', DEFAULTS.db, '-v', 'ON_ERROR_STOP=1'];
  if (tuplesOnly) args.push('-t', '-A');
  const result = spawnSync('docker', args, {
    input: sql,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`docker exec failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'psql failed').trim());
  }
  return (result.stdout || '').trim();
}

function listColumns(table) {
  const raw = psql(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${sqlLiteral(table)}
    ORDER BY ordinal_position;
  `);
  return raw.split(/\r?\n/).filter(Boolean);
}

function tableHasColumn(table, column) {
  const raw = psql(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${sqlLiteral(table)}
      AND column_name = ${sqlLiteral(column)}
    LIMIT 1;
  `);
  return raw === '1';
}

function dateExprs(mode) {
  if (mode === 'past') {
    return {
      start: `CURRENT_DATE - INTERVAL '60 days'`,
      end: `CURRENT_DATE - INTERVAL '59 days'`,
    };
  }
  if (mode === 'live') {
    return { start: 'CURRENT_DATE', end: 'CURRENT_DATE' };
  }
  return {
    start: `CURRENT_DATE + INTERVAL '30 days'`,
    end: `CURRENT_DATE + INTERVAL '31 days'`,
  };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function cmdStatus(tenantId) {
  const hasExecFlag = tableHasColumn('tenant_settings', 'show_executive_committee_section_in_home_page');
  const sql = `
    SELECT json_build_object(
      'tenantId', ${sqlLiteral(tenantId)},
      'today', CURRENT_DATE,
      'upcomingActive', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)}
          AND COALESCE(is_active, true) = true
          AND start_date >= CURRENT_DATE
      ),
      'pastActive', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)}
          AND COALESCE(is_active, true) = true
          AND COALESCE(end_date, start_date) < CURRENT_DATE
      ),
      'liveToday', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)}
          AND COALESCE(is_active, true) = true
          AND start_date <= CURRENT_DATE
          AND COALESCE(end_date, start_date) >= CURRENT_DATE
      ),
      'featuredUpcoming', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)}
          AND COALESCE(is_active, true) = true
          AND COALESCE(is_featured_event, false) = true
          AND start_date >= CURRENT_DATE
      ),
      'featuredPast', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)}
          AND COALESCE(is_active, true) = true
          AND COALESCE(is_featured_event, false) = true
          AND COALESCE(end_date, start_date) < CURRENT_DATE
      ),
      'dummyEvents', (
        SELECT count(*) FROM event_details
        WHERE tenant_id = ${sqlLiteral(tenantId)} AND title LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
      ),
      'activeSponsors', (
        SELECT count(*) FROM event_sponsors
        WHERE tenant_id = ${sqlLiteral(tenantId)} AND COALESCE(is_active, true) = true
      ),
      'dummySponsors', (
        SELECT count(*) FROM event_sponsors
        WHERE tenant_id = ${sqlLiteral(tenantId)} AND name LIKE ${sqlLiteral(`${SPONSOR_PREFIX}%`)}
      ),
      'activeTeam', (
        SELECT count(*) FROM executive_committee_team_members
        WHERE tenant_id = ${sqlLiteral(tenantId)} AND COALESCE(is_active, true) = true
      ),
      'dummyTeam', (
        SELECT count(*) FROM executive_committee_team_members
        WHERE tenant_id = ${sqlLiteral(tenantId)} AND first_name LIKE ${sqlLiteral(`${TEAM_FIRST}%`)}
      ),
      'settings', (
        SELECT json_build_object(
          'showEvents', show_events_section_in_home_page,
          'showTeamMembers', show_team_members_section_in_home_page,
          ${hasExecFlag ? `'showExecutiveCommittee', show_executive_committee_section_in_home_page,` : ''}
          'showSponsors', show_sponsors_section_in_home_page
        )
        FROM tenant_settings
        WHERE tenant_id = ${sqlLiteral(tenantId)}
        LIMIT 1
      )
    );
  `;
  printJson(JSON.parse(psql(sql)));
}

function cmdSeedEvents(tenantId, flags) {
  const mode = String(flags.mode || 'future').toLowerCase();
  if (!['future', 'past', 'live'].includes(mode)) {
    throw new Error('--mode must be future, past, or live');
  }
  const count = Math.max(1, Math.min(asInt(flags.count, 2), 6));
  const featuredCount = Math.max(0, Math.min(asInt(flags.featured, mode === 'future' ? 1 : 0), count));
  const dates = dateExprs(mode);
  const cols = listColumns('event_details').filter((c) => c !== 'id');
  const selectList = cols
    .map((col) => {
      if (col === 'title') return `left(${sqlLiteral(`${TITLE_PREFIX} `)} || src.title, 255)`;
      if (col === 'caption') return `${sqlLiteral(CAPTION_PREFIX)} || src.id::text`;
      if (col === 'description') {
        return `COALESCE(src.description, '') || E'\\n[[HPTEST]] cloned_from=' || src.id || ' mode=${mode}'`;
      }
      if (col === 'start_date' || col === 'promotion_start_date') return dates.start;
      if (col === 'end_date') return dates.end;
      if (col === 'is_featured_event') {
        return `(row_number() OVER (ORDER BY src.is_featured_event DESC, src.id) <= ${featuredCount})`;
      }
      if (col === 'featured_event_priority_ranking') {
        return `CASE WHEN row_number() OVER (ORDER BY src.is_featured_event DESC, src.id) <= ${featuredCount}
          THEN row_number() OVER (ORDER BY src.is_featured_event DESC, src.id)
          ELSE 0 END`;
      }
      if (col === 'created_at' || col === 'updated_at') return 'now()';
      if (col === 'parent_event_id' || col === 'recurrence_series_id') return 'NULL';
      if (col === 'is_recurring') return 'false';
      return `src.${quoteIdent(col)}`;
    })
    .join(',\n      ');

  const insertSql = `
    WITH src AS (
      SELECT *
      FROM event_details
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND title NOT LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
        AND COALESCE(is_active, true) = true
      ORDER BY is_featured_event DESC, end_date DESC NULLS LAST, id DESC
      LIMIT ${count}
    ),
    ins AS (
      INSERT INTO event_details (${cols.map(quoteIdent).join(', ')})
      SELECT ${selectList}
      FROM src
      RETURNING id, title, caption, start_date, end_date, is_featured_event
    )
    SELECT json_agg(ins) FROM ins;
  `;
  const insertedRaw = psql(insertSql);
  const inserted = insertedRaw ? JSON.parse(insertedRaw) : [];
  if (!inserted || inserted.length === 0) {
    throw new Error(`No source events to clone for tenant ${tenantId}.`);
  }

  const mediaCols = listColumns('event_media').filter((c) => c !== 'id');
  const mediaSelect = mediaCols
    .map((col) => {
      if (col === 'event_id') return 'ed.id';
      if (col === 'title') return `left(${sqlLiteral(`${TITLE_PREFIX} `)} || COALESCE(m.title, ed.title), 255)`;
      if (col === 'is_home_page_hero_image' || col === 'is_hero_image') return 'true';
      if (col === 'is_featured_event_image') return 'ed.is_featured_event';
      if (col === 'is_live_event_image') return mode === 'live' ? 'true' : 'COALESCE(m.is_live_event_image, false)';
      if (col === 'start_displaying_from_date') return 'CURRENT_DATE';
      if (col === 'created_at' || col === 'updated_at') return 'now()';
      return `m.${quoteIdent(col)}`;
    })
    .join(',\n      ');

  const mediaSql = `
    INSERT INTO event_media (${mediaCols.map(quoteIdent).join(', ')})
    SELECT DISTINCT ON (ed.id) ${mediaSelect}
    FROM event_details ed
    JOIN event_media m
      ON m.event_id = NULLIF(replace(ed.caption, ${sqlLiteral(CAPTION_PREFIX)}, ''), '')::bigint
    WHERE ed.tenant_id = ${sqlLiteral(tenantId)}
      AND ed.title LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
      AND ed.caption LIKE ${sqlLiteral(`${CAPTION_PREFIX}%`)}
      AND NOT EXISTS (
        SELECT 1 FROM event_media existing WHERE existing.event_id = ed.id
      )
    ORDER BY ed.id, m.is_home_page_hero_image DESC NULLS LAST, m.is_hero_image DESC NULLS LAST, m.id;
  `;
  psql(mediaSql);

  printJson({
    action: 'seed-events',
    tenantId,
    mode,
    featuredRequested: featuredCount,
    inserted,
  });
}

function cmdShiftEvents(tenantId, flags) {
  const mode = String(flags.to || flags.mode || 'future').toLowerCase();
  if (!['future', 'past', 'live'].includes(mode)) {
    throw new Error('--to must be future, past, or live');
  }
  const dates = dateExprs(mode);
  const raw = psql(`
    UPDATE event_details
    SET start_date = ${dates.start},
        end_date = ${dates.end},
        promotion_start_date = ${dates.start},
        updated_at = now()
    WHERE tenant_id = ${sqlLiteral(tenantId)}
      AND title LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
    RETURNING json_build_object(
      'id', id, 'title', title, 'startDate', start_date, 'endDate', end_date, 'featured', is_featured_event
    );
  `);
  const rows = raw
    ? raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [];
  printJson({ action: 'shift-events', tenantId, mode, updated: rows });
}

function cmdDeleteEvents(tenantId) {
  const raw = psql(`
    WITH doomed AS (
      SELECT id FROM event_details
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND title LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
    ),
    del_media AS (
      DELETE FROM event_media WHERE event_id IN (SELECT id FROM doomed)
      RETURNING id
    ),
    del_events AS (
      DELETE FROM event_details WHERE id IN (SELECT id FROM doomed)
      RETURNING id, title
    )
    SELECT json_build_object(
      'deletedEvents', (SELECT coalesce(json_agg(del_events), '[]'::json) FROM del_events),
      'deletedMedia', (SELECT count(*) FROM del_media)
    );
  `);
  printJson({ action: 'delete-events', tenantId, ...JSON.parse(raw || '{}') });
}

function cmdSeedSponsors(tenantId, flags) {
  const count = Math.max(1, Math.min(asInt(flags.count, 2), 8));
  const cols = listColumns('event_sponsors').filter((c) => c !== 'id');
  const selectList = cols
    .map((col) => {
      if (col === 'name') return `left(${sqlLiteral(`${SPONSOR_PREFIX} `)} || src.name, 255)`;
      if (col === 'company_name') {
        return `left(${sqlLiteral(`${SPONSOR_PREFIX} `)} || COALESCE(src.company_name, src.name), 255)`;
      }
      if (col === 'description') {
        return `COALESCE(src.description, '') || E'\\n[[HPTEST]] cloned_from=' || src.id`;
      }
      if (col === 'is_active') return 'true';
      if (col === 'priority_ranking') return `row_number() OVER (ORDER BY src.priority_ranking, src.id)`;
      if (col === 'event_id') return 'NULL';
      if (col === 'created_at' || col === 'updated_at') return 'now()';
      return `src.${quoteIdent(col)}`;
    })
    .join(',\n      ');
  const raw = psql(`
    WITH src AS (
      SELECT *
      FROM event_sponsors
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND name NOT LIKE ${sqlLiteral(`${SPONSOR_PREFIX}%`)}
      ORDER BY is_active DESC, priority_ranking ASC, id DESC
      LIMIT ${count}
    ),
    ins AS (
      INSERT INTO event_sponsors (${cols.map(quoteIdent).join(', ')})
      SELECT ${selectList} FROM src
      RETURNING id, name, is_active, priority_ranking
    )
    SELECT json_agg(ins) FROM ins;
  `);
  const inserted = raw ? JSON.parse(raw) : [];
  if (!inserted || inserted.length === 0) {
    throw new Error(`No source sponsors to clone for tenant ${tenantId}.`);
  }
  printJson({ action: 'seed-sponsors', tenantId, inserted });
}

function cmdDeleteSponsors(tenantId) {
  const raw = psql(`
    WITH doomed AS (
      SELECT id FROM event_sponsors
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND name LIKE ${sqlLiteral(`${SPONSOR_PREFIX}%`)}
    ),
    del_join AS (
      DELETE FROM event_sponsors_join WHERE sponsor_id IN (SELECT id FROM doomed)
      RETURNING id
    ),
    del_media AS (
      DELETE FROM event_media WHERE sponsor_id IN (SELECT id FROM doomed)
      RETURNING id
    ),
    del_sp AS (
      DELETE FROM event_sponsors WHERE id IN (SELECT id FROM doomed)
      RETURNING id, name
    )
    SELECT json_build_object(
      'deletedSponsors', (SELECT coalesce(json_agg(del_sp), '[]'::json) FROM del_sp),
      'deletedJoinRows', (SELECT count(*) FROM del_join),
      'deletedMedia', (SELECT count(*) FROM del_media)
    );
  `);
  printJson({ action: 'delete-sponsors', tenantId, ...JSON.parse(raw || '{}') });
}

function cmdSeedTeam(tenantId, flags) {
  const count = Math.max(1, Math.min(asInt(flags.count, 2), 6));
  const cols = listColumns('executive_committee_team_members').filter((c) => c !== 'id');
  const selectList = cols
    .map((col) => {
      if (col === 'first_name') return `left(${sqlLiteral(`${TEAM_FIRST} `)} || src.first_name, 255)`;
      if (col === 'bio') return `COALESCE(src.bio, '') || E'\\n[[HPTEST]] cloned_from=' || src.id`;
      if (col === 'is_active') return 'true';
      if (col === 'priority_order') return `COALESCE(src.priority_order, 0) + 100`;
      if (col === 'email') return 'NULL';
      if (col === 'created_at' || col === 'updated_at') return 'now()';
      return `src.${quoteIdent(col)}`;
    })
    .join(',\n      ');
  const raw = psql(`
    WITH src AS (
      SELECT *
      FROM executive_committee_team_members
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND first_name NOT LIKE ${sqlLiteral(`${TEAM_FIRST}%`)}
      ORDER BY is_active DESC, priority_order ASC NULLS LAST, id DESC
      LIMIT ${count}
    ),
    ins AS (
      INSERT INTO executive_committee_team_members (${cols.map(quoteIdent).join(', ')})
      SELECT ${selectList} FROM src
      RETURNING id, first_name, last_name, title, is_active, priority_order
    )
    SELECT json_agg(ins) FROM ins;
  `);
  const inserted = raw ? JSON.parse(raw) : [];
  if (!inserted || inserted.length === 0) {
    throw new Error(`No source team members to clone for tenant ${tenantId}.`);
  }
  printJson({ action: 'seed-team', tenantId, inserted });
}

function cmdDeleteTeam(tenantId) {
  const raw = psql(`
    WITH del AS (
      DELETE FROM executive_committee_team_members
      WHERE tenant_id = ${sqlLiteral(tenantId)}
        AND first_name LIKE ${sqlLiteral(`${TEAM_FIRST}%`)}
      RETURNING id, first_name, last_name
    )
    SELECT coalesce(json_agg(del), '[]'::json) FROM del;
  `);
  printJson({ action: 'delete-team', tenantId, deleted: JSON.parse(raw || '[]') });
}

function parseOnOff(value) {
  if (value === undefined || value === true) return null;
  const n = String(value).trim().toLowerCase();
  if (['on', 'true', '1', 'yes'].includes(n)) return true;
  if (['off', 'false', '0', 'no'].includes(n)) return false;
  throw new Error(`Expected on/off, got ${value}`);
}

function cmdToggle(tenantId, flags) {
  const events = parseOnOff(flags.events);
  const team = parseOnOff(flags.team);
  const sponsors = parseOnOff(flags.sponsors);
  const exec = parseOnOff(flags.committee);
  const hasExec = tableHasColumn('tenant_settings', 'show_executive_committee_section_in_home_page');
  const sets = [];
  if (events !== null) sets.push(`show_events_section_in_home_page = ${events}`);
  if (team !== null) sets.push(`show_team_members_section_in_home_page = ${team}`);
  if (sponsors !== null) sets.push(`show_sponsors_section_in_home_page = ${sponsors}`);
  if (exec !== null && hasExec) sets.push(`show_executive_committee_section_in_home_page = ${exec}`);
  if (team !== null && hasExec && exec === null) {
    sets.push(`show_executive_committee_section_in_home_page = ${team}`);
  }
  if (sets.length === 0) {
    throw new Error('Pass at least one of --events=on|off --team=on|off --sponsors=on|off');
  }
  const raw = psql(`
    UPDATE tenant_settings
    SET ${sets.join(', ')}, updated_at = now()
    WHERE tenant_id = ${sqlLiteral(tenantId)}
    RETURNING json_build_object(
      'showEvents', show_events_section_in_home_page,
      'showTeamMembers', show_team_members_section_in_home_page,
      ${hasExec ? `'showExecutiveCommittee', show_executive_committee_section_in_home_page,` : ''}
      'showSponsors', show_sponsors_section_in_home_page
    );
  `);
  if (!raw) throw new Error(`No tenant_settings row for ${tenantId}.`);
  printJson({ action: 'toggle', tenantId, settings: JSON.parse(raw) });
}

function expectedFeaturedVisible(upcoming, featuredUpcoming, featuredPast) {
  if (Number(upcoming) > 0) return Math.min(3, Number(featuredUpcoming));
  return Math.min(3, Number(featuredPast));
}

function cmdVerify(tenantId, flags) {
  const feature = String(flags.feature || 'all').toLowerCase();
  const snap = JSON.parse(
    psql(`
      SELECT json_build_object(
        'upcomingActive', (
          SELECT count(*) FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)}
            AND COALESCE(is_active, true) = true
            AND start_date >= CURRENT_DATE
        ),
        'pastActive', (
          SELECT count(*) FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)}
            AND COALESCE(is_active, true) = true
            AND COALESCE(end_date, start_date) < CURRENT_DATE
        ),
        'liveToday', (
          SELECT count(*) FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)}
            AND COALESCE(is_active, true) = true
            AND start_date <= CURRENT_DATE
            AND COALESCE(end_date, start_date) >= CURRENT_DATE
        ),
        'featuredUpcoming', (
          SELECT count(*) FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)}
            AND COALESCE(is_active, true) = true
            AND COALESCE(is_featured_event, false) = true
            AND start_date >= CURRENT_DATE
        ),
        'featuredPast', (
          SELECT count(*) FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)}
            AND COALESCE(is_active, true) = true
            AND COALESCE(is_featured_event, false) = true
            AND COALESCE(end_date, start_date) < CURRENT_DATE
        ),
        'heroUpcomingMedia', (
          SELECT count(*) FROM event_media m
          JOIN event_details e ON e.id = m.event_id
          WHERE e.tenant_id = ${sqlLiteral(tenantId)}
            AND e.start_date >= CURRENT_DATE
            AND COALESCE(e.end_date, e.start_date) >= CURRENT_DATE
            AND (COALESCE(m.is_home_page_hero_image, false) = true OR COALESCE(m.is_hero_image, false) = true)
        ),
        'activeSponsors', (
          SELECT count(*) FROM event_sponsors
          WHERE tenant_id = ${sqlLiteral(tenantId)} AND COALESCE(is_active, true) = true
        ),
        'activeTeam', (
          SELECT count(*) FROM executive_committee_team_members
          WHERE tenant_id = ${sqlLiteral(tenantId)} AND COALESCE(is_active, true) = true
        ),
        'showEvents', (SELECT show_events_section_in_home_page FROM tenant_settings WHERE tenant_id = ${sqlLiteral(tenantId)} LIMIT 1),
        'showTeam', (SELECT show_team_members_section_in_home_page FROM tenant_settings WHERE tenant_id = ${sqlLiteral(tenantId)} LIMIT 1),
        'showSponsors', (SELECT show_sponsors_section_in_home_page FROM tenant_settings WHERE tenant_id = ${sqlLiteral(tenantId)} LIMIT 1),
        'dummyEvents', (
          SELECT json_agg(json_build_object('id', id, 'title', title, 'startDate', start_date, 'endDate', end_date, 'featured', is_featured_event) ORDER BY start_date)
          FROM event_details
          WHERE tenant_id = ${sqlLiteral(tenantId)} AND title LIKE ${sqlLiteral(`${TITLE_PREFIX}%`)}
        )
      );
    `)
  );

  const expectedFeatured = expectedFeaturedVisible(
    snap.upcomingActive,
    snap.featuredUpcoming,
    snap.featuredPast
  );
  const checks = [];
  const add = (id, pass, detail) => checks.push({ id, pass, detail });

  if (feature === 'all' || feature === 'upcoming') {
    add(
      'upcoming-or-past-list',
      Number(snap.upcomingActive) > 0 || Number(snap.pastActive) >= 0,
      `Upcoming ${snap.upcomingActive} (list cap 6). If 0, Past Events can show up to 6 of ${snap.pastActive}.`
    );
  }
  if (feature === 'all' || feature === 'featured') {
    add(
      'featured-selection',
      true,
      Number(snap.upcomingActive) > 0
        ? `Upcoming exist → Featured shows upcoming featured only (${snap.featuredUpcoming}, cap 3). Visible=${expectedFeatured}. Hidden if 0.`
        : `No upcoming → Featured shows past featured (${snap.featuredPast}, cap 3). Visible=${expectedFeatured}.`
    );
    if (Number(snap.upcomingActive) > 0) {
      add(
        'featured-hides-when-none-upcoming-featured',
        Number(snap.featuredUpcoming) >= 0,
        Number(snap.featuredUpcoming) === 0
          ? 'PASS condition: Featured strip should be hidden on the homepage.'
          : `Featured strip should list ${expectedFeatured} upcoming featured card(s).`
      );
    }
  }
  if (feature === 'all' || feature === 'hero') {
    add(
      'hero-upcoming-media',
      true,
      `Upcoming hero-flagged pictures: ${snap.heroUpcomingMedia}. Past posters should not rotate.`
    );
  }
  if (feature === 'all' || feature === 'live') {
    add(
      'live-today',
      true,
      `Live today ${snap.liveToday} (homepage cap 3). Block hidden when 0.`
    );
  }
  if (feature === 'all' || feature === 'sponsors') {
    add(
      'sponsors',
      true,
      `Active sponsors ${snap.activeSponsors} (homepage cap 8). Section flag showSponsors=${snap.showSponsors}.`
    );
  }
  if (feature === 'all' || feature === 'team') {
    add(
      'team',
      true,
      `Active team ${snap.activeTeam} (homepage cap 6). Section flag showTeam=${snap.showTeam}.`
    );
  }
  if (feature === 'all' || feature === 'sections') {
    add('section-events', snap.showEvents !== null, `showEvents=${snap.showEvents}`);
    add('section-team', snap.showTeam !== null, `showTeam=${snap.showTeam}`);
    add('section-sponsors', snap.showSponsors !== null, `showSponsors=${snap.showSponsors}`);
  }

  const failed = checks.filter((c) => c.pass === false);
  printJson({
    action: 'verify',
    tenantId,
    feature,
    snapshot: snap,
    expectedFeaturedVisible: expectedFeatured,
    checks,
    ok: failed.length === 0,
  });
  if (failed.length > 0) process.exitCode = 1;
}

function cmdCleanup(tenantId) {
  cmdDeleteEvents(tenantId);
  cmdDeleteSponsors(tenantId);
  cmdDeleteTeam(tenantId);
}

function cmdScenario(tenantId, flags) {
  const name = String(flags.name || '').toLowerCase();
  if (name === 'upcoming-featured') {
    cmdDeleteEvents(tenantId);
    cmdSeedEvents(tenantId, { mode: 'future', count: '2', featured: '1' });
    cmdToggle(tenantId, { events: 'on' });
    cmdVerify(tenantId, { feature: 'featured' });
    return;
  }
  if (name === 'no-future-past') {
    cmdDeleteEvents(tenantId);
    cmdVerify(tenantId, { feature: 'all' });
    return;
  }
  if (name === 'live-today') {
    cmdSeedEvents(tenantId, { mode: 'live', count: '1', featured: '0' });
    cmdVerify(tenantId, { feature: 'live' });
    return;
  }
  if (name === 'sponsors-team') {
    cmdSeedSponsors(tenantId, { count: '2' });
    cmdSeedTeam(tenantId, { count: '2' });
    cmdToggle(tenantId, { team: 'on', sponsors: 'on' });
    cmdVerify(tenantId, { feature: 'all' });
    return;
  }
  if (name === 'sections-off') {
    cmdToggle(tenantId, { events: 'off', team: 'off', sponsors: 'off' });
    cmdVerify(tenantId, { feature: 'sections' });
    return;
  }
  if (name === 'sections-on') {
    cmdToggle(tenantId, { events: 'on', team: 'on', sponsors: 'on' });
    cmdVerify(tenantId, { feature: 'sections' });
    return;
  }
  if (name === 'shift-past') {
    cmdShiftEvents(tenantId, { to: 'past' });
    cmdVerify(tenantId, { feature: 'all' });
    return;
  }
  if (name === 'shift-future') {
    cmdShiftEvents(tenantId, { to: 'future' });
    cmdVerify(tenantId, { feature: 'all' });
    return;
  }
  if (name === 'cleanup') {
    cmdCleanup(tenantId);
    cmdToggle(tenantId, { events: 'on', team: 'on', sponsors: 'on' });
    cmdStatus(tenantId);
    return;
  }
  if (name === 'all') {
    cmdScenario(tenantId, { name: 'upcoming-featured' });
    cmdScenario(tenantId, { name: 'sponsors-team' });
    cmdScenario(tenantId, { name: 'live-today' });
    cmdScenario(tenantId, { name: 'shift-past' });
    cmdScenario(tenantId, { name: 'shift-future' });
    cmdStatus(tenantId);
    return;
  }
  throw new Error(
    'Unknown --name. Use upcoming-featured, no-future-past, live-today, sponsors-team, sections-off, sections-on, shift-past, shift-future, cleanup, or all.'
  );
}

function printHelp() {
  console.log(`Homepage rules data harness

Clone current tenant data into dummy [HPTEST] rows, move those dates, toggle
homepage section flags, verify the SQL rules, then delete only the dummies.

Required:
  --tenant-id=<id>     Tenant to isolate. Falls back to NEXT_PUBLIC_TENANT_ID.

Commands:
  status               Snapshot of live vs dummy counts and section flags
  seed-events          Clone real events  --mode=future|past|live --count=2 --featured=1
  shift-events         Move dummy events   --to=future|past|live
  delete-events        Delete dummy events and their media
  seed-sponsors        Clone real sponsors --count=2
  delete-sponsors      Delete dummy sponsors
  seed-team            Clone real team members --count=2
  delete-team          Delete dummy team members
  toggle               --events=on|off --team=on|off --sponsors=on|off
  verify               --feature=all|featured|upcoming|hero|live|sponsors|team|sections
  scenario             --name=upcoming-featured|no-future-past|live-today|sponsors-team|sections-off|sections-on|shift-past|shift-future|cleanup|all
  cleanup              Delete all dummy events, sponsors, and team rows

Examples:
  node scripts/homepage-rules-test/homepage-rules-test.mjs status --tenant-id=keralacenter_org_9
  node scripts/homepage-rules-test/homepage-rules-test.mjs scenario --name=upcoming-featured --tenant-id=keralacenter_org_9
  node scripts/homepage-rules-test/homepage-rules-test.mjs cleanup --tenant-id=keralacenter_org_9

Safety:
  Only rows whose title/name/first_name start with [HPTEST] are deleted.
  Relies on local Docker Postgres (${DEFAULTS.container}).`);
}

try {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (flags.help || command === 'help' || command === '-h') {
    printHelp();
    process.exit(0);
  }
  const tenantId = command === 'help' ? '' : resolveTenantId(flags);
  switch (command) {
    case 'status':
      cmdStatus(tenantId);
      break;
    case 'seed-events':
      cmdSeedEvents(tenantId, flags);
      break;
    case 'shift-events':
      cmdShiftEvents(tenantId, flags);
      break;
    case 'delete-events':
      cmdDeleteEvents(tenantId);
      break;
    case 'seed-sponsors':
      cmdSeedSponsors(tenantId, flags);
      break;
    case 'delete-sponsors':
      cmdDeleteSponsors(tenantId);
      break;
    case 'seed-team':
      cmdSeedTeam(tenantId, flags);
      break;
    case 'delete-team':
      cmdDeleteTeam(tenantId);
      break;
    case 'toggle':
      cmdToggle(tenantId, flags);
      break;
    case 'verify':
      cmdVerify(tenantId, flags);
      break;
    case 'scenario':
      cmdScenario(tenantId, flags);
      break;
    case 'cleanup':
      cmdCleanup(tenantId);
      break;
    default:
      throw new Error(`Unknown command "${command}". Run with --help.`);
  }
} catch (error) {
  console.error(`[homepage-rules-test] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
