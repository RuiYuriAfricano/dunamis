import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

const LOGO_PATH = join(__dirname, '..', 'assets', 'logo-dunamis.png');

interface RegistrationPdfInput {
  registrationNumber: string;
  fullName: string;
  church: string;
  transportStopName: string | null;
  tentRequired: boolean;
  mattressRequired: boolean;
  paymentAmount: number;
  qrToken: string;
}

/**
 * Renders the same comprovativo layout as the client-side generator
 * (apps/web/lib/generate-registration-pdf.ts) but server-side, so it can be
 * attached to the validation email as soon as payment is confirmed.
 */
export async function generateRegistrationPdf(
  input: RegistrationPdfInput,
): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(input.qrToken, { margin: 1, width: 320 });

  const doc = new PDFDocument({ size: 'A5', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = doc.page.width;
  const marginX = 40;
  let y = 36;

  const logoWidth = 150;
  const logoHeight = (170 / 438) * logoWidth;
  doc.image(LOGO_PATH, (pageWidth - logoWidth) / 2, y, { width: logoWidth });
  y += logoHeight + 20;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#5a5a5a')
    .text('Ministério Manancial · Terceira Igreja Baptista de Luanda', 0, y, {
      align: 'center',
      width: pageWidth,
    });
  y += 22;

  doc
    .moveTo(marginX, y)
    .lineTo(pageWidth - marginX, y)
    .strokeColor('#d2d2d2')
    .stroke();
  y += 20;

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#141414')
    .text('Comprovativo de inscrição', marginX, y);
  y += 22;

  const rows: [string, string][] = [
    ['Nome', input.fullName],
    ['Número de inscrição', input.registrationNumber],
    ['Igreja', input.church],
    ['Paragem de transporte', input.transportStopName ?? 'Não solicitado'],
    ['Tenda', input.tentRequired ? 'Sim' : 'Não'],
    ['Colchão', input.mattressRequired ? 'Sim' : 'Não'],
    ['Valor da inscrição', `${input.paymentAmount.toLocaleString('pt-PT')} Kz`],
    ['Pagamento', 'Confirmado'],
  ];

  doc.fontSize(10.5);
  for (const [label, value] of rows) {
    doc.font('Helvetica').fillColor('#787878').text(label, marginX, y);
    doc
      .font('Helvetica-Bold')
      .fillColor('#141414')
      .text(value, marginX + 140, y, { width: pageWidth - marginX * 2 - 140 });
    y += 18;
  }

  y += 10;
  const qrSize = 130;
  doc.image(qrPng, (pageWidth - qrSize) / 2, y, { width: qrSize });
  y += qrSize + 22;

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#6e6e6e')
    .text(
      'Apresente este comprovativo (impresso ou no telemóvel) no check-in, no dia do evento. O QR Code é pessoal e intransmissível.',
      marginX,
      y,
      { align: 'center', width: pageWidth - marginX * 2 },
    );

  doc.end();
  return done;
}
