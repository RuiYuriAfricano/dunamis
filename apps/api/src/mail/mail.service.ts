import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const SENDER_NAME = 'DUNAMIS · Terceira Igreja Baptista de Luanda';

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
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null | undefined;

  /**
   * Returns a cached SMTP transporter if GMAIL_USER/GMAIL_APP_PASSWORD are
   * configured, otherwise null. Without them, emails are skipped (logged
   * instead) — convenient for local development without Gmail credentials.
   */
  private getTransporter(): Transporter | null {
    if (this.transporter !== undefined) return this.transporter;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      this.logger.warn(
        'GMAIL_USER/GMAIL_APP_PASSWORD não definidos — emails de validação de pagamento não serão enviados.',
      );
      this.transporter = null;
      return null;
    }

    // Fail fast instead of hanging silently — a blocked/slow SMTP connection
    // would otherwise leave the caller's fire-and-forget promise pending
    // forever, with nothing ever reaching the logs.
    // `family` isn't in @types/nodemailer's Options, but nodemailer forwards
    // unrecognized options straight through to Node's net/tls connect calls,
    // so this is a real, supported way to force IPv4.
    const options = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 15_000,
      // Render resolves smtp.gmail.com to an IPv6 address but has no IPv6
      // egress route, failing with ENETUNREACH before the connection even
      // starts. Force IPv4, which Render does route correctly.
      family: 4,
    };
    this.transporter = createTransport(options as SMTPTransport.Options);

    this.transporter
      .verify()
      .then(() => this.logger.log('Ligação SMTP ao Gmail verificada com sucesso.'))
      .catch((error: Error) =>
        this.logger.error(`Falha ao verificar a ligação SMTP ao Gmail: ${error.message}`),
      );

    return this.transporter;
  }

  async sendPaymentConfirmedEmail(input: PaymentConfirmedEmailInput) {
    const transporter = this.getTransporter();
    if (!transporter) return;

    const firstName = input.fullName.trim().split(/\s+/)[0];
    const confirmationLine = input.isSponsored
      ? 'A sua inscrição como patrocinado(a)/bolseiro(a) foi aprovada e está confirmada.'
      : 'O seu pagamento foi validado e a sua inscrição no DUNAMIS está confirmada.';

    this.logger.log(`A enviar email de confirmação para ${input.to} (${input.registrationNumber})...`);
    try {
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${process.env.GMAIL_USER}>`,
        to: input.to,
        subject: `Inscrição confirmada — ${input.registrationNumber} · DUNAMIS`,
        text:
          `Olá, ${firstName}.\n\n` +
          `${confirmationLine}\n\n` +
          `Número de inscrição: ${input.registrationNumber}\n\n` +
          `Em anexo encontra o comprovativo de inscrição com o QR Code. Apresente-o (impresso ou no telemóvel) no check-in, no dia do evento.\n\n` +
          `Até já,\nEquipa DUNAMIS`,
        html: paymentConfirmedHtml(firstName, input.registrationNumber, confirmationLine),
        attachments: [
          {
            filename: `${input.registrationNumber}-comprovativo.pdf`,
            content: input.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Email de confirmação enviado para ${input.to} (${input.registrationNumber}).`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de confirmação para ${input.to} (${input.registrationNumber}): ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendPaymentRejectedEmail(input: PaymentRejectedEmailInput) {
    const transporter = this.getTransporter();
    if (!transporter) return;

    const firstName = input.fullName.trim().split(/\s+/)[0];

    this.logger.log(`A enviar email de rejeição para ${input.to} (${input.registrationNumber})...`);
    try {
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${process.env.GMAIL_USER}>`,
        to: input.to,
        subject: `Não foi possível validar o seu pagamento — ${input.registrationNumber} · DUNAMIS`,
        text:
          `Olá, ${firstName}.\n\n` +
          `Não foi possível validar o comprovativo de pagamento associado à inscrição ${input.registrationNumber}.\n\n` +
          `Isto pode acontecer por o valor, a referência ou a imagem não corresponderem ao esperado. ` +
          `Contacte-nos para regularizar a situação.\n\n` +
          `Equipa DUNAMIS`,
        html: paymentRejectedHtml(firstName, input.registrationNumber),
      });
      this.logger.log(`Email de rejeição enviado para ${input.to} (${input.registrationNumber}).`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de rejeição para ${input.to} (${input.registrationNumber}): ${(error as Error).message}`,
      );
      throw error;
    }
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

function paymentRejectedHtml(firstName: string, registrationNumber: string): string {
  return emailShell(`
    <p style="margin:0 0 16px;">Olá, <strong>${firstName}</strong>.</p>
    <p style="margin:0 0 16px;">
      Não foi possível validar o comprovativo de pagamento associado à inscrição
      <strong style="font-family:monospace;">${registrationNumber}</strong>.
    </p>
    <p style="margin:0 0 16px;">
      Isto pode acontecer quando o valor, a referência ou a imagem do comprovativo não correspondem ao
      esperado. Contacte-nos para regularizar a situação e concluir a sua inscrição.
    </p>
    <p style="margin:24px 0 0;color:#5a5a5a;">Equipa DUNAMIS</p>
  `);
}
