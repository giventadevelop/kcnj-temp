-- Personal profile — header menu: Achievements, Affiliations, Projects
-- (independent of homepage section flags)
-- Apply via Liquibase in event-site-manager-service; canonical DDL in Event_Site_Manager_Latest_Schema.sql

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS show_header_achievements boolean,
  ADD COLUMN IF NOT EXISTS show_header_affiliations boolean,
  ADD COLUMN IF NOT EXISTS show_header_projects boolean;

COMMENT ON COLUMN public.tenant_settings.show_header_achievements IS
  'When true, public header shows Achievements. Null uses app default OFF.';
COMMENT ON COLUMN public.tenant_settings.show_header_affiliations IS
  'When true, public header shows Affiliations. Null uses app default OFF.';
COMMENT ON COLUMN public.tenant_settings.show_header_projects IS
  'When true, public header shows Projects. Null uses app default OFF.';

UPDATE public.tenant_settings
   SET show_header_achievements = show_profile_achievements_section
 WHERE show_header_achievements IS NULL;

UPDATE public.tenant_settings
   SET show_header_affiliations = show_profile_affiliations_section
 WHERE show_header_affiliations IS NULL;

UPDATE public.tenant_settings
   SET show_header_projects = show_profile_projects_section
 WHERE show_header_projects IS NULL;
