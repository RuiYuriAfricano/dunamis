"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
import type { EventSettingsSummary } from "@dunamis/types";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminSettingsPage() {
  const session = useSession();
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<EventSettingsSummary>("/settings")
      .then((settings) => setDeadline(toDatetimeLocalValue(settings.registrationDeadline)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!session) return;
    if (!deadline) {
      toast.error("Indique a data e hora limite.");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<EventSettingsSummary>("/settings", {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({ registrationDeadline: new Date(deadline).toISOString() }),
      });
      setDeadline(toDatetimeLocalValue(updated.registrationDeadline));
      toast.success("Prazo de inscrições atualizado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível guardar o prazo.");
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
        <p className="text-sm text-muted-foreground">Defina até quando as inscrições ficam abertas no site.</p>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <h2 className="font-medium">Prazo de inscrições</h2>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />A carregar...
            </div>
          ) : (
            <>
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
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Spinner />}
                {saving ? "A guardar..." : "Guardar"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
