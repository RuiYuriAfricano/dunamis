"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { generateRegistrationPdf } from "@/lib/generate-registration-pdf";
import type { ParticipantConfirmation } from "@dunamis/types";

export function ConfirmationCard({ confirmation }: { confirmation: ParticipantConfirmation }) {
  const [downloading, setDownloading] = useState(false);

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
          Inscrição confirmada!
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
            {confirmation.paymentAmount.toLocaleString("pt-PT")} Kz
          </p>
          <p>
            <span className="text-muted-foreground">Comprovativo: </span>
            recebido ✓
          </p>
        </div>

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
      </CardContent>
    </Card>
  );
}
