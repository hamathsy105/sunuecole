import jsPDF from "jspdf";
import QRCode from "qrcode";

type ReceiptData = {
  receipt_number: string;
  amount: number;
  paid_at: string;
  period_start: string;
  period_end: string;
  schoolName: string;
};

export async function downloadReceiptPdf(receipt: ReceiptData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const qrPayload = [
    "SunuÉcole",
    receipt.receipt_number,
    receipt.schoolName,
    `${receipt.amount} FCFA`,
    new Date(receipt.paid_at).toISOString(),
  ].join(" | ");
  const qr = await QRCode.toDataURL(qrPayload, { width: 320, margin: 1 });
  const logo = await fetch("/icon-192.png").then((response) => response.blob());
  const logoData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(logo);
  });

  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, 210, 42, "F");
  pdf.addImage(logoData, "PNG", 18, 10, 22, 22);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(23);
  pdf.text("SunuÉcole", 48, 22);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Reçu officiel d'abonnement", 48, 29);

  pdf.setTextColor(20, 28, 45);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("PAIEMENT CONFIRMÉ", 18, 62);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Reçu : ${receipt.receipt_number}`, 18, 74);
  pdf.text(`École : ${receipt.schoolName}`, 18, 84);
  pdf.text(`Date : ${new Date(receipt.paid_at).toLocaleDateString("fr-SN")}`, 18, 94);
  pdf.text(`Période : ${new Date(receipt.period_start).toLocaleDateString("fr-SN")} au ${new Date(receipt.period_end).toLocaleDateString("fr-SN")}`, 18, 104);

  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(18, 118, 174, 34, 3, 3, "F");
  pdf.setTextColor(30, 64, 175);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text(`${new Intl.NumberFormat("fr-SN").format(receipt.amount)} FCFA`, 28, 134);
  pdf.setFontSize(12);
  pdf.text("Payé via Wave", 28, 143);
  pdf.addImage(qr, "PNG", 150, 120, 34, 34);

  pdf.setTextColor(90, 98, 112);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Le QR code contient les références uniques de ce reçu.", 18, 174);
  pdf.text("Support : Wave 77 912 44 34 · Limamoulaye", 18, 181);
  pdf.save(`recu-sunuecole-${receipt.receipt_number}.pdf`);
}