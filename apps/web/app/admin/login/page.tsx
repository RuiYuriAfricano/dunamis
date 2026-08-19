"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QrCode, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch, ApiError } from "@/lib/api";
import { setSession, type Session } from "@/lib/auth";

const schema = z.object({
  email: z.email("Indique um email válido."),
  password: z.string().min(1, "Indique a password."),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users, label: "Gestão centralizada de participantes" },
  { icon: QrCode, label: "Check-in rápido por QR Code" },
  { icon: BarChart3, label: "Estatísticas do acampamento em tempo real" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ accessToken: string; user: Omit<Session, "accessToken"> }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify(values) },
      );

      setSession({ accessToken: response.accessToken, ...response.user });
      router.push(response.user.role === "ADMIN" ? "/admin/dashboard" : "/check-in");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar sessão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col items-center gap-8 overflow-hidden bg-dunamis-green p-10 text-dunamis-green-foreground lg:flex">
        <Image src="/logo-dunamis.png" alt="DUNAMIS" width={438} height={170} className="relative z-10 h-8 w-auto sm:h-9" />

        <div className="relative z-10 flex flex-1 items-center">
          <Image
            src="/banner-dunamis.jpg"
            alt="Cartaz do Acampamento DUNAMIS 2026"
            width={630}
            height={771}
            className="w-72 rounded-xl border-4 border-white/10 shadow-2xl"
          />
        </div>

        <div className="relative z-10 space-y-6">
          <p className="text-center text-sm text-dunamis-green-foreground/70">
            Painel de gestão do acampamento — Ministério Manancial, Terceira Igreja Baptista de Luanda.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.label}
                className="flex items-center justify-center gap-3 text-center text-sm text-dunamis-green-foreground/85"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <feature.icon className="size-4 text-primary" aria-hidden />
                </span>
                {feature.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-muted/30 px-6 py-16">
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border bg-background p-8 shadow-sm duration-500">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar ao site
          </Link>

          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <Image src="/logo-dunamis.png" alt="DUNAMIS" width={438} height={170} className="h-9 w-auto" />
          </div>

          <h1 className="text-center font-display text-2xl tracking-wide text-dunamis-green">Acesso administrativo</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Entre com as suas credenciais para continuar.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="h-11" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" className="h-11" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="h-11 w-full bg-gradient-to-r from-primary to-dunamis-green text-white hover:opacity-90"
              disabled={loading}
            >
              {loading && <Spinner />}
              {loading ? "A entrar..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
