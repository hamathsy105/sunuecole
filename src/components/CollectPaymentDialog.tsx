import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Download, Eye, MessageCircle } from "lucide-react";
import { downloadStudentReceipt, studentReceiptNumber, studentReceiptWhatsAppUrl, viewStudentReceipt, type StudentReceipt } from "@/lib/student-receipt";

type Props = {
  studentId: string;
  studentName: string;
  className: string;
  schoolName: string;
  schoolCity: string;
  schoolPhone: string;
  guardianName: string;
  guardianPhone: string;
  month: string;
  defaultAmount: number;
  pendingPaymentId: string | null;
};

export function CollectPaymentDialog(p: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"Espèce" | "Wave">("Wave");
  const [receipt, setReceipt] = useState<StudentReceipt | null>(null);

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setReceipt(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const amount = parseInt(String(f.get("amount") ?? "0"), 10) || 0;
    const date = String(f.get("date") ?? new Date().toISOString().slice(0, 10));
    const paidAt = new Date(`${date}T12:00:00`).toISOString();
    try {
      if (amount <= 0) throw new Error("Montant invalide.");
      const payload = { amount, status: "paye", paid_at: paidAt, payment_method: method };
      const res = p.pendingPaymentId
        ? await supabase.from("payments").update(payload).eq("id", p.pendingPaymentId).select("id").single()
        : await supabase.from("payments").insert({ ...payload, student_id: p.studentId, month: p.month }).select("id").single();
      if (res.error) throw res.error;
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      const nextReceipt: StudentReceipt = {
        number: studentReceiptNumber(res.data.id, paidAt),
        studentName: p.studentName,
        className: p.className,
        schoolName: p.schoolName,
        schoolCity: p.schoolCity,
        schoolPhone: p.schoolPhone,
        guardianName: p.guardianName,
        guardianPhone: p.guardianPhone,
        amount,
        date: paidAt,
        method,
        month: p.month,
      };
      setReceipt(nextReceipt);
    } catch (err) {
      console.error("Encaissement:", err);
      setError((err as { message?: string })?.message ?? "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">Payer</Button>
      </DialogTrigger>
      <DialogContent>
        {receipt ? (
          <div className="space-y-5 py-2 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle>Reçu généré</DialogTitle>
              <DialogDescription>Le paiement est enregistré. Le reçu {receipt.number} reste disponible dans Paiements.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <p className="font-semibold text-foreground">{receipt.studentName}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{new Intl.NumberFormat("fr-SN").format(receipt.amount)} FCFA</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={() => viewStudentReceipt(receipt)}>
                <Eye /> Voir le reçu
              </Button>
              <Button type="button" onClick={() => downloadStudentReceipt(receipt)}>
                <Download /> Télécharger PDF
              </Button>
              <Button asChild variant="outline" disabled={!studentReceiptWhatsAppUrl(receipt)}>
                <a href={studentReceiptWhatsAppUrl(receipt) ?? undefined} target="_blank" rel="noreferrer" aria-disabled={!studentReceiptWhatsAppUrl(receipt)}>
                  <MessageCircle /> Envoyer par WhatsApp
                </a>
              </Button>
            </div>
            {!studentReceiptWhatsAppUrl(receipt) && <p className="text-sm text-muted-foreground">Ajoutez le téléphone du tuteur pour partager sur WhatsApp.</p>}
          </div>
        ) : (
        <>
          <DialogHeader><DialogTitle>Encaisser — {p.studentName}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
          <div><Label htmlFor="amount">Montant (FCFA)</Label><Input id="amount" name="amount" type="number" min={1} required defaultValue={p.defaultAmount || 5000} /></div>
          <div><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div>
            <Label>Mode</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["Espèce", "Wave"] as const).map((m) => (
                <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>{m}</Button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-success text-success-foreground hover:bg-success/90" disabled={busy}>
            {busy ? "Enregistrement…" : "Valider et générer le reçu"}
          </Button>
          </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
