-- Personal profile — professional services catalog
-- Apply via Liquibase in event-site-manager-service; canonical DDL in Event_Site_Manager_Latest_Schema.sql
-- Use this changelog on existing databases that already have public_profile / profile_project.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS show_profile_services_section boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.tenant_settings.show_profile_services_section IS
  'When true, homepage shows the professional services catalog (tax, financial consulting, etc.).';

CREATE SEQUENCE IF NOT EXISTS public.profile_service_id_seq
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  START WITH 1
  CACHE 1;

CREATE TABLE IF NOT EXISTS public.profile_service (
  id bigint DEFAULT nextval('public.profile_service_id_seq'::regclass) NOT NULL,
  tenant_id character varying(255) NOT NULL,
  title character varying(255) NOT NULL,
  slug character varying(150),
  summary character varying(2000),
  description text,
  category character varying(32) NOT NULL DEFAULT 'CONSULTING',
  cover_image_url character varying(1024),
  price_from numeric(12,2),
  price_unit character varying(32),
  currency character varying(8) DEFAULT 'USD',
  cta_label character varying(100),
  cta_url character varying(1024),
  display_order integer,
  is_featured boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT profile_service_pkey PRIMARY KEY (id),
  CONSTRAINT chk_profile_service__category CHECK (
    category IN ('TAX', 'FINANCIAL', 'LEGAL', 'CONSULTING', 'COACHING', 'TECHNOLOGY', 'HEALTHCARE', 'EDUCATION', 'OTHER')
  ),
  CONSTRAINT chk_profile_service__price_unit CHECK (
    price_unit IS NULL OR price_unit IN ('HOUR', 'SESSION', 'PROJECT', 'MONTH', 'YEAR', 'CUSTOM')
  ),
  CONSTRAINT fk_profile_service__tenant_id FOREIGN KEY (tenant_id)
    REFERENCES public.tenant_organization(tenant_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_service__tenant_slug
  ON public.profile_service (tenant_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profile_service_tenant ON public.profile_service (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_service_tenant_active ON public.profile_service (tenant_id, is_active);

COMMENT ON TABLE public.profile_service IS
  'Professional services offered by a PERSONAL_PROFILE / HYBRID individual (e.g. tax consulting, financial consulting).';
COMMENT ON COLUMN public.profile_service.price_from IS
  'Optional starting price; null means inquire / contact for pricing.';
COMMENT ON COLUMN public.profile_service.cta_url IS
  'Book / inquire URL; public UI may fall back to public_profile.booking_url.';

SELECT pg_catalog.setval(
  'public.profile_service_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.profile_service), 1), 1),
  true
);
