import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddStudentDialog({ trigger, disabled = false }: { trigger: React.ReactNode; disabled?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const fullName = String(f.get("name") ?? "").trim();
    const className = String(f.get("class") ?? "").trim();
    const guardian = String(f.get("guardian") ?? "").trim();
    const phone = String(f.get("phone") ?? "").trim();
    const amount = parseInt(String(f.get("amount") ?? "0"), 10) || 0;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Session expirée, reconnectez-vous.");
      const { data: school, error: se } = await supabase
        .from("schools").select("id").eq("owner_id", uid).limit(1).maybeSingle();
      if (se) throw se;
      if (!school) throw new Error("Aucune école liée à votre compte.");

      let { data: cls, error: ce } = await supabase
        .from("classes").select("id").eq("school_id", school.id).ilike("name", className)
        .limit(1).maybeSingle();
      if (ce) throw ce;
      if (!cls) {
        const r = await supabase.from("classes")
          .insert({ school_id: school.id, name: className, level: className, monthly_fee: amount })
          .select("id").single();
        if (r.error) throw r.error;
        cls = r.data;
      }

      const parts = fullName.split(/\s+/);
      const first = parts.shift() ?? fullName;
      const last = parts.join(" ") || "-";
      const { data: st, error: ste } = await supabase.from("students")
        .insert({ class_id: cls.id, first_name: first, last_name: last, guardian_name: guardian || null, guardian_phone: phone || null })
        .select("id").single();
      if (ste) throw ste;

      if (amount > 0) {
        const { error: pe } = await supabase.from("payments").insert({
          student_id: st.id, amount, month: new Date().toISOString().slice(0, 7), status: "en_attente",
        });
        if (pe) throw pe;
      }
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    } catch (err) {
      console.error("Ajout élève:", err);
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un élève</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div><Label htmlFor="name">Nom complet</Label><Input id="name" name="name" required placeholder="Moussa Diop" /></div>
          <div><Label htmlFor="class">Classe</Label><Input id="class" name="class" required placeholder="6ème" /></div>
          <div><Label htmlFor="guardian">Tuteur</Label><Input id="guardian" name="guardian" placeholder="Nom du tuteur" /></div>
          <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" name="phone" inputMode="tel" placeholder="771234567" /></div>
          <div><Label htmlFor="amount">Montant mensuel (FCFA)</Label><Input id="amount" name="amount" type="number" min={0} placeholder="5000" /></div>
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l'élève"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
