import { Injectable, Logger } from '@nestjs/common';

const SENDER_NAME = 'DUNAMIS · Terceira Igreja Baptista de Luanda';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface PaymentConfirmedEmailInput {
  to: string;
  fullName: string;
  registrationNumber: string;
  isSponsored: boolean;
  pdfBuffer: Buffer;
}

interface PaymentRejectedEmailInput {
  to: string;
  fullName: string;
  registrationNumber: string;
  reason?: string;
}

interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  textContent: string;
  attachment?: { name: string; content: string }[];
}

/**
 * Sends transactional email through Brevo's HTTPS API instead of raw SMTP.
 * Render's free-tier network silently drops outbound connections on SMTP
 * ports (25/465/587) — every attempt via Gmail SMTP timed out at exactly the
 * configured connectionTimeout, both over IPv4 and IPv6, which is the
 * signature of an egress port block rather than a DNS/auth problem. HTTPS
 * (443) isn't blocked, so the fix is switching transport, not tuning SMTP.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private getSenderEmail(): string | null {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL ?? process.env.GMAIL_USER;

    if (!apiKey || !senderEmail) {
      this.logger.warn(
        'BREVO_API_KEY/BREVO_SENDER_EMAIL não definidos — emails de validação de pagamento não serão enviados.',
      );
      return null;
    }

    return senderEmail;
  }

  private async send(payload: BrevoEmailPayload, logLabel: string) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return;

    this.logger.log(`A enviar ${logLabel}...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo respondeu ${response.status}: ${body}`);
      }

      this.logger.log(`${logLabel} enviado com sucesso.`);
    } catch (error) {
      this.logger.error(`Falha ao enviar ${logLabel}: ${(error as Error).message}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendPaymentConfirmedEmail(input: PaymentConfirmedEmailInput) {
    const senderEmail = this.getSenderEmail();
    if (!senderEmail) return;

    const firstName = input.fullName.trim().split(/\s+/)[0];
    const confirmationLine = input.isSponsored
      ? 'A sua inscrição como patrocinado(a)/bolseiro(a) foi aprovada e está confirmada.'
      : 'O seu pagamento foi validado e a sua inscrição no DUNAMIS está confirmada.';

    await this.send(
      {
        sender: { name: SENDER_NAME, email: senderEmail },
        to: [{ email: input.to }],
        subject: `Inscrição confirmada — ${input.registrationNumber} · DUNAMIS`,
        textContent:
          `Olá, ${firstName}.\n\n` +
          `${confirmationLine}\n\n` +
          `Número de inscrição: ${input.registrationNumber}\n\n` +
          `Em anexo encontra o comprovativo de inscrição com o QR Code. Apresente-o (impresso ou no telemóvel) no check-in, no dia do evento.\n\n` +
          `Até já,\nEquipa DUNAMIS`,
        htmlContent: paymentConfirmedHtml(firstName, input.registrationNumber, confirmationLine),
        attachment: [
          {
            name: `${input.registrationNumber}-comprovativo.pdf`,
            content: input.pdfBuffer.toString('base64'),
          },
        ],
      },
      `email de confirmação para ${input.to} (${input.registrationNumber})`,
    );
  }

  async sendPaymentRejectedEmail(input: PaymentRejectedEmailInput) {
    const senderEmail = this.getSenderEmail();
    if (!senderEmail) return;

    const firstName = input.fullName.trim().split(/\s+/)[0];

    await this.send(
      {
        sender: { name: SENDER_NAME, email: senderEmail },
        to: [{ email: input.to }],
        subject: `Não foi possível validar o seu pagamento — ${input.registrationNumber} · DUNAMIS`,
        textContent:
          `Olá, ${firstName}.\n\n` +
          `Não foi possível validar o comprovativo de pagamento associado à inscrição ${input.registrationNumber}.\n\n` +
          (input.reason
            ? `Motivo: ${input.reason}\n\n`
            : `Isto pode acontecer por o valor, a referência ou a imagem não corresponderem ao esperado.\n\n`) +
          `Contacte-nos para regularizar a situação.\n\n` +
          `Equipa DUNAMIS`,
        htmlContent: paymentRejectedHtml(firstName, input.registrationNumber, input.reason),
      },
      `email de rejeição para ${input.to} (${input.registrationNumber})`,
    );
  }
}

function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt">
  <body style="margin:0;padding:0;background:#f4f4f1;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="background:#f4f4f1;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#126437;padding:20px 32px;">
                <span style="color:#f4f4f1;font-size:16px;font-weight:bold;letter-spacing:0.5px;">DUNAMIS</span>
                <div style="color:#c9d2c9;font-size:11px;margin-top:2px;">Terceira Igreja Baptista de Luanda</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1c1c1c;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f7f6f2;color:#9a9a92;font-size:11px;">
                Este é um email automático — não é necessário responder.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paymentConfirmedHtml(
  firstName: string,
  registrationNumber: string,
  confirmationLine: string,
): string {
  return emailShell(`
    <p style="margin:0 0 16px;">Olá, <strong>${firstName}</strong>.</p>
    <p style="margin:0 0 16px;">
      ${confirmationLine}
    </p>
    <p style="margin:0 0 20px;">
      Número de inscrição: <strong style="font-family:monospace;">${registrationNumber}</strong>
    </p>
    <p style="margin:0 0 16px;">
      Em anexo encontra o comprovativo de inscrição com o seu QR Code pessoal. Apresente-o — impresso ou no
      telemóvel — no check-in, no dia do evento.
    </p>
    <p style="margin:24px 0 0;color:#5a5a5a;">Até já,<br/>Equipa DUNAMIS</p>
  `);
}

function paymentRejectedHtml(
  firstName: string,
  registrationNumber: string,
  reason?: string,
): string {
  return emailShell(`
    <p style="margin:0 0 16px;">Olá, <strong>${firstName}</strong>.</p>
    <p style="margin:0 0 16px;">
      Não foi possível validar o comprovativo de pagamento associado à inscrição
      <strong style="font-family:monospace;">${registrationNumber}</strong>.
    </p>
    ${
      reason
        ? `<p style="margin:0 0 16px;"><strong>Motivo:</strong> ${reason}</p>`
        : `<p style="margin:0 0 16px;">
      Isto pode acontecer quando o valor, a referência ou a imagem do comprovativo não correspondem ao
      esperado.
    </p>`
    }
    <p style="margin:0 0 16px;">Contacte-nos para regularizar a situação e concluir a sua inscrição.</p>
    <p style="margin:24px 0 0;color:#5a5a5a;">Equipa DUNAMIS</p>
  `);
}
