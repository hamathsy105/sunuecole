import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppFooter } from "@/components/AppFooter";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { downloadReceiptPdf } from "@/lib/receipt";
import { CalendarDays, CheckCircle2, Download, GraduationCap, MessageCircle, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Abonnement — SunuÉcole" },
      { name: "description", content: "Gérez votre essai et votre abonnement mensuel SunuÉcole par Wave." },
      { property: "og:title", content: "Abonnement — SunuÉcole" },
      { property: "og:description", content: "Abonnement SunuÉcole à 10 000 FCFA par mois, payable par Wave." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SubscriptionPage,
});

const formatDate = (date?: string | null) => date ? new Date(date).toLocaleDateString("fr-SN", { day: "numeric", month: "long", year: "numeric" }) : "—";

function SubscriptionPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription-page"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Session expirée");
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, trial_start_date, trial_end_date, subscription_end_date, subscription_status")
        .eq("owner_id", userData.user.id)
        .single();
      if (schoolError) throw schoolError;
      const { data: receipts, error: receiptsError } = await supabase
        .from("subscription_receipts")
        .select("receipt_number, amount, paid_at, period_start, period_end")
        .eq("school_id", school.id)
        .order("paid_at", { ascending: false });
      if (receiptsError) throw receiptsError;
      return { school, receipts: receipts ?? [] };
    },
  });

  const endDate = data?.school.subscription_end_date ?? data?.school.trial_end_date;
  const daysLeft = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            <span className="text-xl font-bold">SunuÉcole</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium sm:inline">Abonnement</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {isLoading ? <p className="text-muted-foreground">Chargement…</p> : error || !data ? (
          <p className="text-destructive">{error instanceof Error ? error.message : "Impossible de charger l’abonnement."}</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section>
              <p className="font-semibold text-primary">15 jours d’essai offerts</p>
              <h1 className="mt-2 text-4xl font-bold text-foreground">10 000 F <span className="text-lg font-medium text-muted-foreground">/ mois</span></h1>
              <p className="mt-3 max-w-xl text-muted-foreground">Accès complet à la gestion des élèves, paiements et présences de votre école.</p>

              <div className="mt-7 border-y border-border py-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Fin de votre accès : {formatDate(endDate)}</p>
                    <p className="text-sm text-muted-foreground">{daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="mt-7 w-full sm:w-auto">
                <a href="wave://send?recipient=221779124434&amount=10000">
                  <Smartphone /> Payer par Wave
                </a>
              </Button>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
                <p className="text-sm text-foreground">
                  Après paiement, envoie la capture sur WhatsApp <a className="font-bold text-primary underline" href="https://wa.me/221779124434?text=Bonjour%20Sunu%C3%89cole%2C%20voici%20ma%20preuve%20de%20paiement%20Wave." target="_blank" rel="noreferrer">77 912 44 34</a>.
                </p>
              </div>
            </section>

            <aside className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="font-bold">Vos reçus</h2>
              </div>
              <div className="mt-5 space-y-3">
                {data.receipts.map((receipt) => (
                  <div key={receipt.receipt_number} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{receipt.receipt_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(receipt.paid_at)} · {new Intl.NumberFormat("fr-SN").format(receipt.amount)} FCFA</p>
                    </div>
                    <Button variant="outline" size="icon" title="Télécharger le reçu" onClick={() => downloadReceiptPdf({ ...receipt, schoolName: data.school.name })}>
                      <Download />
                    </Button>
                  </div>
                ))}
                {data.receipts.length === 0 && <p className="text-sm text-muted-foreground">Votre premier reçu apparaîtra ici après validation du paiement.</p>}
              </div>
            </aside>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}