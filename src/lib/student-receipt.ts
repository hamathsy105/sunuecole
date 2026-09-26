import jsPDF from "jspdf";
import QRCode from "qrcode";

export type StudentReceipt = {
  number: string;
  studentName: string;
  className: string;
  schoolName: string;
  schoolCity: string;
  schoolPhone: string;
  guardianName: string;
  guardianPhone: string;
  amount: number;
  date: string;
  method: string;
  month: string;
};

async function toDataUrl(url: string) {
  const blob = await fetch(url).then((r) => r.blob());
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function receiptFileName(r: StudentReceipt) {
  return `recu-${r.studentName.replace(/[^a-zA-ZÀ-ÿ0-9]+/g, "-")}-${r.number}.pdf`;
}

export function studentReceiptNumber(paymentId: string, paidAt: string) {
  const compactId = paymentId.replace(/-/g, "").slice(0, 8);
  const numericId = Number.parseInt(compactId, 16);
  const suffix = Number.isFinite(numericId) ? numericId % 10000 : 0;
  return `REC-${new Date(paidAt).getFullYear()}-${String(suffix).padStart(4, "0")}`;
}

export function studentReceiptWhatsAppUrl(r: StudentReceipt) {
  const phone = r.guardianPhone.replace(/\D/g, "");
  if (!phone) return null;
  const internationalPhone = phone.startsWith("221") ? phone : `221${phone}`;
  const amount = new Intl.NumberFormat("fr-SN").format(r.amount);
  const message = [
    `Bonjour, le paiement de ${amount} FCFA pour ${r.studentName} (${r.className || "classe non précisée"}) a bien été validé.`,
    `Reçu : ${r.number}.`,
    `Mode : ${r.method}.`,
    `SunuÉcole — ${r.schoolName}.`,
  ].join(" ");
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
}

async function createStudentReceiptPdf(r: StudentReceipt) {
  const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
  const qr = await QRCode.toDataURL(
    ["SunuÉcole", "Wave 77 912 44 34", r.number, r.studentName, r.className, `${r.amount} FCFA`, r.method, r.month, r.date].join(" | "),
    { width: 320, margin: 1 },
  );
  const logo = await toDataUrl("/icon-192.png");
  const fmt = new Intl.NumberFormat("fr-SN").format(r.amount).replace(/[\u00a0\u202f]/g, " ");

  const width = 210;
  const height = 148;
  const blue: [number, number, number] = [30, 64, 175];
  const navy: [number, number, number] = [8, 43, 105];
  const pale: [number, number, number] = [239, 246, 255];
  const red: [number, number, number] = [185, 28, 28];
  const ink: [number, number, number] = [15, 32, 68];

  pdf.setDrawColor(...blue);
  pdf.setLineWidth(1.4);
  pdf.rect(4, 4, width - 8, height - 8);
  pdf.setLineWidth(0.35);
  pdf.rect(7, 7, width - 14, height - 14);

  pdf.setFillColor(...blue);
  pdf.rect(8, 8, 194, 25, "F");
  pdf.addImage(logo, "PNG", 13, 10.5, 20, 20);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("SunuÉcole", 37, 21.5);
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.25);
  pdf.line(88, 13, 88, 28);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(["Première plateforme de gestion", "des écoles au Sénégal"], 94, 18);

  pdf.setFillColor(...navy);
  pdf.roundedRect(153, 36, 43, 8, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text(`N° REÇU : ${r.number}`, 174.5, 41.2, { align: "center" });

  pdf.setTextColor(...navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("REÇU DE PAIEMENT", 105, 50, { align: "center" });
  pdf.setFontSize(8.5);
  pdf.text("REÇU OFFICIEL — PAIEMENT DE FRAIS DE SCOLARITÉ", 105, 55.5, { align: "center" });

  const sectionHeader = (x: number, y: number, w: number, title: string) => {
    pdf.setFillColor(...navy);
    pdf.roundedRect(x, y, w, 7, 1.5, 1.5, "F");
    pdf.rect(x, y + 3.5, w, 3.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.text(title, x + 3, y + 4.8);
  };

  const leftX = 13;
  const top = 60;
  sectionHeader(leftX, top, 88, "INFORMATIONS DE L’ÉTABLISSEMENT");
  sectionHeader(105, top, 92, "INFORMATIONS DE L’ÉLÈVE");
  pdf.setFillColor(...pale);
  pdf.setDrawColor(...blue);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(leftX, top + 7, 88, 26, 1.5, 1.5, "FD");
  pdf.roundedRect(105, top + 7, 92, 26, 1.5, 1.5, "FD");
  pdf.setTextColor(...ink);
  pdf.setFontSize(7.4);
  pdf.setFont("helvetica", "bold");
  pdf.text("École :", 17, 72);
  pdf.text("Adresse :", 17, 79.5);
  pdf.text("Contact :", 17, 87);
  pdf.text("Élève :", 109, 72);
  pdf.text("Classe :", 109, 79.5);
  pdf.text("Année scolaire :", 109, 87);
  pdf.setFont("helvetica", "normal");
  pdf.text(r.schoolName, 34, 72, { maxWidth: 63 });
  pdf.text(`${r.schoolCity || "Limamoulaye — Guédiawaye"}, Sénégal`, 34, 79.5, { maxWidth: 63 });
  pdf.text(`${r.schoolPhone || "—"}  |  Wave 77 912 44 34`, 34, 87, { maxWidth: 63 });
  pdf.text(r.studentName, 134, 72, { maxWidth: 59 });
  pdf.text(r.className || "—", 134, 79.5);
  pdf.text("2025–2026", 145, 87);

  sectionHeader(13, 96, 184, "DÉTAILS DU PAIEMENT");
  pdf.setFillColor(...pale);
  pdf.roundedRect(13, 103, 184, 11, 1.5, 1.5, "FD");
  pdf.setTextColor(...ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.text("Désignation :", 17, 109.5);
  pdf.text("Mode :", 102, 109.5);
  pdf.text("Date :", 145, 109.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Frais de scolarité — ${r.className || "Classe"} — ${r.month}`, 38, 109.5, { maxWidth: 61 });
  pdf.text(r.method, 114, 109.5);
  pdf.text(new Date(r.date).toLocaleString("fr-SN", { dateStyle: "short", timeStyle: "short" }), 156, 109.5);

  pdf.setFillColor(226, 237, 252);
  pdf.setDrawColor(...navy);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(67, 117, 88, 14, 2, 2, "FD");
  pdf.setTextColor(...navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.3);
  pdf.text("MONTANT PAYÉ", 111, 121, { align: "center" });
  pdf.setFontSize(15);
  pdf.text(`${fmt} FCFA`, 111, 128, { align: "center" });

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...blue);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(13, 117, 48, 14, 1.5, 1.5, "FD");
  pdf.setTextColor(...navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.5);
  pdf.text("QR WAVE 77 912 44 34", 27, 121.5, { align: "center" });
  pdf.addImage(qr, "PNG", 46, 118, 12, 12);

  pdf.setDrawColor(...red);
  pdf.setTextColor(...red);
  pdf.setLineWidth(0.8);
  pdf.circle(176, 124, 9, "S");
  pdf.setLineWidth(0.3);
  pdf.circle(176, 124, 7.3, "S");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(4.4);
  pdf.text("SUNUÉCOLE", 176, 121.5, { align: "center" });
  pdf.setFontSize(7.5);
  pdf.text("PAYÉ", 176, 126, { align: "center" });
  pdf.setFontSize(4.2);
  pdf.text("VALIDÉ", 176, 129, { align: "center" });

  pdf.setFillColor(...blue);
  pdf.rect(8, 134, 194, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8.5);
  pdf.text("Support Wave 77 912 44 34 — Limamoulaye — Guédiawaye", 105, 138.7, { align: "center" });
  return pdf;
}

export async function downloadStudentReceipt(r: StudentReceipt) {
  const pdf = await createStudentReceiptPdf(r);
  pdf.save(receiptFileName(r));
}

export async function viewStudentReceipt(r: StudentReceipt) {
  const previewWindow = window.open("", "_blank");
  const pdf = await createStudentReceiptPdf(r);
  const url = URL.createObjectURL(pdf.output("blob"));
  if (previewWindow) {
    previewWindow.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
