"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { ConfirmationCard } from "@/components/registration/confirmation-card";
import type { ParticipantConfirmation } from "@dunamis/types";

export default function InscricaoSucessoPage() {
  const [confirmation, setConfirmation] = useState<ParticipantConfirmation | null | undefined>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem("dunamis-confirmation");
    setConfirmation(raw ? (JSON.parse(raw) as ParticipantConfirmation) : null);
  }, []);

  if (confirmation === undefined) {
    return <PageLoading label="A carregar o seu comprovativo..." />;
  }

  if (confirmation === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Sem dados de inscrição</h1>
        <p className="text-muted-foreground">
          Não encontrámos os dados da sua inscrição nesta sessão. Se já se inscreveu, consulte a
          sua inscrição com o número e o telefone utilizados.
        </p>
        <div className="flex gap-3">
          <Button nativeButton={false} render={<Link href="/consultar" />} variant="outline">
            Consultar inscrição
          </Button>
          <Button nativeButton={false} render={<Link href="/inscricao" />}>Inscrever-me</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <ConfirmationCard confirmation={confirmation} />
    </div>
  );
}
