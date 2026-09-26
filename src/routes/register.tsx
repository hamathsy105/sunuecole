import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import schoolHero from "@/assets/senegal-school-hero.jpg";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Inscrire mon école — SunuÉcole" },
      { name: "description", content: "Inscrivez votre école sur SunuÉcole et profitez de 15 jours gratuits." },
      { property: "og:title", content: "Inscrire mon école — SunuÉcole" },
      { property: "og:description", content: "15 jours gratuits pour gérer élèves, paiements et présences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", school: "", city: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (!form.school.trim() || !form.city.trim()) throw new Error("Nom et ville de l'école requis");
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            school_name: form.school.trim().slice(0, 120),
            school_city: form.city.trim().slice(0, 80),
          },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage("Vérifiez votre e-mail pour confirmer votre compte.");
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer le compte.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary text-primary-foreground">
      <img
        src={schoolHero}
        alt="Élèves dans la cour d’une école sénégalaise"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/45" />

      <header className="relative z-10 border-b border-primary-foreground/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-8 w-8" />
            <span className="text-xl">SunuÉcole</span>
          </Link>
          <Button asChild variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 text-card-foreground shadow-xl sm:p-8">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-bold">15 jours gratuits, sans engagement</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inscrire mon école</h1>
            <p className="mt-1 text-sm text-muted-foreground">Créez votre espace SunuÉcole en quelques instants.</p>
          </div>
          <label className="block text-sm font-medium">
            Nom de l’école
            <input className={`${inputClass} mt-1`} required autoComplete="organization" value={form.school} onChange={(event) => setForm({ ...form, school: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Ville
            <input className={`${inputClass} mt-1`} required autoComplete="address-level2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            E-mail
            <input className={`${inputClass} mt-1`} type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Mot de passe
            <input className={`${inputClass} mt-1`} type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {message && <p role="status" className="rounded-md bg-muted p-3 text-sm text-foreground">{message}</p>}
          <Button type="submit" size="lg" disabled={busy} className="w-full font-bold">
            {busy ? "Création en cours…" : "Commencer gratuitement"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Déjà inscrit ? <Link to="/auth" className="font-semibold text-primary underline underline-offset-4">Se connecter</Link>
          </p>
        </form>
      </main>
    </div>
  );
}