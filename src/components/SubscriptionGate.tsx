import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitPaymentProof } from "@/lib/subscription.functions";
import { Lock, Upload, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

async function loadMySchool() {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const sel = "id, name, trial_end_date, subscription_end_date, subscription_status, payment_proof_url";
  const { data } = await supabase.from("schools").select(sel).eq("owner_id", user.id).maybeSingle();
  if (data) return data;
  const meta = user.user_metadata ?? {};
  const { data: created, error } = await supabase
    .from("schools")
    .insert({ owner_id: user.id, name: meta["school_name"] || "Mon école", city: meta["school_city"] || "Dakar" })
    .select(sel)
    .single();
  if (error) throw error;
  return created;
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { data: school, isLoading, error, refetch } = useQuery({ queryKey: ["my-school"], queryFn: loadMySchool, retry: 1 });
  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement…</div>;
  if (error) {
    console.error("[SunuÉcole] Erreur chargement école:", error);
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="max-w-md rounded-2xl bg-card p-6 shadow text-center space-y-3">
          <p className="font-semibold text-destructive">Erreur</p>
          <p className="text-sm text-foreground">{error instanceof Error ? error.message : (error as { message?: string })?.message ?? String(error)}</p>
          <button onClick={() => refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Réessayer</button>
          <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/auth"))} className="block w-full text-xs underline text-muted-foreground">Se déconnecter</button>
        </div>
      </div>
    );
  }
  if (!school) return <>{children}</>;
  const now = new Date();
  const expired =
    school.subscription_status === "expired" ||
    (school.subscription_status === "active"
      ? !!school.subscription_end_date && now > new Date(school.subscription_end_date)
      : now > new Date(school.trial_end_date));
  if (expired) return <ExpiredScreen hasProof={!!school.payment_proof_url} />;
  return <>{children}</>;
}

function ExpiredScreen({ hasProof }: { hasProof: boolean }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitPaymentProof);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(hasProof);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!file) return setErr("Ajoutez la capture Wave.");
    if (!file.type.startsWith("image/")) return setErr("Le fichier doit être une image.");
    setBusy(true);
    setErr(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Session expirée");
      const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (error) throw error;
      await submit({ data: { path } });
      setSent(true);
      qc.invalidateQueries({ queryKey: ["my-school"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-card p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-primary">Abonnement Expiré</h1>
        <p className="text-muted-foreground">Votre essai 15 jours est terminé.</p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/abonnement">Voir mon abonnement et payer par Wave</Link>
        </Button>
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-1">
          <p className="text-sm font-medium text-foreground">Pour continuer :</p>
          <p className="text-2xl font-bold text-primary">Payer 10.000 FCFA</p>
          <p className="text-lg font-semibold text-foreground">Wave 77 912 44 34</p>
          <p className="text-sm text-muted-foreground">Hamath Sy</p>
        </div>
        {sent ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-4 text-primary font-medium">
            <CheckCircle2 className="h-5 w-5" /> Preuve envoyée ! Votre accès sera réactivé après vérification.
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 p-5 text-sm text-primary hover:bg-primary/5">
              <Upload className="h-6 w-6" />
              {file ? file.name : "Ajouter la capture du paiement Wave"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button onClick={send} disabled={busy} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? "Envoi…" : "J'ai payé, envoyer preuve"}
            </button>
          </div>
        )}
        <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/auth"))} className="text-xs text-muted-foreground underline">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
