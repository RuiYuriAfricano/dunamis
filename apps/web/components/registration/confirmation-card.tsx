"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock, Download, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { generateRegistrationPdf } from "@/lib/generate-registration-pdf";
import { PaymentStatus, type ParticipantConfirmation } from "@dunamis/types";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  [PaymentStatus.PENDING]: {
    icon: Clock,
    label: "Pagamento por validar",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  [PaymentStatus.CONFIRMED]: {
    icon: CheckCircle2,
    label: "Pagamento confirmado",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  [PaymentStatus.REJECTED]: {
    icon: XCircle,
    label: "Pagamento rejeitado",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function ConfirmationCard({ confirmation }: { confirmation: ParticipantConfirmation }) {
  const [downloading, setDownloading] = useState(false);
  const status = STATUS_CONFIG[confirmation.paymentStatus];
  const StatusIcon = status.icon;

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await generateRegistrationPdf(confirmation);
    } catch {
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md animate-in fade-in zoom-in-95 duration-500 print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-xl tracking-wide text-dunamis-green">
          <CheckCircle2 className="size-6 text-primary" />
          Inscrição recebida!
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="w-full space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nome: </span>
            {confirmation.fullName}
          </p>
          <p>
            <span className="text-muted-foreground">Número de inscrição: </span>
            <span className="font-mono font-semibold">{confirmation.registrationNumber}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Igreja: </span>
            {confirmation.church}
          </p>
          {confirmation.transportStop && (
            <p>
              <span className="text-muted-foreground">Paragem de transporte: </span>
              {confirmation.transportStop.name}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Tenda: </span>
            {confirmation.tentRequired ? "Sim" : "Não"}
          </p>
          <p>
            <span className="text-muted-foreground">Colchão: </span>
            {confirmation.mattressRequired ? "Sim" : "Não"}
          </p>
          <p>
            <span className="text-muted-foreground">Valor da inscrição: </span>
            {confirmation.isSponsored ? "Patrocinado" : `${confirmation.paymentAmount.toLocaleString("pt-PT")} Kz`}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
        >
          <StatusIcon className="size-3.5" />
          {status.label}
        </span>

        {confirmation.paymentStatus === PaymentStatus.PENDING && (
          <p className="text-center text-sm text-muted-foreground">
            {confirmation.isSponsored
              ? "A sua inscrição como patrocinado(a)/bolseiro(a) está a aguardar aprovação pela organização. Assim que for aprovada, receberá por email o comprovativo de inscrição com o QR Code de acesso."
              : "Recebemos o seu comprovativo e está a aguardar validação pela organização. Assim que for validado, receberá por email o comprovativo de inscrição com o QR Code de acesso."}
          </p>
        )}

        {confirmation.paymentStatus === PaymentStatus.REJECTED && (
          <p className="text-center text-sm text-muted-foreground">
            Não foi possível validar o comprovativo enviado. Contacte a organização para regularizar a
            sua inscrição.
          </p>
        )}

        {confirmation.paymentStatus === PaymentStatus.CONFIRMED && (
          <>
            <Image
              src={confirmation.qrCodeDataUrl}
              alt={`QR Code da inscrição ${confirmation.registrationNumber}`}
              width={220}
              height={220}
              className="animate-in zoom-in-90 rounded-md border p-2 duration-500 delay-150 fill-mode-both"
              unoptimized
            />

            <p className="text-center text-xs text-muted-foreground">
              Apresente este QR Code (no telemóvel ou impresso) no check-in, no dia do evento.
            </p>

            <div className="flex w-full gap-2 print:hidden">
              <Button className="flex-1" variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
                {downloading ? <Spinner /> : <Download className="size-4" />}
                {downloading ? "A gerar PDF..." : "Descarregar PDF"}
              </Button>
              <Button className="flex-1" onClick={() => window.print()}>
                <Printer className="size-4" />
                Imprimir
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
