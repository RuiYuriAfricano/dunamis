"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/use-session";
import { apiFetch, API_URL, paymentProofUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PaymentStatus, type ParticipantSummary, type TransportStopSummary } from "@dunamis/types";

const TRI_STATE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: PaymentStatus.PENDING, label: "Pendente" },
  { value: PaymentStatus.CONFIRMED, label: "Confirmado" },
  { value: PaymentStatus.REJECTED, label: "Rejeitado" },
];

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  [PaymentStatus.CONFIRMED]: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  [PaymentStatus.REJECTED]: "border-destructive/30 bg-destructive/10 text-destructive",
};

const PAYMENT_STATUS_ICON: Record<PaymentStatus, typeof Clock> = {
  [PaymentStatus.PENDING]: Clock,
  [PaymentStatus.CONFIRMED]: CheckCircle2,
  [PaymentStatus.REJECTED]: XCircle,
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "Pendente",
  [PaymentStatus.CONFIRMED]: "Confirmado",
  [PaymentStatus.REJECTED]: "Rejeitado",
};

interface Filters {
  search: string;
  gender: string;
  transportStopId: string;
  firstTime: string;
  isMemberTibl: string;
  baptized: string;
  transportRequired: string;
  tentRequired: string;
  mattressRequired: string;
  isSponsored: string;
  checkedIn: string;
  paymentStatus: string;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  gender: "all",
  transportStopId: "all",
  firstTime: "all",
  isMemberTibl: "all",
  baptized: "all",
  transportRequired: "all",
  tentRequired: "all",
  mattressRequired: "all",
  isSponsored: "all",
  checkedIn: "all",
  paymentStatus: "all",
};

