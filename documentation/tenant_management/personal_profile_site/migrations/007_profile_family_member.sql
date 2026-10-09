-- Personal profile — family catalog + homepage / header flags
-- Apply via Liquibase in event-site-manager-service; canonical DDL in Event_Site_Manager_Latest_Schema.sql

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS show_profile_family_section boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS show_header_family boolean;

COMMENT ON COLUMN public.tenant_settings.show_profile_family_section IS
  'When true, homepage shows the family catalog (spouse, children, parents, siblings).';
COMMENT ON COLUMN public.tenant_settings.show_header_family IS
  'When true, public header shows Family. Null uses app default OFF.';

UPDATE public.tenant_settings
   SET show_header_family = show_profile_family_section
 WHERE show_header_family IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.profile_family_member_id_seq
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  START WITH 1
  CACHE 1;

CREATE TABLE IF NOT EXISTS public.profile_family_member (
  id bigint DEFAULT nextval('public.profile_family_member_id_seq'::regclass) NOT NULL,
  tenant_id character varying(255) NOT NULL,
  display_name character varying(255) NOT NULL,
  relationship character varying(32) NOT NULL,
  role_title character varying(255),
  description character varying(2000),
  photo_url character varying(1024),
  url character varying(500),
  display_order integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT profile_family_member_pkey PRIMARY KEY (id),
  CONSTRAINT chk_profile_family_member__relationship CHECK (
    relationship IN ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER')
  ),
  CONSTRAINT fk_profile_family_member__tenant_id FOREIGN KEY (tenant_id)
    REFERENCES public.tenant_organization(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_family_member_tenant
  ON public.profile_family_member (tenant_id);

COMMENT ON TABLE public.profile_family_member IS
  'Family members shown on a PERSONAL_PROFILE / HYBRID site (spouse, children, parents, siblings).';
