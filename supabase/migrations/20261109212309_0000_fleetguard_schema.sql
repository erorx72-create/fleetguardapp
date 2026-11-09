/*
# FleetGuard Base Schema

## Overview
Core schema for FleetGuard DOT compliance tracking app.
Companies own drivers and vehicles; documents track compliance expiration.

## New Tables
- `profiles` — user profile (id linked to auth.users, full_name, email)
- `companies` — trucking companies (owner_id, name, dot_number)
- `drivers` — drivers per company (full_name, phone, email, hire_date, magic_token)
- `vehicles` — trucks/trailers per company (kind, unit_number, vin, plate)
- `documents` — compliance documents per driver/vehicle (doc_type, expires_on, file_path)
- `reminders` — log of sent compliance reminders

## New Functions
- `owns_company(uuid)` — returns true if caller owns the given company
- `create_company(text, text, boolean)` — creates a company, optionally seeds sample fleet
- `_seed_sample_fleet(uuid)` — internal seeder for demo data
- `handle_new_user()` — trigger: creates profile + first company with sample fleet on signup

## Security
- RLS on every table, scoped to company ownership via owns_company()
- Grants to authenticated role only (app requires sign-in)
- service_role gets ALL on every table for server-side operations
*/

-- Document types
CREATE TYPE public.doc_type AS ENUM ('cdl','medical_card','mvr','drug_test','annual_inspection','registration','insurance');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  dot_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX companies_owner_idx ON public.companies(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads companies" ON public.companies FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner inserts companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates companies" ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner deletes companies" ON public.companies FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.owns_company(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = _company AND owner_id = auth.uid())
$$;

-- Drivers
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  hire_date date,
  magic_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drivers_company_idx ON public.drivers(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner manages drivers" ON public.drivers FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

-- Vehicles (trucks & trailers)
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'truck' CHECK (kind IN ('truck','trailer')),
  unit_number text NOT NULL,
  vin text,
  plate text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_company_idx ON public.vehicles(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner manages vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type public.doc_type NOT NULL,
  expires_on date,
  file_path text,
  file_name text,
  uploaded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((driver_id IS NULL) <> (vehicle_id IS NULL)),
  UNIQUE (driver_id, doc_type),
  UNIQUE (vehicle_id, doc_type)
);
CREATE INDEX documents_company_idx ON public.documents(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner manages documents" ON public.documents FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

-- Reminders log
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms_email',
  sent_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reminders_company_idx ON public.reminders(company_id);
GRANT SELECT, INSERT, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner manages reminders" ON public.reminders FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

-- Keep documents.company_id consistent with the parent driver/vehicle
CREATE OR REPLACE FUNCTION public.documents_set_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.drivers WHERE id = NEW.driver_id;
  ELSIF NEW.vehicle_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER documents_set_company BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_set_company();

-- Auto-create checklist rows
CREATE OR REPLACE FUNCTION public.driver_create_checklist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.documents (company_id, driver_id, doc_type)
  SELECT NEW.company_id, NEW.id, t::public.doc_type
  FROM unnest(ARRAY['cdl','medical_card','mvr','drug_test']) AS t;
  RETURN NEW;
END $$;
CREATE TRIGGER driver_create_checklist AFTER INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.driver_create_checklist();

CREATE OR REPLACE FUNCTION public.vehicle_create_checklist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.documents (company_id, vehicle_id, doc_type)
  SELECT NEW.company_id, NEW.id, t::public.doc_type
  FROM unnest(ARRAY['annual_inspection','registration','insurance']) AS t;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_create_checklist AFTER INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.vehicle_create_checklist();

-- Internal sample-fleet seeder (not callable by clients)
CREATE OR REPLACE FUNCTION public._seed_sample_fleet(_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d1 uuid; d2 uuid; d3 uuid; v1 uuid; v2 uuid;
BEGIN
  INSERT INTO public.drivers (company_id, full_name, phone, email, hire_date)
    VALUES (_company, 'Marcus Johnson', '(214) 555-0182', 'marcus.johnson@example.com', DATE '2021-03-15') RETURNING id INTO d1;
  INSERT INTO public.drivers (company_id, full_name, phone, email, hire_date)
    VALUES (_company, 'Sarah Mitchell', '(602) 555-0147', 'sarah.mitchell@example.com', DATE '2022-08-01') RETURNING id INTO d2;
  INSERT INTO public.drivers (company_id, full_name, phone, email, hire_date)
    VALUES (_company, 'David Rodriguez', '(305) 555-0199', 'david.rodriguez@example.com', DATE '2023-01-10') RETURNING id INTO d3;

  UPDATE public.documents SET expires_on = current_date + CASE doc_type
      WHEN 'cdl' THEN 540 WHEN 'medical_card' THEN 300 WHEN 'mvr' THEN 210 ELSE 180 END
    WHERE driver_id = d1;
  UPDATE public.documents SET expires_on = current_date + CASE doc_type
      WHEN 'cdl' THEN 820 WHEN 'medical_card' THEN 12 WHEN 'mvr' THEN 160 ELSE 95 END
    WHERE driver_id = d2;
  UPDATE public.documents SET expires_on = current_date + CASE doc_type
      WHEN 'cdl' THEN -5 WHEN 'medical_card' THEN 240 WHEN 'mvr' THEN 24 ELSE 130 END
    WHERE driver_id = d3;

  INSERT INTO public.vehicles (company_id, kind, unit_number, vin, plate)
    VALUES (_company, 'truck', '101', '1FUJGLDR5CLBP8834', 'TX 8KL-2291') RETURNING id INTO v1;
  INSERT INTO public.vehicles (company_id, kind, unit_number, vin, plate)
    VALUES (_company, 'truck', '204', '3AKJHHDR7LSLA4421', 'AZ 9PD-1180') RETURNING id INTO v2;

  UPDATE public.documents SET expires_on = current_date + CASE doc_type
      WHEN 'annual_inspection' THEN 250 WHEN 'registration' THEN 190 ELSE 320 END
    WHERE vehicle_id = v1;
  UPDATE public.documents SET expires_on = current_date + CASE doc_type
      WHEN 'annual_inspection' THEN 21 WHEN 'registration' THEN 140 ELSE 75 END
    WHERE vehicle_id = v2;
END $$;
REVOKE ALL ON FUNCTION public._seed_sample_fleet(uuid) FROM PUBLIC, anon, authenticated;

-- Create a company (optionally with sample fleet) for the signed-in user
CREATE OR REPLACE FUNCTION public.create_company(_name text, _dot_number text DEFAULT NULL, _with_sample boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(trim(_name), '') = '' THEN RAISE EXCEPTION 'Company name is required'; END IF;
  INSERT INTO public.companies (owner_id, name, dot_number)
    VALUES (auth.uid(), trim(_name), nullif(trim(coalesce(_dot_number, '')), '')) RETURNING id INTO new_id;
  IF _with_sample THEN PERFORM public._seed_sample_fleet(new_id); END IF;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.create_company(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company(text, text, boolean) TO authenticated;

-- New user: profile + first company with sample fleet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.companies (owner_id, name, dot_number)
    VALUES (NEW.id, coalesce(nullif(trim(NEW.raw_user_meta_data->>'company_name'), ''), 'Lone Star Freight Co.'), 'USDOT 3482915')
    RETURNING id INTO cid;
  PERFORM public._seed_sample_fleet(cid);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.documents_set_company() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.driver_create_checklist() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vehicle_create_checklist() FROM PUBLIC, anon, authenticated;
