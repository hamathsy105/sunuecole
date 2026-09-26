import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — SunuÉcole" },
      { name: "description", content: "Inscrivez votre école sur SunuÉcole : 15 jours d'essai gratuit." },
      { property: "og:title", content: "Connexion — SunuÉcole" },
      { property: "og:description", content: "Inscrivez votre école : 15 jours d'essai gratuit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [f, setF] = useState({ email: "", password: "", school: "", city: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        if (!f.school.trim() || !f.city.trim()) throw new Error("Nom et ville de l'école requis");
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { school_name: f.school.trim().slice(0, 120), school_city: f.city.trim().slice(0, 80) },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg("Vérifiez votre e-mail pour confirmer votre compte.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      }
      nav({ to: "/dashboard" });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <div className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-card p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <GraduationCap className="h-8 w-8" />
          <span className="text-2xl font-bold">SunuÉcole</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "signup" ? "Inscrire mon école — 15 jours gratuits" : "Se connecter"}
        </h1>
        {mode === "signup" && (
          <>
            <input className={input} placeholder="Nom de l'école" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} />
            <input className={input} placeholder="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </>
        )}
        <input className={input} type="email" required placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} type="password" required minLength={6} placeholder="Mot de passe" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <Button disabled={busy} className="w-full">
          {busy ? "Patientez…" : mode === "signup" ? "Commencer l'essai gratuit" : "Connexion"}
        </Button>
        <Button variant="link" type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="w-full">
          {mode === "signup" ? "Déjà inscrit ? Se connecter" : "Nouvelle école ? S'inscrire"}
        </Button>
      </form>
      </div>
      <AppFooter />
    </div>
  );
}
