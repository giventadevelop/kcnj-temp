-- Personal profile — header menu: Services (independent of homepage service cards)
-- Apply via Liquibase in event-site-manager-service; canonical DDL in Event_Site_Manager_Latest_Schema.sql

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS show_header_services boolean;

COMMENT ON COLUMN public.tenant_settings.show_header_services IS
  'When true, public header shows Services (professional services catalog). Null uses app default OFF.';

UPDATE public.tenant_settings
   SET show_header_services = show_profile_services_section
 WHERE show_header_services IS NULL;
