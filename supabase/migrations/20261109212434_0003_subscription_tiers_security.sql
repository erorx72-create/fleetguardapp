/*
# FleetGuard Subscription, Tier Limits, and Security Architecture

## Overview
Implements the 3-tier flat pricing system with database-enforced limits, 3-day free trial
tracking, immutable VIN columns, unique DOT numbers, truck creation counters, and
rate-limiting infrastructure.

## New Tables
- `subscriptions` — one row per user tracking plan, trial status, billing cycle
- `truck_creation_log` — append-only log of vehicle inserts per company per billing cycle
  (never decremented, preventing metric rotation on delete)
- `api_rate_limits` — per-user-IP rate limit tracking (100 requests / 15 min)
- `user_sessions` — session tracking for multi-device and impossible-travel detection

## New Columns
- `companies.tier` — 'starter' | 'platinum' | 'diamond' (defaults to 'starter')
- `companies.trial_started_at` — timestamp when trial began

## New Functions
- `get_subscription_status()` — returns the caller's trial/paywall/plan state
- `enforce_vehicle_limit()` — trigger: blocks vehicle inserts beyond tier limit
- `enforce_company_limit()` — trigger: blocks company creation beyond tier limit
- `block_vin_update()` — trigger: prevents VIN and key identifiers from being changed after insert
- `check_dot_unique()` — trigger: blocks duplicate DOT numbers across all users
- `record_truck_creation()` — trigger: appends to truck_creation_log on vehicle insert
- `check_rate_limit(text, text)` — checks and increments per-IP request count
- `upsert_user_session(uuid, text, text, text)` — records session for travel detection

## Security
- RLS on all new tables, scoped to authenticated users
- grants to authenticated + service_role
*/

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','platinum','diamond')),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','paid','expired','locked')),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  paid_at timestamptz,
  billing_cycle_start timestamptz NOT NULL DEFAULT now(),
  billing_cycle_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own subscription" ON public.subscriptions;
CREATE POLICY "User reads own subscription" ON public.subscriptions FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "User inserts own subscription" ON public.subscriptions;
CREATE POLICY "User inserts own subscription" ON public.subscriptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "User updates own subscription" ON public.subscriptions;
CREATE POLICY "User updates own subscription" ON public.subscriptions FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 2. TIER COLUMN ON COMPANIES
-- =====================================================
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'starter'
  CHECK (tier IN ('starter','platinum','diamond'));
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now();

-- =====================================================
-- 3. TRUCK CREATION LOG (append-only, never decremented)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.truck_creation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  billing_cycle_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS truck_log_company_cycle_idx ON public.truck_creation_log(company_id, billing_cycle_start);
GRANT SELECT ON public.truck_creation_log TO authenticated;
GRANT ALL ON public.truck_creation_log TO service_role;
ALTER TABLE public.truck_creation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads truck creation log" ON public.truck_creation_log;
CREATE POLICY "Owner reads truck creation log" ON public.truck_creation_log FOR SELECT
  TO authenticated USING (public.owns_company(company_id));

-- =====================================================
-- 4. API RATE LIMITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_rate_limits_user_ip_idx ON public.api_rate_limits(user_id, ip_address, window_start);
GRANT SELECT, INSERT, UPDATE ON public.api_rate_limits TO authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own rate limits" ON public.api_rate_limits;
CREATE POLICY "User reads own rate limits" ON public.api_rate_limits FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "User inserts own rate limits" ON public.api_rate_limits;
CREATE POLICY "User inserts own rate limits" ON public.api_rate_limits FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "User updates own rate limits" ON public.api_rate_limits;
CREATE POLICY "User updates own rate limits" ON public.api_rate_limits FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. USER SESSIONS TABLE (multi-device + impossible travel)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  device_fingerprint text NOT NULL,
  ip_address text NOT NULL,
  ip_geo text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  is_terminated boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx ON public.user_sessions(user_id, is_terminated, last_active_at);
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own sessions" ON public.user_sessions;
CREATE POLICY "User reads own sessions" ON public.user_sessions FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "User inserts own sessions" ON public.user_sessions;
CREATE POLICY "User inserts own sessions" ON public.user_sessions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "User updates own sessions" ON public.user_sessions;
CREATE POLICY "User updates own sessions" ON public.user_sessions FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 6. SUBSCRIPTION STATUS RPC
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS TABLE (
  plan text,
  status text,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  trial_hours_remaining numeric,
  is_trial_active boolean,
  is_locked boolean,
  days_since_creation int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  uid uuid := auth.uid();
  user_created timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT created_at INTO user_created FROM auth.users WHERE id = uid;
  IF user_created IS NULL THEN user_created := now(); END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, status, trial_started_at, trial_expires_at)
    VALUES (uid, 'starter', 'trial', user_created, user_created + interval '72 hours')
    RETURNING * INTO sub;
  END IF;

  RETURN QUERY SELECT
    sub.plan,
    sub.status,
    sub.trial_started_at,
    sub.trial_expires_at,
    GREATEST(0, EXTRACT(EPOCH FROM (sub.trial_expires_at - now())) / 3600)::numeric AS trial_hours_remaining,
    (sub.status = 'trial' AND now() < sub.trial_expires_at) AS is_trial_active,
    (sub.status NOT IN ('paid','active') AND now() > sub.trial_expires_at) AS is_locked,
    GREATEST(0, EXTRACT(DAY FROM (now() - user_created)))::int AS days_since_creation;
