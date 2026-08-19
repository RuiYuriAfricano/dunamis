"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationCard } from "@/components/registration/confirmation-card";
import { apiFetch, ApiError } from "@/lib/api";
import { formatAngolaPhone, stripPhoneMask } from "@/lib/masks";
import type { ParticipantConfirmation } from "@dunamis/types";

const schema = z.object({
  registrationNumber: z.string().min(1, "Indique o número de inscrição."),
  phone: z.string().refine((v) => stripPhoneMask(v).length === 9, "Indique um número de telefone válido (9 dígitos)."),
});

type FormValues = z.infer<typeof schema>;

export default function ConsultarPage() {
  const [result, setResult] = useState<ParticipantConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const confirmation = await apiFetch<ParticipantConfirmation>("/participants/lookup", {
        method: "POST",
        body: JSON.stringify({ ...values, phone: stripPhoneMask(values.phone) }),
      });
      setResult(confirmation);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível consultar a inscrição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-center font-display text-3xl tracking-wide text-dunamis-green">Consultar inscrição</h1>

      {!result && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="text-xl">Introduza os seus dados</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Número de inscrição</Label>
                <Input id="registrationNumber" placeholder="DUN-2026-000001" {...register("registrationNumber")} />
                {errors.registrationNumber && (
                  <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone utilizado na inscrição</Label>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="phone"
                      inputMode="numeric"
                      placeholder="9XX XXX XXX"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(formatAngolaPhone(e.target.value))}
                    />
                  )}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner />}
                {loading ? "A consultar..." : "Consultar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {result && <ConfirmationCard confirmation={result} />}
    </div>
  );
}
