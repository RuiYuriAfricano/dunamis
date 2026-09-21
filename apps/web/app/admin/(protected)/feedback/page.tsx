"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star, MessageSquareText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { useSession } from "@/lib/use-session";
import { apiFetch } from "@/lib/api";
import type { FeedbackEntry, FeedbackInput } from "@dunamis/types";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--dunamis-green)",
];

const CATEGORIES: { key: keyof FeedbackInput; label: string }[] = [
  { key: "registrationRating", label: "Inscrição" },
  { key: "transportRating", label: "Transportes" },
  { key: "checkInRating", label: "Check-in" },
  { key: "discipleshipRating", label: "Discipulado" },
  { key: "worshipRating", label: "Cultos" },
  { key: "preachingRating", label: "Pregações" },
  { key: "activitiesRating", label: "Atividades" },
  { key: "musicRating", label: "Música/Bandas" },
  { key: "foodRating", label: "Alimentação" },
  { key: "accommodationRating", label: "Alojamento" },
];

function MiniStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`size-3 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const session = useSession();
  const [entries, setEntries] = useState<FeedbackEntry[] | null>(null);

  useEffect(() => {
    if (!session) return;
    apiFetch<FeedbackEntry[]>("/feedback", { token: session.accessToken }).then(setEntries);
  }, [session]);

  const categoryStats = useMemo(() => {
    if (!entries) return [];
    return CATEGORIES.map((cat) => {
      const values = entries.map((e) => e[cat.key]).filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
      return { label: cat.label, avg: Number(avg.toFixed(2)), count: values.length };
    });
  }, [entries]);

  const overallAvg = useMemo(() => {
    if (!entries) return 0;
    const all = entries.flatMap((e) => CATEGORIES.map((c) => e[c.key]).filter((v): v is number => typeof v === "number"));
    return all.length ? all.reduce((a, v) => a + v, 0) / all.length : 0;
  }, [entries]);

  const withComments = entries?.filter((e) => e.comments && e.comments.trim().length > 0) ?? [];
  const withContact = entries?.filter((e) => e.contactName || e.contactEmail) ?? [];

  if (!session || !entries) {
    return <PageLoading label="A carregar feedback..." />;
  }

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Feedback</h1>
        <p className="text-sm text-muted-foreground">{entries.length} resposta(s) recebida(s)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-1 border-none bg-primary/10 py-3">
          <CardHeader className="px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de respostas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-primary">{entries.length}</CardContent>
        </Card>
        <Card className="gap-1 border-none bg-dunamis-green/10 py-3">
          <CardHeader className="px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Média geral</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 px-4 text-2xl font-bold text-dunamis-green">
            {overallAvg.toFixed(1)}
            <Star className="size-5 fill-dunamis-green text-dunamis-green" aria-hidden />
          </CardContent>
        </Card>
        <Card className="gap-1 border-none bg-chart-3/10 py-3">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquareText className="size-3.5" aria-hidden />
              Com comentários
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-chart-3">{withComments.length}</CardContent>
        </Card>
        <Card className="gap-1 border-none bg-chart-1/10 py-3">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Mail className="size-3.5" aria-hidden />
              Deixaram contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-bold text-chart-1">{withContact.length}</CardContent>
        </Card>
      </div>

      <Card className="animate-in fade-in duration-700">
        <CardHeader>
          <CardTitle>Média por área</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ainda sem respostas.</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} allowDecimals tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${value} ★ (${(item?.payload as { count: number })?.count ?? 0} respostas)`,
                      "Média",
                    ]}
                  />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {categoryStats.map((entry, i) => (
                      <Cell key={entry.label} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-in fade-in duration-700">
        <CardHeader>
          <CardTitle>Todas as respostas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Ainda sem respostas.</p>}
          {[...entries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((entry) => {
              const rated = CATEGORIES.filter((c) => typeof entry[c.key] === "number");
              return (
                <div key={entry.id} className="rounded-lg border p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {(entry.contactName || entry.contactEmail) && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {entry.contactName}
                        {entry.contactName && entry.contactEmail && " · "}
                        {entry.contactEmail}
                      </p>
                    )}
                  </div>

                  {rated.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5">
                      {rated.map((c) => (
                        <span key={c.key} className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">{c.label}:</span>
                          <MiniStars value={entry[c.key] as number} />
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.comments && <p className="text-sm text-foreground">{entry.comments}</p>}
                  {rated.length === 0 && !entry.comments && (
                    <p className="text-sm text-muted-foreground italic">Sem avaliações nem comentários.</p>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
