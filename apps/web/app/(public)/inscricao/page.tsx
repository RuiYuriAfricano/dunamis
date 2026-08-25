import Image from "next/image";
import { RegistrationForm } from "@/components/registration/registration-form";
import { apiFetch } from "@/lib/api";
import { EVENT_DATE_RANGE, EVENT_LOCATION } from "@/lib/event";
import type { RegistrationStatusSummary, TentTypeSummary, TransportStopSummary } from "@dunamis/types";

export const dynamic = "force-dynamic";

export default async function InscricaoPage() {
  const [stops, tentTypes, status] = await Promise.all([
    apiFetch<TransportStopSummary[]>("/transport-stops"),
    apiFetch<TentTypeSummary[]>("/tent-types"),
    apiFetch<RegistrationStatusSummary>("/settings/registration-status"),
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
          {status.open && (
            <p className="mt-2 text-sm font-medium text-primary">
              ⏳ Inscrições até{" "}
              {new Date(status.registrationDeadline).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        {status.open ? (
          <RegistrationForm stops={stops} tentTypes={tentTypes} />
        ) : (
          <div className="mx-auto max-w-2xl rounded-xl border bg-muted/30 p-8 text-center">
            <h2 className="font-display text-xl text-dunamis-green">Inscrições encerradas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {status.capacityReached
                ? `O limite de ${status.maxRegistrations.toLocaleString("pt-PT")} inscritos foi atingido.`
                : `O prazo de inscrições terminou a ${new Date(status.registrationDeadline).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.`}{" "}
              Contacte a organização para mais informações.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
