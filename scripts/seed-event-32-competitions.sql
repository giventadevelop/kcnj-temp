-- Replace competition data for event 32 (kcnj_parsippany_8 / kcnj-temp).
-- Mirrors event 38 Group A/B/C catalog + published results with work photos.
-- Does NOT modify event 38 / keralacenter_org_9.

BEGIN;

-- 1) Clear existing competition graph for event 32 (FK-safe order)
UPDATE event_competition_result
SET winner_media_id = NULL, work_media_id = NULL
WHERE event_id = 32;

DELETE FROM event_competition_group_member
WHERE registration_id IN (
  SELECT id FROM event_competition_registration WHERE event_id = 32
);

DELETE FROM event_competition_result WHERE event_id = 32;
DELETE FROM event_competition_registration WHERE event_id = 32;
DELETE FROM event_competition WHERE event_id = 32;
DELETE FROM event_competition_day WHERE event_id = 32;
DELETE FROM event_competition_content_block WHERE event_id = 32;

-- Keep one settings row; align with painting-competition defaults
UPDATE event_competition_settings
SET
  audience_mode = 'YOUTH',
  registration_mode = 'PARENT_CHILD',
  registration_open = false,
  allow_ticket_sales = false,
  points_first = 10,
  points_second = 7,
  points_third = 5,
  points_fourth = 0,
  default_max_placements = 3,
  results_display_mode = 'FULL_NAME',
  eligibility_text = 'Youth painting competition. Age groups: 4-6, 7-11, and 12-16.',
  updated_at = NOW()
WHERE event_id = 32;

INSERT INTO event_competition_settings (
  tenant_id, event_id, audience_mode, registration_mode, registration_open,
  allow_ticket_sales, points_first, points_second, points_third, points_fourth,
  default_max_placements, champion_enabled, champion_exclude_group_points,
  results_display_mode, eligibility_text, created_at, updated_at
)
SELECT
  'kcnj_parsippany_8', 32, 'YOUTH', 'PARENT_CHILD', false,
  false, 10, 7, 5, 0,
  3, false, false,
  'FULL_NAME', 'Youth painting competition. Age groups: 4-6, 7-11, and 12-16.',
  NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM event_competition_settings WHERE event_id = 32
);

-- 2) Schedule day
INSERT INTO event_competition_day (
  tenant_id, event_id, day_label, event_date, venue_name, venue_address, sort_order, notes, created_at, updated_at
) VALUES (
  'kcnj_parsippany_8', 32, 'Competition Day', '2026-08-30',
  'Kerala Center of New Jersey', 'Parsippany, NJ', 0,
  'Parsippany Onam 2026 Painting Competition', NOW(), NOW()
);

-- 3) Competitions (Group A/B/C)
INSERT INTO event_competition (
  tenant_id, event_id, name, description, competition_type, eligible_audience,
  fee_amount, display_order, is_active, min_age, max_age, max_placements,
  requires_soundtrack, requires_team_name, created_at, updated_at
) VALUES
(
  'kcnj_parsippany_8', 32, 'Group A (Ages 4-6)',
  'Painting competition - Group A, ages 4 to 6 years. Parsippany Onam 2026.',
  'INDIVIDUAL', 'YOUTH_ONLY', 0, 1, true, 4, 6, 3, false, false, NOW(), NOW()
),
(
  'kcnj_parsippany_8', 32, 'Group B (Ages 7-11)',
  'Painting competition - Group B, ages 7 to 11 years. Parsippany Onam 2026.',
  'INDIVIDUAL', 'YOUTH_ONLY', 0, 2, true, 7, 11, 5, false, false, NOW(), NOW()
),
(
  'kcnj_parsippany_8', 32, 'Group C (Ages 12-16)',
  'Painting competition - Group C, ages 12 to 16 years. Parsippany Onam 2026.',
  'INDIVIDUAL', 'YOUTH_ONLY', 0, 3, true, 12, 16, 3, false, false, NOW(), NOW()
);

-- 4) Clone work photos into event 32 media (reuse proven S3 URLs; new tenant/event ownership)
WITH source AS (
  SELECT id, title, description, event_media_type, storage_type, file_url,
         file_data_content_type, content_type, file_size, is_public
  FROM event_media
  WHERE id IN (1440, 1441, 1442, 1443, 1444, 1445, 1446, 1447, 1448)
),
ins AS (
  INSERT INTO event_media (
    tenant_id, title, description, event_media_type, storage_type, file_url,
    file_data_content_type, content_type, file_size, is_public,
    event_flyer, is_agenda_flyer, is_email_header_image, is_event_management_official_document,
    display_order, download_count, is_featured_video, is_hero_image, is_active_hero_image,
    start_displaying_from_date, created_at, updated_at, event_id,
    priority_ranking, is_home_page_hero_image, is_featured_event_image, is_live_event_image
  )
  SELECT
    'kcnj_parsippany_8',
    REPLACE(s.title, 'result ', 'event32-result-src-'),
    COALESCE(s.description, 'Winning work photo for Parsippany Onam painting competition (event 32)'),
    COALESCE(NULLIF(s.event_media_type, ''), 'gallery'),
    COALESCE(NULLIF(s.storage_type, ''), 'S3'),
    s.file_url,
    s.file_data_content_type,
    COALESCE(s.content_type, 'image/jpeg'),
    s.file_size,
    COALESCE(s.is_public, true),
    false, false, false, false,
    0, 0, false, false, false,
    CURRENT_DATE, NOW(), NOW(), 32,
    0, false, false, false
  FROM source s
  RETURNING id, file_url, title
)
SELECT * FROM ins;