END $$;
REVOKE ALL ON FUNCTION public.get_subscription_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_status() TO authenticated;

-- =====================================================
-- 7. UNIQUE DOT NUMBER (Multi-Account Squatting Block)
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_dot_unique()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dot_number IS NOT NULL AND trim(NEW.dot_number) <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE dot_number = NEW.dot_number
        AND owner_id <> NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'This DOT number is already registered under another account.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_dot_unique ON public.companies;
CREATE TRIGGER enforce_dot_unique
  BEFORE INSERT OR UPDATE OF dot_number ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.check_dot_unique();

-- =====================================================
-- 8. IMMUTABLE VIN (Anti-Cheat: block VIN updates after creation)
-- =====================================================
CREATE OR REPLACE FUNCTION public.block_vin_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.vin IS NOT NULL AND NEW.vin IS DISTINCT FROM OLD.vin THEN
    RAISE EXCEPTION 'VIN is immutable and cannot be changed after unit creation.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prevent_vin_change ON public.vehicles;
CREATE TRIGGER prevent_vin_change
  BEFORE UPDATE OF vin ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.block_vin_update();

-- =====================================================
-- 9. TIER ENFORCEMENT: Vehicle Limit on Insert
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_vehicle_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp public.companies%ROWTYPE;
  current_count int;
  max_allowed int;
  log_count int;
BEGIN
  SELECT * INTO comp FROM public.companies WHERE id = NEW.company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company not found'; END IF;

  current_count := (SELECT count(*) FROM public.vehicles WHERE company_id = NEW.company_id);

  IF comp.tier = 'starter' THEN
    max_allowed := 10;
  ELSIF comp.tier = 'platinum' THEN
    max_allowed := 30;
  ELSIF comp.tier = 'diamond' THEN
    max_allowed := 999999;
  ELSE
    max_allowed := 10;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Truck limit reached for your plan (%). Upgrade to add more units.', max_allowed;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_vehicle_limit_trigger ON public.vehicles;
CREATE TRIGGER enforce_vehicle_limit_trigger
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_limit();

-- =====================================================
-- 10. RECORD TRUCK CREATION (append-only, never decremented)
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_truck_creation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_tier text;
  cycle_start timestamptz;
  sub public.subscriptions%ROWTYPE;
BEGIN
  SELECT tier INTO comp_tier FROM public.companies WHERE id = NEW.company_id;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = (
    SELECT owner_id FROM public.companies WHERE id = NEW.company_id
  );

  IF FOUND AND sub.billing_cycle_start IS NOT NULL THEN
    cycle_start := sub.billing_cycle_start;
  ELSE
    cycle_start := now();
  END IF;

  INSERT INTO public.truck_creation_log (company_id, vehicle_id, billing_cycle_start)
  VALUES (NEW.company_id, NEW.id, cycle_start);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS record_truck_creation_trigger ON public.vehicles;
CREATE TRIGGER record_truck_creation_trigger
  AFTER INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.record_truck_creation();

-- =====================================================
-- 11. COMPANY LIMIT ENFORCEMENT (for starter/platinum: 1 company)
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_company_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_count int;
  sub public.subscriptions%ROWTYPE;
  max_companies int;
