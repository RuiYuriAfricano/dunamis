"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Banknote, BedSingle, CheckCircle2, ScanLine, Tent, Trash2, UserPlus, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { useSession } from "@/lib/use-session";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@dunamis/types";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--dunamis-green)",
];

const CARD_THEME = [
  { bg: "bg-primary/10", text: "text-primary" },
  { bg: "bg-dunamis-green/10", text: "text-dunamis-green" },
  { bg: "bg-chart-3/10", text: "text-chart-3" },
  { bg: "bg-cross/10", text: "text-cross" },
];

const STAT_CARDS: { key: keyof DashboardStats; label: string }[] = [
  { key: "totalParticipants", label: "Total de inscritos" },
  { key: "totalMale", label: "Homens" },
  { key: "totalFemale", label: "Mulheres" },
  { key: "totalFirstTime", label: "Primeira vez" },
  { key: "totalReturning", label: "Recorrentes" },
  { key: "totalTransportRequired", label: "Com transporte" },
  { key: "totalTentRequired", label: "Precisam de tenda" },
  { key: "totalMattressRequired", label: "Precisam de colchão" },
  { key: "totalCheckedIn", label: "Já fizeram check-in" },
];

function formatDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

export default function DashboardPage() {
  const session = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!session) return;
    apiFetch<DashboardStats>("/stats/dashboard", { token: session.accessToken }).then(setStats);
  }, [session]);

  if (!session || !stats) {
    return <PageLoading label="A carregar o dashboard..." />;
  }

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((card, i) => {
          const theme = CARD_THEME[i % CARD_THEME.length];
          return (
            <Card
              key={card.key}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "animate-in fade-in slide-in-from-bottom-2 gap-1 border-none fill-mode-both py-3 transition-shadow duration-500 hover:shadow-md",
                theme.bg,
              )}
            >
              <CardHeader className="px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent className={cn("px-4 text-2xl font-bold", theme.text)}>
                {stats[card.key] as number}
              </CardContent>
            </Card>
          );
        })}

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-primary/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Banknote className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Total arrecadado</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-primary">
            {stats.totalRevenueKz.toLocaleString("pt-PT")} Kz
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-muted/40 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="truncate text-xs font-medium text-muted-foreground">
              Suas validações
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4 px-4">
            <span className="flex items-center gap-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" aria-hidden />
              {stats.myValidations}
            </span>
            <span className="flex items-center gap-1 text-2xl font-bold text-destructive">
              <XCircle className="size-4" aria-hidden />
              {stats.myRejections}
            </span>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-chart-3/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tent className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Vão comprar tenda</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-chart-3">
            {stats.totalPeopleBuyingTent}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-cross/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BedSingle className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Vão comprar colchão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-cross">
            {stats.totalPeopleBuyingMattress}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-dunamis-green/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserPlus className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Registos manuais seus</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-dunamis-green">
            {stats.myManualRegistrations}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-destructive/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Trash2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Eliminados por si</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-destructive">
            {stats.myDeletions}
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-1 border-none bg-chart-1/10 fill-mode-both py-3 duration-500">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ScanLine className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Check-ins feitos por si</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-chart-1">
            {stats.myCheckIns}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-in fade-in duration-700">
          <CardHeader>
            <CardTitle>Inscritos por paragem de transporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byTransportStop}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stopName" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {stats.byTransportStop.map((entry, i) => (
                      <Cell key={entry.stopName} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in duration-700">
          <CardHeader>
            <CardTitle>Inscritos por faixa etária</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byAgeGroup}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {stats.byAgeGroup.map((entry, i) => (
                      <Cell key={entry.ageGroup} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-in fade-in duration-700">
        <CardHeader>
          <CardTitle>Inscrições ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full text-primary">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.byRegistrationDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(value) => formatDay(String(value))} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "currentColor" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
