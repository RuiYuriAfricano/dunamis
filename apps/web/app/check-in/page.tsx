"use client";

import { useState } from "react";
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
          <Card className="w-full animate-in fade-in zoom-in-95 gap-0 overflow-hidden border-none py-0 shadow-lg duration-300">
            <CardHeader className="gap-1 border-b bg-emerald-500/10 py-4">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                Participante válido
              </CardTitle>
            </CardHeader>
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
          </Card>
        )}

        {state.status === "confirmed" && (
          <Card className="w-full animate-in fade-in zoom-in-95 gap-0 overflow-hidden border-none py-0 shadow-lg duration-300">
            <CardHeader className="gap-1 border-b bg-emerald-500/10 py-4">
              <CardTitle className="flex items-center gap-2 font-display text-lg tracking-wide text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                Check-in realizado com sucesso
              </CardTitle>
            </CardHeader>
            <ParticipantDetails result={state.result} />
            <CardContent className="pb-6">
              <Button className="w-full" onClick={reset}>
                Ler próximo
              </Button>
            </CardContent>
          </Card>
        )}

        {state.status === "already" && (
          <Card className="w-full animate-in fade-in zoom-in-95 gap-0 overflow-hidden border-none py-0 shadow-lg duration-300">
            <CardHeader className="gap-1 border-b bg-amber-500/10 py-4">
              <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-5" />
                Já realizou check-in
              </CardTitle>
            </CardHeader>
            <ParticipantDetails result={state.result} />
            <CardContent className="space-y-1 pb-6 text-sm text-muted-foreground">
              <p>Data/Hora: {state.result.checkedInAt ? new Date(state.result.checkedInAt).toLocaleString("pt-PT") : "-"}</p>
              <p>Operador: {state.result.checkedInByName ?? "-"}</p>
              <Button className="mt-4 w-full" onClick={reset}>
                Ler próximo
              </Button>
            </CardContent>
          </Card>
        )}

        {state.status === "error" && (
          <Card className="w-full animate-in fade-in zoom-in-95 gap-0 overflow-hidden border-none py-0 shadow-lg duration-300">
            <CardHeader className="gap-1 border-b bg-destructive/10 py-4">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <XCircle className="size-5" />
                Erro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 pb-6">
              <p className="text-sm">{state.message}</p>
              <Button className="w-full" onClick={reset}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function ParticipantDetails({ result }: { result: CheckInLookupResult }) {
  return (
    <CardContent className="space-y-1 pt-4 text-sm">
      <p className="text-base font-semibold">{result.fullName}</p>
      <p className="font-mono text-muted-foreground">{result.registrationNumber}</p>
      <p>Igreja: {result.church}</p>
      <p>Sexo: {result.gender === "MALE" ? "Masculino" : "Feminino"}</p>
      <p>Paragem: {result.transportStop?.name ?? "-"}</p>
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
