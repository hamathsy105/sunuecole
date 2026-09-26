CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique schools" ON public.schools FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  monthly_fee INTEGER NOT NULL DEFAULT 25000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique classes" ON public.classes FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT NOT NULL DEFAULT 'M',
  guardian_name TEXT,
  guardian_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique students" ON public.students FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
GRANT SELECT ON public.attendance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique attendance" ON public.attendance FOR SELECT TO anon, authenticated USING (true);

-- Données de test
INSERT INTO public.schools (name, city, phone) VALUES ('École Sunu Lumière', 'Dakar', '+221 77 555 01 01');

INSERT INTO public.classes (school_id, name, level, monthly_fee)
SELECT s.id, c.name, c.level, c.fee FROM public.schools s,
(VALUES ('CP A','Primaire',20000),('CE2 A','Primaire',22000),('CM2 A','Primaire',25000),('6e A','Collège',30000)) AS c(name,level,fee);

INSERT INTO public.students (class_id, first_name, last_name, birth_date, gender, guardian_name, guardian_phone)
SELECT c.id, t.fn, t.ln, t.bd::date, t.g, t.gn, t.gp FROM public.classes c
JOIN (VALUES
 ('CP A','Awa','Diop','2018-03-12','F','Moussa Diop','+221 77 100 20 01'),
 ('CP A','Mamadou','Ndiaye','2018-06-25','M','Fatou Ndiaye','+221 77 100 20 02'),
 ('CP A','Aïcha','Fall','2018-01-08','F','Ousmane Fall','+221 77 100 20 03'),
 ('CP A','Ibrahima','Sow','2018-09-17','M','Aminata Sow','+221 77 100 20 04'),
 ('CE2 A','Khadija','Ba','2016-04-30','F','Alioune Ba','+221 77 100 20 05'),
 ('CE2 A','Cheikh','Gueye','2016-11-02','M','Marième Gueye','+221 77 100 20 06'),
 ('CE2 A','Fatou','Sarr','2016-02-14','F','Modou Sarr','+221 77 100 20 07'),
 ('CE2 A','Omar','Sy','2016-07-21','M','Ndèye Sy','+221 77 100 20 08'),
 ('CM2 A','Mariama','Cissé','2014-05-09','F','Sekou Cissé','+221 77 100 20 09'),
 ('CM2 A','Abdoulaye','Diallo','2014-10-27','M','Hawa Diallo','+221 77 100 20 10'),
 ('CM2 A','Sokhna','Mbaye','2014-12-03','F','Serigne Mbaye','+221 77 100 20 11'),
 ('6e A','Youssou','Touré','2012-08-15','M','Bineta Touré','+221 77 100 20 12'),
 ('6e A','Aminata','Kane','2012-03-29','F','Demba Kane','+221 77 100 20 13'),
 ('6e A','Saliou','Thiam','2012-06-11','M','Rokhaya Thiam','+221 77 100 20 14'),
 ('6e A','Ndeye','Faye','2012-01-19','F','Pape Faye','+221 77 100 20 15')
) AS t(cls,fn,ln,bd,g,gn,gp) ON c.name = t.cls;

-- Paiements du mois en cours : 10 payés, 5 en attente
INSERT INTO public.payments (student_id, amount, month, status, paid_at)
SELECT s.id, c.monthly_fee, to_char(now(), 'YYYY-MM'), 'paye', now() - (random()*20 || ' days')::interval
FROM public.students s JOIN public.classes c ON c.id = s.class_id
ORDER BY s.created_at LIMIT 10;

INSERT INTO public.payments (student_id, amount, month, status)
SELECT s.id, c.monthly_fee, to_char(now(), 'YYYY-MM'), 'en_attente'
FROM public.students s JOIN public.classes c ON c.id = s.class_id
WHERE s.id NOT IN (SELECT student_id FROM public.payments);

-- Présences du jour : 13 présents, 2 absents
INSERT INTO public.attendance (student_id, date, status)
SELECT s.id, CURRENT_DATE, CASE WHEN s.last_name IN ('Sy','Thiam') THEN 'absent' ELSE 'present' END
FROM public.students s;