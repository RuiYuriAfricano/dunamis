import Image from "next/image";
import { RegistrationForm } from "@/components/registration/registration-form";
import { apiFetch } from "@/lib/api";
import { EVENT_DATE_RANGE, EVENT_LOCATION } from "@/lib/event";
import type { TentTypeSummary, TransportStopSummary } from "@dunamis/types";

export const dynamic = "force-dynamic";

export default async function InscricaoPage() {
  const [stops, tentTypes] = await Promise.all([
    apiFetch<TransportStopSummary[]>("/transport-stops"),
    apiFetch<TentTypeSummary[]>("/tent-types"),
  ]);

  return (
    <div className="bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="mb-8 text-center">
          <Image
            src="/cabecalho-inscricao.png"
            alt="Acampamento DUNAMIS"
            width={792}
            height={133}
            priority
            className="mx-auto w-full rounded-xl shadow-sm"
          />
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>📅 {EVENT_DATE_RANGE}</span>
            <span>📍 {EVENT_LOCATION}</span>
          </p>
        </div>
        <RegistrationForm stops={stops} tentTypes={tentTypes} />
      </div>
    </div>
  );
}
