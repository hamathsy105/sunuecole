ALTER TABLE public.schools
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN trial_start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN trial_end_date timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','expired')),
  ADD COLUMN payment_proof_url text,
  ADD COLUMN payment_proof_submitted_at timestamptz;

GRANT SELECT, INSERT ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

CREATE OR REPLACE FUNCTION public.schools_force_trial()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.trial_start_date := now();
  NEW.trial_end_date := now() + interval '15 days';
  NEW.subscription_status := 'trial';
  NEW.payment_proof_url := NULL;
  NEW.payment_proof_submitted_at := NULL;
  RETURN NEW;
END; $$;
CREATE TRIGGER schools_force_trial BEFORE INSERT ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.schools_force_trial();

CREATE POLICY "Owners create their school" ON public.schools
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_payment_proof(_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  UPDATE public.schools SET payment_proof_url = _url, payment_proof_submitted_at = now()
  WHERE owner_id = auth.uid();
END; $$;
REVOKE EXECUTE ON FUNCTION public.submit_payment_proof(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text) TO authenticated;

INSERT INTO storage.objects (bucket_id, name) SELECT 'x','x' WHERE false;
CREATE POLICY "Owners upload payment proofs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners read payment proofs" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);