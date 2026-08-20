"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageLoading } from "@/components/ui/page-loading";
import { QrScanner } from "@/components/check-in/qr-scanner";
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import type { CheckInLookupResult } from "@dunamis/types";

type ViewState =
  | { status: "scanning" }
  | { status: "loading" }
  | { status: "found"; result: CheckInLookupResult }
  | { status: "confirmed"; result: CheckInLookupResult }
  | { status: "already"; result: CheckInLookupResult }
  | { status: "error"; message: string };

export default function CheckInPage() {
  const router = useRouter();
  const session = useSession();
  const [state, setState] = useState<ViewState>({ status: "scanning" });
  const [confirming, setConfirming] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  async function handleScan(token: string) {
    if (state.status !== "scanning") return;
    setState({ status: "loading" });
    setLastToken(token);

    try {
      const result = await apiFetch<CheckInLookupResult>(`/check-in/lookup/${token}`, {
        token: session?.accessToken,
      });
      setState(result.checkedIn ? { status: "already", result } : { status: "found", result });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof ApiError ? err.message : "Não foi possível ler este QR Code.",
      });
    }
  }

  async function confirm() {
    if (!lastToken || !session) return;
    setConfirming(true);
    try {
      const result = await apiFetch<CheckInLookupResult>(`/check-in/${lastToken}`, {
        method: "POST",
        token: session.accessToken,
      });
      setState({ status: "confirmed", result });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.payload) {
        setState({ status: "already", result: err.payload as CheckInLookupResult });
      } else {
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : "Não foi possível confirmar a entrada.",
        });
      }
    } finally {
      setConfirming(false);
    }
  }

  function reset() {
    setState({ status: "scanning" });
    setLastToken(null);
  }

  if (!session) {
    return <PageLoading label="A validar sessão..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-dunamis-green/5 via-background to-background">
      <header className="flex items-center justify-between bg-dunamis-green px-6 py-3 text-dunamis-green-foreground">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-dunamis.png" alt="DUNAMIS" width={438} height={170} className="h-7 w-auto" />
          <span className="h-5 w-px bg-white/20" aria-hidden />
          <span className="text-sm font-medium text-dunamis-green-foreground/80">Check-in</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-dunamis-green-foreground/80">
          <span className="hidden sm:inline">{session.name}</span>
          {session.role === "ADMIN" && (
            <Link href="/admin/dashboard" className="underline underline-offset-2 hover:text-dunamis-green-foreground">
              Dashboard
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-dunamis-green-foreground hover:bg-white/10 hover:text-dunamis-green-foreground"
            onClick={() => {
              clearSession();
              router.push("/admin/login");
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
        {state.status === "scanning" && (
          <>
            <p className="flex items-center gap-2 text-center font-display text-xl tracking-wide text-dunamis-green">
              <ScanLine className="size-6 text-primary" aria-hidden />
              Aponte a câmara para o QR Code
            </p>
            <div className="w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-black p-1 shadow-lg">
              <QrScanner active onScan={handleScan} />
            </div>
          </>
        )}

        {state.status === "loading" && (
          <p className="flex items-center gap-2 text-lg">
            <Spinner className="size-5" />A verificar...
          </p>
        )}

        {state.status === "found" && (
          <StatusCard tone="emerald" icon={CheckCircle2} title="Participante válido">
            <ParticipantDetails result={state.result} />
            <CardContent className="flex gap-3 pb-6">
              <Button className="flex-1" variant="outline" onClick={reset}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={confirm} disabled={confirming}>
                {confirming && <Spinner />}
                {confirming ? "A confirmar..." : "Confirmar entrada"}
              </Button>
            </CardContent>
          </StatusCard>
        )}

        {state.status === "confirmed" && (
          <StatusCard tone="emerald" icon={CheckCircle2} title="Check-in realizado com sucesso">
            <ParticipantDetails result={state.result} />
            <CardContent className="pb-6">
              <Button className="w-full" onClick={reset}>
                Ler próximo
              </Button>
            </CardContent>
          </StatusCard>
        )}

        {state.status === "already" && (
          <StatusCard tone="amber" icon={AlertTriangle} title="Já realizou check-in">
            <ParticipantDetails result={state.result} />
            <CardContent className="space-y-1 pb-6 text-sm text-muted-foreground">
              <p>Data/Hora: {state.result.checkedInAt ? new Date(state.result.checkedInAt).toLocaleString("pt-PT") : "-"}</p>
              <p>Operador: {state.result.checkedInByName ?? "-"}</p>
              <Button className="mt-4 w-full" onClick={reset}>
                Ler próximo
              </Button>
            </CardContent>
          </StatusCard>
        )}

        {state.status === "error" && (
          <StatusCard tone="destructive" icon={XCircle} title="Erro">
            <CardContent className="space-y-4 pt-4 pb-6">
              <p className="text-sm">{state.message}</p>
              <Button className="w-full" onClick={reset}>
                Tentar novamente
              </Button>
            </CardContent>
          </StatusCard>
        )}
      </main>
    </div>
  );
}

const STATUS_TONES = {
  emerald: {
    bar: "from-dunamis-green to-primary",
    header: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  amber: {
    bar: "from-amber-500 to-primary",
    header: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
  },
  destructive: {
    bar: "from-destructive to-destructive/60",
    header: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/30",
  },
} as const;

function StatusCard({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof STATUS_TONES;
  icon: typeof CheckCircle2;
  title: string;
  children: ReactNode;
}) {
  const t = STATUS_TONES[tone];
  return (
    <Card className="w-full animate-in fade-in zoom-in-95 gap-0 overflow-hidden border-none py-0 shadow-lg duration-300">
      <div className={`h-1.5 w-full bg-gradient-to-r ${t.bar}`} aria-hidden />
      <CardHeader className={`gap-1 border-b py-4 ${t.header}`}>
        <CardTitle className={`flex items-center gap-2 font-display text-lg tracking-wide ${t.text}`}>
          <span className={`flex size-8 items-center justify-center rounded-full bg-background ring-2 ${t.ring}`}>
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function ParticipantDetails({ result }: { result: CheckInLookupResult }) {
  return (
    <CardContent className="space-y-3 pt-4 text-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-primary/20">
          {initials(result.fullName)}
        </span>
        <div>
          <p className="text-base font-semibold">{result.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{result.registrationNumber}</p>
        </div>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-muted-foreground">
        <p>Igreja: <span className="text-foreground">{result.church}</span></p>
        <p>Sexo: <span className="text-foreground">{result.gender === "MALE" ? "Masculino" : "Feminino"}</span></p>
        <p>Paragem: <span className="text-foreground">{result.transportStop?.name ?? "-"}</span></p>
      </div>
      <div className="flex gap-2 pt-1">
        <Badge variant={result.tentRequired ? "default" : "secondary"}>
          {result.tentRequired ? "Precisa de tenda" : "Sem tenda"}
        </Badge>
        <Badge variant={result.mattressRequired ? "default" : "secondary"}>
          {result.mattressRequired ? "Precisa de colchão" : "Sem colchão"}
        </Badge>
      </div>
    </CardContent>
  );
}
