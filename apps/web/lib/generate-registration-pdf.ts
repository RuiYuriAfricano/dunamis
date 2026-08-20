import type { ParticipantConfirmation } from "@dunamis/types";

async function loadImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateRegistrationPdf(confirmation: ParticipantConfirmation): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const logo = await loadImageAsDataUrl("/logo-dunamis-new.png");

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 18;

  const logoWidth = 50;
  const logoHeight = (278 / 621) * logoWidth;
  doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
  y += logoHeight + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Ministério Manancial · Terceira Igreja Baptista de Luanda", pageWidth / 2, y, {
    align: "center",
  });
  y += 10;

  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 10;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Comprovativo de inscrição", marginX, y);
  y += 9;

  const rows: [string, string][] = [
    ["Nome", confirmation.fullName],
    ["Número de inscrição", confirmation.registrationNumber],
    ["Igreja", confirmation.church],
    ["Paragem de transporte", confirmation.transportStop?.name ?? "Não solicitado"],
    ["Tenda", confirmation.tentRequired ? "Sim" : "Não"],
    ["Colchão", confirmation.mattressRequired ? "Sim" : "Não"],
    [
      "Valor da inscrição",
      confirmation.isSponsored
        ? "Patrocinado"
        : `${confirmation.paymentAmount.toLocaleString("pt-PT")} Kz`,
    ],
    ["Comprovativo", confirmation.isSponsored ? "Patrocinado (aprovado)" : "Recebido"],
  ];

  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(value, marginX + 48, y);
    y += 6.5;
  }

  y += 3;
  const qrSize = 38;
  doc.addImage(confirmation.qrCodeDataUrl, "PNG", (pageWidth - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  const instructions =
    "Apresente este comprovativo (impresso ou no telemóvel) no check-in, no dia do evento. O QR Code é pessoal e intransmissível.";
  const lines = doc.splitTextToSize(instructions, pageWidth - marginX * 2);
  doc.text(lines, pageWidth / 2, y, { align: "center" });

  doc.save(`${confirmation.registrationNumber}-comprovativo.pdf`);
}
