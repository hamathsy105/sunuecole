import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppFooter } from "@/components/AppFooter";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { downloadReceiptPdf } from "@/lib/receipt";
import { ShieldCheck, ExternalLink, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — SunuÉcole" },
      { name: "description", content: "Gestion des abonnements des écoles SunuÉcole." },
      { property: "og:title", content: "Administration — SunuÉcole" },
      { property: "og:description", content: "Gestion des abonnements des écoles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-SN") : "—");

function AdminPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { isAdmin: false as const, schools: [] };
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return { isAdmin: false as const, schools: [] };
      const { data: schools, error } = await supabase
        .from("schools")
        .select("id, name, city, subscription_status, trial_end_date, subscription_end_date, payment_proof_url, payment_proof_submitted_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { isAdmin: true as const, schools: schools ?? [] };
    },
  });

  async function openProof(path: string) {
    const { data: s } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (s?.signedUrl) window.open(s.signedUrl, "_blank");
  }

  async function approve(id: string) {
    setBusy(id);
    const school = data?.schools.find((item) => item.id === id);
    try {
      const { data: receipt, error } = await supabase.rpc("approve_school_subscription", { _school_id: id });
      if (error) throw error;
      if (receipt && school) await downloadReceiptPdf({ ...receipt, schoolName: school.name });
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!data?.isAdmin)
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">Accès réservé à l'administrateur.</p>
          <Link to="/dashboard" className="text-primary underline">Retour au tableau de bord</Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-5 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6" />
        <h1 className="text-xl font-bold">Administration SunuÉcole</h1>
        <div className="ml-auto"><LogoutButton /></div>
      </header>
      <main className="p-4 md:p-8 space-y-3">
        {data.schools.length === 0 && <p className="text-muted-foreground">Aucune école.</p>}
        {data.schools.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-foreground">{s.name} <span className="text-sm text-muted-foreground">· {s.city}</span></p>
              <p className="text-sm text-muted-foreground">
                Statut : <span className="font-medium text-primary">{s.subscription_status === "active" ? "actif" : s.subscription_status === "expired" ? "expiré" : "essai"}</span> · Fin : {fmt(s.trial_end_date)}
                {s.subscription_end_date && <> · Abonné jusqu'au : {fmt(s.subscription_end_date)}</>}
              </p>
            </div>
            {s.payment_proof_url ? (
              <Button variant="link" onClick={() => s.payment_proof_url && openProof(s.payment_proof_url)} className="h-auto p-0">
                Preuve Wave ({fmt(s.payment_proof_submitted_at)}) <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Pas de preuve</span>
            )}
            <Button
              onClick={() => approve(s.id)}
              disabled={busy === s.id}
            >
              <FileDown /> {busy === s.id ? "Validation…" : "Approuver 30j"}
            </Button>
          </div>
        ))}
      </main>
      <AppFooter />
    </div>
  );
}
