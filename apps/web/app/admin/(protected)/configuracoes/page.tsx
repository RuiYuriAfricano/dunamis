"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
import type { EventSettingsSummary, RegistrationStatusSummary } from "@dunamis/types";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminSettingsPage() {
  const session = useSession();
  const [deadline, setDeadline] = useState("");
  const [maxRegistrations, setMaxRegistrations] = useState("");
  const [priceStudent, setPriceStudent] = useState("");
  const [priceWorker, setPriceWorker] = useState("");
  const [priceSponsored, setPriceSponsored] = useState("");
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<RegistrationStatusSummary>("/settings/registration-status"),
      apiFetch<EventSettingsSummary>("/settings"),
    ])
      .then(([status, settings]) => {
        setDeadline(toDatetimeLocalValue(status.registrationDeadline));
        setMaxRegistrations(String(status.maxRegistrations));
        setRegisteredCount(status.registeredCount);
        setPriceStudent(String(settings.paymentAmountStudent));
        setPriceWorker(String(settings.paymentAmountWorker));
        setPriceSponsored(String(settings.paymentAmountSponsored));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!session) return;
    if (!deadline) {
      toast.error("Indique a data e hora limite.");
      return;
    }
    const limit = parseInt(maxRegistrations, 10);
    if (!limit || limit < 1) {
      toast.error("Indique um limite de inscritos válido.");
      return;
    }
    const student = parseInt(priceStudent, 10);
    const worker = parseInt(priceWorker, 10);
    const sponsored = parseInt(priceSponsored, 10);
    if (!student || student < 1 || !worker || worker < 1 || !sponsored || sponsored < 1) {
      toast.error("Indique valores de inscrição válidos.");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<EventSettingsSummary>("/settings", {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({
          registrationDeadline: new Date(deadline).toISOString(),
          maxRegistrations: limit,
          paymentAmountStudent: student,
          paymentAmountWorker: worker,
          paymentAmountSponsored: sponsored,
        }),
      });
      setDeadline(toDatetimeLocalValue(updated.registrationDeadline));
      setMaxRegistrations(String(updated.maxRegistrations));
      setPriceStudent(String(updated.paymentAmountStudent));
      setPriceWorker(String(updated.paymentAmountWorker));
      setPriceSponsored(String(updated.paymentAmountSponsored));
      toast.success("Configurações atualizadas.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível guardar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  if (session.role !== "ADMIN") {
    return <p className="text-sm text-muted-foreground">Não tem permissão para aceder a esta página.</p>;
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-lg space-y-6 duration-500">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl tracking-wide text-dunamis-green">
          <Settings className="size-6 text-primary" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina até quando e até quantos inscritos o site aceita, e os valores da inscrição.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />A carregar...
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="border-b bg-muted/30 px-6 py-4">
              <h2 className="font-medium">Inscrições</h2>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">Data e hora limite para inscrição</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Depois desta data, o formulário público deixa de aceitar novas inscrições até o prazo ser estendido.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRegistrations">Limite de inscritos</Label>
                <Input
                  id="maxRegistrations"
                  type="number"
                  min={1}
                  value={maxRegistrations}
                  onChange={(e) => setMaxRegistrations(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {registeredCount !== null && `Atualmente ${registeredCount} inscrito(s). `}
                  Ao atingir este número, o formulário público deixa de aceitar novas inscrições. O registo manual
                  feito pela equipa continua disponível para casos excepcionais.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/30 px-6 py-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Banknote className="size-4 text-primary" aria-hidden />
                Valores da inscrição (Kz)
              </h2>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="priceStudent">Estudante</Label>
                <Input
                  id="priceStudent"
                  type="number"
                  min={1}
                  value={priceStudent}
                  onChange={(e) => setPriceStudent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceWorker">Trabalhador(a)</Label>
                <Input
                  id="priceWorker"
                  type="number"
                  min={1}
                  value={priceWorker}
                  onChange={(e) => setPriceWorker(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceSponsored">Patrocinado(a)/bolseiro(a)</Label>
                <Input
                  id="priceSponsored"
                  type="number"
                  min={1}
                  value={priceSponsored}
                  onChange={(e) => setPriceSponsored(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor fixo registado para inscrições patrocinadas, independente do preço de estudante/trabalhador.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </>
      )}
    </div>
  );
}
