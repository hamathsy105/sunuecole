import { createFileRoute, Link } from "@tanstack/react-router";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { AppFooter } from "@/components/AppFooter";
import { LogoutButton } from "@/components/LogoutButton";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { CollectPaymentDialog } from "@/components/CollectPaymentDialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Wallet,
  Banknote,
  UserCheck,
  GraduationCap,
  UserPlus,
  School,
  ClipboardCheck,
  Clock3,
  CalendarDays,
  ArrowRight,
  Download,
  Eye,
  MessageCircle,
  ReceiptText,
} from "lucide-react";
import { downloadStudentReceipt, studentReceiptNumber, studentReceiptWhatsAppUrl, viewStudentReceipt, type StudentReceipt } from "@/lib/student-receipt";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "SunuÉcole — Tableau de bord" },
      {
        name: "description",
        content:
          "SunuÉcole : la gestion scolaire simplifiée pour les écoles du Sénégal. Élèves, paiements et présences en un coup d'œil.",
      },
      { property: "og:title", content: "SunuÉcole — Tableau de bord" },
      {
        property: "og:description",
        content:
          "La gestion scolaire simplifiée pour les écoles du Sénégal : élèves, paiements et présences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<SubscriptionGate><Dashboard /></SubscriptionGate>),
});

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  classes: { name: string; monthly_fee: number } | null;
  payments: { id: string; status: string; amount: number; month: string; paid_at: string | null; payment_method: string | null }[];
  attendance: { status: string; date: string }[];
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-SN").format(n) + " FCFA";
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = localDay();
      const month = today.slice(0, 7);
      const { data: students, error } = await supabase
        .from("students")
        .select(
          "id, first_name, last_name, gender, guardian_name, guardian_phone, classes(name, monthly_fee), payments(id, status, amount, month, paid_at, payment_method), attendance(status, date)"
        )
        .order("last_name");
      if (error) throw error;
      const { data: school } = await supabase
        .from("schools")
        .select("name, city, phone, trial_end_date, subscription_end_date, subscription_status")
        .limit(1)
        .single();
      return { students: (students ?? []) as unknown as StudentRow[], school, month, today };
    },
  });

  const markPresent = useMutation({
    mutationFn: async (studentId: string) => {
      const today = localDay();
      const { data: existing, error: e1 } = await supabase
        .from("attendance").select("id").eq("student_id", studentId).eq("date", today).maybeSingle();
      if (e1) throw e1;
      const { error } = existing
        ? await supabase.from("attendance").update({ status: "present" }).eq("id", existing.id)
        : await supabase.from("attendance").insert({ student_id: studentId, date: today, status: "present" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: (e) => alert("Présence : " + ((e as { message?: string }).message ?? "erreur")),
  });

  const students = data?.students ?? [];
  const month = data?.month ?? "";
  const today = data?.today ?? "";
  const accessEnd = data?.school?.subscription_end_date ?? data?.school?.trial_end_date;
  const daysLeft = accessEnd
    ? Math.max(0, Math.ceil((new Date(accessEnd).getTime() - Date.now()) / 86_400_000))
    : 0;
  const subscriptionExpired = !accessEnd || new Date(accessEnd).getTime() < Date.now();
  const subscriptionActive = data?.school?.subscription_status === "active";

  const totalEleves = students.length;
  const impayes = students.filter((s) =>
    s.payments.some((p) => p.month === month && p.status === "en_attente")
  ).length;
  const recettes = students.reduce(
    (sum, s) =>
      sum +
      s.payments
        .filter((p) => p.month === month && p.status === "paye")
        .reduce((a, p) => a + p.amount, 0),
    0
  );
  const presents = students.filter((s) =>
    s.attendance.some((a) => a.date === today && a.status === "present")
  ).length;

  const receipts = students
    .flatMap((student) => student.payments
      .filter((payment) => payment.status === "paye")
      .map((payment) => {
        const paidAt = payment.paid_at ?? `${payment.month}-01T12:00:00.000Z`;
        const receipt: StudentReceipt = {
          number: studentReceiptNumber(payment.id, paidAt),
          studentName: `${student.first_name} ${student.last_name}`.trim(),
          className: student.classes?.name ?? "—",
          schoolName: data?.school?.name ?? "SunuÉcole",
          schoolCity: data?.school?.city ?? "Sénégal",
          schoolPhone: data?.school?.phone ?? "77 912 44 34",
          guardianName: student.guardian_name ?? "—",
          guardianPhone: student.guardian_phone ?? "",
          amount: payment.amount,
          date: paidAt,
          method: payment.payment_method ?? "Non précisé",
          month: payment.month,
        };
        return { id: payment.id, receipt };
      }))
    .sort((a, b) => new Date(b.receipt.date).getTime() - new Date(a.receipt.date).getTime());

  const stats = [
    { label: "Total élèves", value: String(totalEleves), icon: Users, accent: "border-l-primary", iconStyle: "bg-primary/10 text-primary" },
    { label: "Impayés du mois", value: String(impayes), icon: Wallet, accent: "border-l-destructive", iconStyle: "bg-destructive/10 text-destructive" },
    { label: "Recettes du mois", value: formatFCFA(recettes), icon: Banknote, accent: "border-l-success", iconStyle: "bg-success/10 text-success" },
    { label: "Présents aujourd'hui", value: String(presents), icon: UserCheck, accent: "border-l-warning", iconStyle: "bg-warning/20 text-warning-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight">SunuÉcole</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/abonnement" className="hidden rounded-md border border-primary-foreground/40 px-3 py-2 text-sm font-semibold hover:bg-primary-foreground/10 sm:inline-block">
              Mon abonnement
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">🎓 SunuÉcole — Première plateforme de gestion des écoles au Sénégal</h2>
        </div>
        <div className={`mb-6 flex flex-col gap-4 rounded-md border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${subscriptionExpired ? "border-destructive/30 bg-destructive/10" : "border-warning/40 bg-warning/15"}`}>
          <div className="flex items-start gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${subscriptionExpired ? "bg-destructive/15 text-destructive" : "bg-warning/25 text-warning-foreground"}`}>
              {subscriptionExpired ? <Clock3 className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
            </div>
            <div>
              <p className={`font-bold ${subscriptionExpired ? "text-destructive" : "text-foreground"}`}>
                {subscriptionExpired
                  ? "Abonnement expiré"
                  : subscriptionActive
                    ? `Abonnement actif : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`
                    : `Essai gratuit : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Renouvellement 10.000F/mois via Wave 77 912 44 34</p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/abonnement">Payer mon abonnement <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-md border border-border border-l-4 bg-card p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md ${s.accent}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </p>
                <span className={`grid h-9 w-9 place-items-center rounded-md ${s.iconStyle}`}><s.icon className="h-5 w-5" /></span>
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {isLoading ? "…" : s.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Liste des élèves
            </h2>
            <AddStudentDialog disabled={subscriptionExpired} trigger={<Button size="sm" disabled={subscriptionExpired}>➕ Ajouter un élève</Button>} />
          </div>
          <div className="w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[760px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Classe</th>
                  <th className="px-4 py-3 font-medium">Téléphone</th>
                  <th className="px-4 py-3 font-medium">Paiement</th>
                  <th className="px-4 py-3 font-medium">Présence</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const paye = s.payments.some(
                    (p) => p.month === month && p.status === "paye"
                  );
                  const pending = s.payments.find(
                    (p) => p.month === month && p.status === "en_attente"
                  );
                  const present = s.attendance.some(
                    (a) => a.date === today && a.status === "present"
                  );
                  const name = `${s.first_name} ${s.last_name}`.replace(/ -$/, "");
                  const fee = pending?.amount ?? s.classes?.monthly_fee ?? 5000;
                  const phone = (s.guardian_phone ?? "").replace(/\D/g, "");
                  const waPhone = phone.startsWith("221") ? phone : `221${phone}`;
                  const waMsg = `Bonjour, rappel mensualité ${name} classe ${s.classes?.name ?? ""} : ${new Intl.NumberFormat("fr-SN").format(fee)}F. SunuÉcole Limamoulaye`;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {name}
                        {s.guardian_name && <span className="block text-xs font-normal text-muted-foreground">Tuteur : {s.guardian_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.classes?.name}</td>
                      <td className="px-4 py-3">
                        {phone ? (
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-success underline-offset-2 hover:underline"
                            title="Envoyer un rappel WhatsApp"
                          >
                            💬 {s.guardian_phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            paye
                              ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                              : "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                          }
                        >
                          {paye ? "Payé" : "En attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={present}
                          onClick={() => markPresent.mutate(s.id)}
                          className={
                            present
                              ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                              : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-success/15 hover:text-success"
                          }
                          title={present ? "Présent" : "Marquer présent"}
                        >
                          {present ? "Présent" : "Absent"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {!paye ? (
                          <CollectPaymentDialog
                            studentId={s.id}
                            studentName={name}
                            className={s.classes?.name ?? ""}
                            schoolName={data?.school?.name ?? "SunuÉcole"}
                            schoolCity={data?.school?.city ?? "Limamoulaye — Guédiawaye"}
                            schoolPhone={data?.school?.phone ?? "77 912 44 34"}
                            guardianName={s.guardian_name ?? "—"}
                            guardianPhone={s.guardian_phone ?? ""}
                            month={month}
                            defaultAmount={fee}
                            pendingPaymentId={pending?.id ?? null}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">✓ Réglé</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10">
                      <div className="mx-auto max-w-3xl text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                          <UserPlus className="h-7 w-7" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-foreground">Bienvenue dans votre école</h3>
                        <p className="mt-1 text-muted-foreground">Configurez votre espace en quelques minutes.</p>
                        <AddStudentDialog disabled={subscriptionExpired} trigger={<Button size="lg" className="mt-5" disabled={subscriptionExpired}>➕ Ajouter mon premier élève</Button>} />
                        <ol className="mt-8 grid gap-4 text-left md:grid-cols-3">
                          {[
                            { icon: School, title: "1. Créez une classe", text: "Indiquez le niveau et les frais mensuels." },
                            { icon: UserPlus, title: "2. Ajoutez les élèves", text: "Enregistrez l’élève et son responsable." },
                            { icon: ClipboardCheck, title: "3. Suivez l’école", text: "Gérez présences et paiements au quotidien." },
                          ].map((step) => (
                            <li key={step.title} className="rounded-lg border border-border bg-muted/40 p-4">
                              <step.icon className="h-5 w-5 text-primary" />
                              <p className="mt-2 font-semibold text-foreground">{step.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Paiements</h2>
              <p className="text-sm text-muted-foreground">Historique des reçus encaissés</p>
            </div>
          </div>
          {receipts.length > 0 ? (
            <div className="w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[860px] whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Reçu</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Élève</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(({ id, receipt }) => {
                    const whatsappUrl = studentReceiptWhatsAppUrl(receipt);
                    return (
                      <tr key={id} className="border-b border-border last:border-0 hover:bg-accent/50">
                        <td className="px-4 py-3 font-semibold text-primary">{receipt.number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(receipt.date).toLocaleDateString("fr-SN")}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{receipt.studentName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{receipt.className}</td>
                        <td className="px-4 py-3 text-muted-foreground">{receipt.method}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatFCFA(receipt.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="icon" variant="ghost" title="Voir le reçu" aria-label={`Voir le reçu ${receipt.number}`} onClick={() => viewStudentReceipt(receipt)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" title="Télécharger le PDF" aria-label={`Télécharger le reçu ${receipt.number}`} onClick={() => downloadStudentReceipt(receipt)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button asChild size="icon" variant="ghost" title="Envoyer par WhatsApp" aria-label={`Envoyer le reçu ${receipt.number} par WhatsApp`} disabled={!whatsappUrl}>
                              <a href={whatsappUrl ?? undefined} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="font-medium text-foreground">Aucun paiement encaissé</p>
              <p className="mt-1 text-sm text-muted-foreground">Les reçus apparaîtront ici après validation d’un paiement.</p>
            </div>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