const PAGE_SIZE = 25;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function calculateAge(birthDate: string): number {
  const now = new Date();
  const birth = new Date(birthDate);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function ParticipantsPage() {
  const session = useSession();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [stops, setStops] = useState<TransportStopSummary[]>([]);
  const [data, setData] = useState<{ data: ParticipantSummary[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editingBelongingsId, setEditingBelongingsId] = useState<string | null>(null);
  const [belongingsDraft, setBelongingsDraft] = useState("");
  const [savingBelongings, setSavingBelongings] = useState(false);

  useEffect(() => {
    apiFetch<TransportStopSummary[]>("/transport-stops").then(setStops);
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.gender !== "all") params.set("gender", filters.gender);
    if (filters.transportStopId !== "all") params.set("transportStopId", filters.transportStopId);
    if (filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
    for (const key of ["firstTime", "isMemberTibl", "baptized", "transportRequired", "tentRequired", "mattressRequired", "isSponsored", "checkedIn"] as const) {
      if (filters[key] !== "all") params.set(key, filters[key]);
    }
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    apiFetch<{ data: ParticipantSummary[]; total: number }>(`/participants?${queryString}`, {
      token: session.accessToken,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [session, queryString]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExport() {
    if (!session) return;
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/participants/export.xlsx`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dunamis-inscritos.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function reviewPayment(id: string, status: "CONFIRMED" | "REJECTED") {
    if (!session) return;
    setReviewingId(id);
    try {
      const updated = await apiFetch<ParticipantSummary>(`/participants/${id}/payment-status`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({ status }),
      });
      setData((prev) =>
        prev ? { ...prev, data: prev.data.map((p) => (p.id === id ? updated : p)) } : prev,
      );
    } finally {
      setReviewingId(null);
    }
  }

  function startEditingBelongings(p: ParticipantSummary) {
    setEditingBelongingsId(p.id);
    setBelongingsDraft(p.belongings ?? "");
  }

  async function saveBelongings(id: string) {
    if (!session) return;
    setSavingBelongings(true);
    try {
      const updated = await apiFetch<ParticipantSummary>(`/participants/${id}/belongings`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({ belongings: belongingsDraft }),
      });
      setData((prev) =>
        prev ? { ...prev, data: prev.data.map((p) => (p.id === id ? updated : p)) } : prev,
      );
      setEditingBelongingsId(null);
      toast.success("Pertences guardados.");
    } catch {
      toast.error("Não foi possível guardar os pertences.");
    } finally {
      setSavingBelongings(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Inscritos</h1>
          <p className="text-sm text-muted-foreground">{data ? `${data.total} inscrito(s)` : "A carregar..."}</p>
        </div>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting && <Spinner />}
          {exporting ? "A exportar..." : "Exportar Excel"}
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Pesquisar por nome, nº, telefone ou igreja"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="bg-background lg:col-span-2"
        />

        <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v ?? "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Sexo">
              {(value: string) =>
                value === "MALE" ? "Masculino" : value === "FEMALE" ? "Feminino" : "Sexo: Todos"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sexo: Todos</SelectItem>
            <SelectItem value="MALE">Masculino</SelectItem>
            <SelectItem value="FEMALE">Feminino</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.transportStopId}
          onValueChange={(v) => updateFilter("transportStopId", v ?? "all")}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Paragem">
              {(value: string) => stops.find((s) => s.id === value)?.name ?? "Paragem: Todas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Paragem: Todas</SelectItem>
            {stops.map((stop) => (
              <SelectItem key={stop.id} value={stop.id}>
                {stop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.paymentStatus} onValueChange={(v) => updateFilter("paymentStatus", v ?? "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Pagamento">
              {(value: string) =>
                `Pagamento: ${PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? "Todos"}`
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                Pagamento: {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(
          [
            ["firstTime", "Primeira vez"],
            ["isMemberTibl", "Membro TIBL"],
            ["baptized", "Baptizado"],
            ["transportRequired", "Transporte"],
            ["tentRequired", "Tenda"],
            ["mattressRequired", "Colchão"],
            ["isSponsored", "Patrocinado"],
            ["checkedIn", "Check-in"],
          ] as const
        ).map(([key, label]) => (
          <Select key={key} value={filters[key]} onValueChange={(v) => updateFilter(key, v ?? "all")}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={label}>
                {(value: string) =>
                  `${label}: ${TRI_STATE_OPTIONS.find((opt) => opt.value === value)?.label ?? "Todos"}`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TRI_STATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {label}: {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Nº Inscrição</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Nome</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Idade</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Igreja</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Membro TIBL</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Baptizado</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">1ª vez</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Telefone</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">WhatsApp</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Email</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Alérgico a</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Paragem</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Tenda</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Colchão</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Patrocinado</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Pagamento</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Check-in</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Pertences</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={18} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />A carregar inscritos...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={18} className="py-8 text-center text-muted-foreground">
                  Nenhum inscrito encontrado.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              data?.data.map((p) => {
                const StatusIcon = PAYMENT_STATUS_ICON[p.paymentStatus];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.registrationNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(p.fullName)}
                        </span>
                        <div>
                          <p className="font-medium">{p.fullName}</p>
                          <p className="text-xs text-muted-foreground">{p.gender === "MALE" ? "Masculino" : "Feminino"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{calculateAge(p.birthDate)}</TableCell>
                    <TableCell className="text-sm">{p.church}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={p.isMemberTibl ? "default" : "secondary"}>{p.isMemberTibl ? "Sim" : "Não"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={p.baptized ? "default" : "secondary"}>{p.baptized ? "Sim" : "Não"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.firstTime ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-sm">{p.phone}</TableCell>
                    <TableCell className="text-sm">{p.whatsapp}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.allergicTo || "-"}</TableCell>
                    <TableCell className="text-sm">{p.transportStop?.name ?? "-"}</TableCell>
                    <TableCell className="text-sm">{p.tentRequired ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-sm">{p.mattressRequired ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={p.isSponsored ? "default" : "secondary"}>{p.isSponsored ? "Sim" : "Não"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{p.paymentAmount.toLocaleString("pt-PT")} Kz</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              PAYMENT_STATUS_STYLES[p.paymentStatus],
                            )}
                          >
                            <StatusIcon className="size-3" />
                            {PAYMENT_STATUS_LABEL[p.paymentStatus]}
                          </span>
                        </div>
                        {p.paymentReviewedBy && (
                          <p className="text-xs text-muted-foreground">
                            {p.paymentStatus === PaymentStatus.REJECTED ? "Rejeitado" : "Validado"} por{" "}
                            <span className="font-medium text-foreground">{p.paymentReviewedBy.name}</span>
                          </p>
                        )}
                        {p.paymentProofPath ? (
                          <a
                            href={paymentProofUrl(p.paymentProofPath)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                          >
                            <FileText className="size-3" />
                            Ver comprovativo
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {p.isSponsored ? "Sem comprovativo (patrocinado)" : "Sem comprovativo"}
                          </span>
                        )}
                        {p.paymentStatus === PaymentStatus.PENDING && (
                          <div className="flex gap-1.5 pt-0.5">
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-6 border-emerald-500/40 px-2 text-[11px] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                              disabled={reviewingId === p.id}
                              onClick={() => reviewPayment(p.id, "CONFIRMED")}
                            >
                              Validar
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-6 border-destructive/40 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                              disabled={reviewingId === p.id}
                              onClick={() => reviewPayment(p.id, "REJECTED")}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.checkedIn ? "default" : "secondary"}>
                        {p.checkedIn ? "Feito" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-56 text-sm">
                      {editingBelongingsId === p.id ? (
                        <div className="space-y-1.5">
                          <Textarea
                            value={belongingsDraft}
                            onChange={(e) => setBelongingsDraft(e.target.value)}
                            placeholder="Ex.: Telemóvel x1, Mochila x1"
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-1.5">
                            <Button
                              size="xs"
                              className="h-6 px-2 text-[11px]"
                              disabled={savingBelongings}
                              onClick={() => saveBelongings(p.id)}
                            >
                              {savingBelongings && <Spinner className="size-3" />}
                              Guardar
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              disabled={savingBelongings}
                              onClick={() => setEditingBelongingsId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-muted-foreground">{p.belongings || "Sem pertences registados"}</span>
                          <button
                            type="button"
                            onClick={() => startEditingBelongings(p)}
                            className="shrink-0 text-muted-foreground hover:text-primary"
                            aria-label="Editar pertences"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data ? `${data.total} inscrito(s)` : ""}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  );
}