-- Map source media id -> new media id via file_url
-- 5) Insert published results for new competitions
WITH comps AS (
  SELECT id, name FROM event_competition WHERE event_id = 32
),
media_map AS (
  SELECT
    em.id AS new_media_id,
    em.file_url,
    CASE
      WHEN em.file_url LIKE '%a03890a5%' THEN 'Sahasra Sanjay'
      WHEN em.file_url LIKE '%4de68803%' THEN 'Ayaansh Kukkadapu'
      WHEN em.file_url LIKE '%de7e0711%' THEN 'Anvit Hora'
      WHEN em.file_url LIKE '%3110d774%' THEN 'Aanya Kukkadapu'
      WHEN em.file_url LIKE '%633dfe99%' THEN 'Dhwani Mukesh'
      WHEN em.file_url LIKE '%adb9403e%' THEN 'Dhruv Mukesh'
      WHEN em.file_url LIKE '%b46ad5ce%' THEN 'Satvik Shyam'
      WHEN em.file_url LIKE '%a8347351%' THEN 'Lillian Lawrence'
      WHEN em.file_url LIKE '%60422ec7%' THEN 'Arnavi Sachidanand'
    END AS display_name
  FROM event_media em
  WHERE em.event_id = 32
    AND em.tenant_id = 'kcnj_parsippany_8'
    AND em.file_url LIKE '%keralacenter_org_9%'
),
payload AS (
  SELECT * FROM (VALUES
    ('Group A (Ages 4-6)', 'Sahasra Sanjay', 1, '1st Place', 10, '1st Place'),
    ('Group A (Ages 4-6)', 'Ayaansh Kukkadapu', 2, '2nd Place', 7, '2nd Place'),
    ('Group A (Ages 4-6)', 'Anvit Hora', 3, '3rd Place', 5, '3rd Place'),
    ('Group B (Ages 7-11)', 'Aanya Kukkadapu', 1, '1st Place', 10, '1st Place'),
    ('Group B (Ages 7-11)', 'Dhwani Mukesh', 2, '2nd Place', 7, '2nd Place'),
    ('Group B (Ages 7-11)', 'Dhruv Mukesh', 3, '3rd Place', 5, '3rd Place'),
    ('Group B (Ages 7-11)', 'Satvik Shyam', 4, 'Special Mention', 0, 'Special Mention'),
    ('Group B (Ages 7-11)', 'Lillian Lawrence', 5, 'Special Mention', 0, 'Special Mention'),
    ('Group C (Ages 12-16)', 'Arnavi Sachidanand', 1, '1st Place', 10, '1st Place')
  ) AS v(comp_name, display_name, placement, placement_label, points_awarded, prize_title)
)
INSERT INTO event_competition_result (
  tenant_id, event_id, competition_id, display_name, placement, placement_label,
  prize_title, prize_details, points_awarded, winner_photo_url, winner_media_id,
  work_photo_url, work_media_id, notes, is_published, published_at, created_at, updated_at
)
SELECT
  'kcnj_parsippany_8',
  32,
  c.id,
  p.display_name,
  p.placement,
  p.placement_label,
  p.prize_title,
  '',
  p.points_awarded,
  NULL,
  NULL,
  m.file_url,
  m.new_media_id,
  'Seeded for kcnj-temp event 32 from Onam 2026 painting results',
  true,
  NOW(),
  NOW(),
  NOW()
FROM payload p
JOIN comps c ON c.name = p.comp_name
LEFT JOIN media_map m ON m.display_name = p.display_name;

-- 6) Update event 32 listing/detail fields used by /events and /events/32
UPDATE event_details
SET
  title = 'Parsippany Onam 2026 - Painting Competition',
  description = 'Kerala Center of New Jersey hosted a summer painting competition for young artists. Theme: Onam. Age groups: 4-6, 7-11, and 12-16.',
  start_date = '2026-08-30',
  end_date = '2026-08-30',
  location = 'Parsippany, NJ',
  is_active = true,
  is_featured_event = true,
  featured_event_priority_ranking = 10,
  is_live = true,
  live_event_priority_ranking = 10,
  updated_at = NOW()
WHERE id = 32
  AND tenant_id = 'kcnj_parsippany_8';

COMMIT;

-- Verification
SELECT 'competitions' AS kind, count(*)::text AS n FROM event_competition WHERE event_id = 32
UNION ALL
SELECT 'results', count(*)::text FROM event_competition_result WHERE event_id = 32
UNION ALL
SELECT 'results_with_work_url', count(*)::text FROM event_competition_result WHERE event_id = 32 AND work_photo_url IS NOT NULL AND work_photo_url <> ''
UNION ALL
SELECT 'results_with_work_media', count(*)::text FROM event_competition_result WHERE event_id = 32 AND work_media_id IS NOT NULL
UNION ALL
SELECT 'days', count(*)::text FROM event_competition_day WHERE event_id = 32
UNION ALL
SELECT 'settings', count(*)::text FROM event_competition_settings WHERE event_id = 32;
