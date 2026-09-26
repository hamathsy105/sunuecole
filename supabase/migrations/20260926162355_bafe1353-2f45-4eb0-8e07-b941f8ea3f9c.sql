CREATE TABLE public.subscription_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  amount integer NOT NULL DEFAULT 10000 CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'Wave' CHECK (payment_method = 'Wave'),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_receipts TO authenticated;
GRANT ALL ON public.subscription_receipts TO service_role;
ALTER TABLE public.subscription_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own subscription receipts"
ON public.subscription_receipts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.schools s
  WHERE s.id = subscription_receipts.school_id AND s.owner_id = auth.uid()
));
CREATE POLICY "Admins read all subscription receipts"
ON public.subscription_receipts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.grant_admin_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'hamathsy001@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role = 'admin'
  AND lower(u.email) = 'hamathsy1@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'hamathsy001@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.approve_school_subscription(_school_id uuid)
RETURNS public.subscription_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _school public.schools;
  _start timestamptz;
  _end timestamptz;
  _receipt public.subscription_receipts;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO _school FROM public.schools WHERE id = _school_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'École introuvable';
  END IF;

  _start := GREATEST(_school.trial_end_date, now());
  _end := _start + interval '30 days';

  UPDATE public.schools
  SET subscription_status = 'active',
      trial_end_date = _end,
      subscription_end_date = _end
  WHERE id = _school_id;

  INSERT INTO public.subscription_receipts (
    school_id, receipt_number, amount, payment_method,
    period_start, period_end, paid_at, approved_by
  ) VALUES (
    _school_id,
    'SE-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    10000,
    'Wave',
    _start,
    _end,
    now(),
    auth.uid()
  ) RETURNING * INTO _receipt;

  RETURN _receipt;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_school_subscription(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_school_subscription(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_school_subscription(uuid) TO service_role;