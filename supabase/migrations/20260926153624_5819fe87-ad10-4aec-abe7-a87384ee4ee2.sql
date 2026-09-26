CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.grant_admin_by_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'hamathsy1@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email() FROM public, anon, authenticated;
CREATE TRIGGER on_auth_user_grant_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_by_email();
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'hamathsy1@gmail.com' ON CONFLICT DO NOTHING;

ALTER TABLE public.schools ADD COLUMN subscription_end_date timestamptz;

-- Remove public reads
DROP POLICY IF EXISTS "Lecture publique schools" ON public.schools;
DROP POLICY IF EXISTS "Lecture publique classes" ON public.classes;
DROP POLICY IF EXISTS "Lecture publique students" ON public.students;
DROP POLICY IF EXISTS "Lecture publique payments" ON public.payments;
DROP POLICY IF EXISTS "Lecture publique attendance" ON public.attendance;
REVOKE ALL ON public.schools, public.classes, public.students, public.payments, public.attendance FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes, public.students, public.payments, public.attendance TO authenticated;
GRANT ALL ON public.classes, public.students, public.payments, public.attendance TO service_role;

CREATE POLICY "Owner or admin reads school" ON public.schools FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates schools" ON public.schools FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School owner manages classes" ON public.classes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid()));

CREATE POLICY "School owner manages students" ON public.students FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c JOIN public.schools s ON s.id = c.school_id WHERE c.id = class_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c JOIN public.schools s ON s.id = c.school_id WHERE c.id = class_id AND s.owner_id = auth.uid()));

CREATE POLICY "School owner manages payments" ON public.payments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.students st JOIN public.classes c ON c.id = st.class_id JOIN public.schools s ON s.id = c.school_id WHERE st.id = student_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.students st JOIN public.classes c ON c.id = st.class_id JOIN public.schools s ON s.id = c.school_id WHERE st.id = student_id AND s.owner_id = auth.uid()));

CREATE POLICY "School owner manages attendance" ON public.attendance FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.students st JOIN public.classes c ON c.id = st.class_id JOIN public.schools s ON s.id = c.school_id WHERE st.id = student_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.students st JOIN public.classes c ON c.id = st.class_id JOIN public.schools s ON s.id = c.school_id WHERE st.id = student_id AND s.owner_id = auth.uid()));

CREATE POLICY "Admin reads payment proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));