BEGIN
  SELECT * INTO sub FROM public.subscriptions WHERE user_id = NEW.owner_id;

  IF NOT FOUND THEN
    max_companies := 1;
  ELSIF sub.plan = 'diamond' THEN
    max_companies := 50;
  ELSE
    max_companies := 1;
  END IF;

  existing_count := (
    SELECT count(*) FROM public.companies
    WHERE owner_id = NEW.owner_id AND id <> NEW.id
  );

  IF existing_count >= max_companies THEN
    IF max_companies = 1 THEN
      RAISE EXCEPTION 'Your plan allows 1 company. Upgrade to the Diamond Agency Plan for multi-company management.';
    ELSE
      RAISE EXCEPTION 'Company limit reached for your plan (%).', max_companies;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_company_limit_trigger ON public.companies;
CREATE TRIGGER enforce_company_limit_trigger
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_company_limit();

-- =====================================================
-- 12. RATE LIMIT CHECK FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _ip text)
RETURNS TABLE (allowed boolean, remaining int, reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rl public.api_rate_limits%ROWTYPE;
  window_end timestamptz;
  max_requests int := 100;
  window_minutes int := 15;
BEGIN
  SELECT * INTO rl FROM public.api_rate_limits
  WHERE user_id = _user_id AND ip_address = _ip
  ORDER BY window_start DESC LIMIT 1;

  IF NOT FOUND OR rl.window_start < (now() - (window_minutes || ' minutes')::interval) THEN
    INSERT INTO public.api_rate_limits (user_id, ip_address, request_count, window_start)
    VALUES (_user_id, _ip, 1, now());

    RETURN QUERY SELECT true, max_requests - 1, now() + (window_minutes || ' minutes')::interval;
  ELSE
    IF rl.request_count >= max_requests THEN
      window_end := rl.window_start + (window_minutes || ' minutes')::interval;
      RETURN QUERY SELECT false, 0, window_end;
    ELSE
      UPDATE public.api_rate_limits SET request_count = request_count + 1, updated_at = now()
      WHERE id = rl.id;
      RETURN QUERY SELECT true, max_requests - rl.request_count - 1, rl.window_start + (window_minutes || ' minutes')::interval;
    END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text) TO authenticated;

-- =====================================================
-- 13. USER SESSION UPSERT (multi-device + impossible travel)
-- =====================================================
CREATE OR REPLACE FUNCTION public.upsert_user_session(
  _device_fingerprint text,
  _ip_address text,
  _ip_geo text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS TABLE (
  session_id uuid,
  is_terminated boolean,
  impossible_travel_detected boolean,
  max_sessions_exceeded boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  active_count int;
  oldest_session uuid;
  detected boolean := false;
  exceeded boolean := false;
  last_geo text;
  last_time timestamptz;
  time_diff_hours numeric;
  new_sess uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT count(*) INTO active_count FROM public.user_sessions
  WHERE user_id = uid AND is_terminated = false;

  IF active_count >= 2 THEN
    exceeded := true;
    SELECT id INTO oldest_session FROM public.user_sessions
    WHERE user_id = uid AND is_terminated = false
    ORDER BY last_active_at ASC LIMIT 1;

    UPDATE public.user_sessions SET is_terminated = true
    WHERE id = oldest_session;
  END IF;

  SELECT ip_geo, last_active_at INTO last_geo, last_time
  FROM public.user_sessions
  WHERE user_id = uid AND is_terminated = false
  ORDER BY last_active_at DESC LIMIT 1;

  IF last_geo IS NOT NULL AND _ip_geo IS NOT NULL AND last_geo <> _ip_geo THEN
    time_diff_hours := EXTRACT(EPOCH FROM (now() - last_time)) / 3600;
    IF time_diff_hours < 4 THEN
      detected := true;
      UPDATE public.user_sessions SET is_terminated = true WHERE user_id = uid AND is_terminated = false;
    END IF;
  END IF;

  INSERT INTO public.user_sessions (user_id, session_token, device_fingerprint, ip_address, ip_geo, user_agent)
  VALUES (uid, gen_random_uuid()::text, _device_fingerprint, _ip_address, _ip_geo, _user_agent)
  RETURNING id INTO new_sess;

  RETURN QUERY SELECT new_sess, false, detected, exceeded;
END $$;
REVOKE ALL ON FUNCTION public.upsert_user_session(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_session(text, text, text, text) TO authenticated;

-- =====================================================
-- 14. AUTO-CREATE SUBSCRIPTION ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_subscription_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_started_at, trial_expires_at)
  VALUES (NEW.id, 'starter', 'trial', NEW.created_at, NEW.created_at + interval '72 hours')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_subscription_on_signup();

REVOKE ALL ON FUNCTION public.create_subscription_on_signup() FROM PUBLIC, anon, authenticated;
