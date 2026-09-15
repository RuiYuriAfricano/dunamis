"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Download, FileText, History, LogIn, LogOut, Pencil, PencilLine, ScanLine, Trash2, UserPlus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { ParticipantHistoryDialog } from "@/components/admin/participant-history-dialog";
import { useSession } from "@/lib/use-session";
import { apiFetch, API_URL, paymentProofUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  MaritalStatus,
  MovementType,
  OccupationStatus,
  PaymentStatus,
  type ParticipantSummary,
  type TransportStopSummary,
} from "@dunamis/types";

const TRI_STATE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

type ExportFilter = "all" | "pending" | "sponsored-valued" | "sponsored-guests";

const EXPORT_FILTER_OPTIONS: { value: ExportFilter; label: string }[] = [
  { value: "all", label: "Todos os inscritos" },
  { value: "pending", label: "Pagamentos pendentes" },
  { value: "sponsored-valued", label: "Patrocínios com valor" },
  { value: "sponsored-guests", label: "Convidados (patrocínio sem valor)" },
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
  occupationStatus: string;
  baptized: string;
  maritalStatus: string;
  bringingChildren: string;
  transportRequired: string;
  tentRequired: string;
  mattressRequired: string;
  wantsToBuyTent: string;
  wantsToBuyMattress: string;
  isSponsored: string;
  checkedIn: string;
  insideVenue: string;
  paymentStatus: string;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  gender: "all",
  transportStopId: "all",
  firstTime: "all",
  isMemberTibl: "all",
  occupationStatus: "all",
  baptized: "all",
  maritalStatus: "all",
  bringingChildren: "all",
  transportRequired: "all",
  tentRequired: "all",
  mattressRequired: "all",
  wantsToBuyTent: "all",
  wantsToBuyMattress: "all",
  isSponsored: "all",
  checkedIn: "all",
  insideVenue: "all",
  paymentStatus: "all",
};

const MARITAL_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: MaritalStatus.SINGLE, label: "Solteiro(a)" },
  { value: MaritalStatus.MARRIED, label: "Casado(a)" },
];

const OCCUPATION_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: OccupationStatus.STUDENT, label: "Estudante" },
  { value: OccupationStatus.WORKER, label: "Trabalhador(a)" },
];

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
  const [exportFilter, setExportFilter] = useState<ExportFilter>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingParticipant, setRejectingParticipant] = useState<ParticipantSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);
  const [editingBelongingsId, setEditingBelongingsId] = useState<string | null>(null);
  const [belongingsDraft, setBelongingsDraft] = useState("");
  const [savingBelongings, setSavingBelongings] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [recordingMovementId, setRecordingMovementId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TransportStopSummary[]>("/transport-stops").then(setStops);
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.gender !== "all") params.set("gender", filters.gender);
    if (filters.transportStopId !== "all") params.set("transportStopId", filters.transportStopId);
    if (filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
    if (filters.maritalStatus !== "all") params.set("maritalStatus", filters.maritalStatus);
    if (filters.occupationStatus !== "all") params.set("occupationStatus", filters.occupationStatus);
    for (const key of [
      "firstTime",
      "isMemberTibl",
      "baptized",
      "bringingChildren",
      "transportRequired",
      "tentRequired",
      "mattressRequired",
      "wantsToBuyTent",
      "wantsToBuyMattress",
      "isSponsored",
      "checkedIn",
      "insideVenue",
    ] as const) {
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
      const query = exportFilter === "all" ? "" : `?filter=${exportFilter}`;
      const response = await fetch(`${API_URL}/participants/export.xlsx${query}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filenames: Record<ExportFilter, string> = {
        all: "dunamis-inscritos.xlsx",
        pending: "dunamis-pagamentos-pendentes.xlsx",
        "sponsored-valued": "dunamis-patrocinios-com-valor.xlsx",
        "sponsored-guests": "dunamis-convidados.xlsx",
      };
      link.download = filenames[exportFilter];
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function reviewPayment(id: string, status: "CONFIRMED" | "REJECTED", reason?: string) {
    if (!session) return;
    setReviewingId(id);
    try {
      const updated = await apiFetch<ParticipantSummary>(`/participants/${id}/payment-status`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify(status === "REJECTED" ? { status, reason } : { status }),
      });
      setData((prev) =>
        prev ? { ...prev, data: prev.data.map((p) => (p.id === id ? updated : p)) } : prev,
      );
    } finally {
      setReviewingId(null);
    }
  }

  function openRejectDialog(p: ParticipantSummary) {
    setRejectingParticipant(p);
    setRejectionReason("");
    setRejectionReasonError(null);
  }

  async function confirmReject() {
    if (!rejectingParticipant) return;
    if (!rejectionReason.trim()) {
      setRejectionReasonError("Indique o motivo da rejeição.");
      return;
    }
    await reviewPayment(rejectingParticipant.id, "REJECTED", rejectionReason.trim());
    setRejectingParticipant(null);
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

  async function handleDownloadComprovativo(p: ParticipantSummary) {
    if (!session) return;
    setDownloadingId(p.id);
    try {
      const response = await fetch(`${API_URL}/participants/${p.id}/comprovativo.pdf`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${p.registrationNumber}-comprovativo.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível descarregar o comprovativo.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleCheckIn(p: ParticipantSummary) {
    if (!session) return;
    setCheckingInId(p.id);
    try {
      await apiFetch(`/check-in/by-id/${p.id}`, { method: "POST", token: session.accessToken });
      setData((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((row) =>
                row.id === p.id
                  ? { ...row, checkedIn: true, checkedInAt: new Date().toISOString(), insideVenue: true }
                  : row,
              ),
            }
          : prev,
      );
      toast.success("Check-in feito.");
    } catch {
      toast.error("Não foi possível fazer o check-in.");
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleRecordMovement(p: ParticipantSummary) {
    if (!session) return;
    const type = p.insideVenue ? MovementType.EXIT : MovementType.ENTRY;
    setRecordingMovementId(p.id);
    try {
      await apiFetch(`/check-in/by-id/${p.id}/movement`, {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({ type }),
      });
      setData((prev) =>
        prev
          ? { ...prev, data: prev.data.map((row) => (row.id === p.id ? { ...row, insideVenue: !row.insideVenue } : row)) }
          : prev,
      );
      toast.success(type === MovementType.EXIT ? "Saída registada." : "Entrada registada.");
    } catch {
      toast.error("Não foi possível registar o movimento.");
    } finally {
      setRecordingMovementId(null);
    }
  }

  async function handleDelete(p: ParticipantSummary) {
    if (!session) return;
    if (!window.confirm(`Tem a certeza que quer eliminar a inscrição de ${p.fullName}? Esta ação pode ser revertida apenas pela equipa técnica.`)) {
      return;
    }
    setDeletingId(p.id);
    try {
      await apiFetch(`/participants/${p.id}`, { method: "DELETE", token: session.accessToken });
      setData((prev) =>
        prev
          ? { ...prev, data: prev.data.filter((row) => row.id !== p.id), total: prev.total - 1 }
          : prev,
      );
      toast.success("Inscrição eliminada.");
    } catch {
      toast.error("Não foi possível eliminar a inscrição.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const canEdit = session?.role === "ADMIN";

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Inscritos</h1>
          <p className="text-sm text-muted-foreground">{data ? `${data.total} inscrito(s)` : "A carregar..."}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canEdit && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/admin/participantes/novo" />}
            >
              <UserPlus className="size-4" />
              Registar manualmente
            </Button>
          )}
          <Select value={exportFilter} onValueChange={(v) => setExportFilter(v as ExportFilter)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full sm:w-auto" onClick={handleExport} disabled={exporting}>
            {exporting && <Spinner />}
            {exporting ? "A exportar..." : "Exportar Excel"}
          </Button>
        </div>
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

        <Select value={filters.maritalStatus} onValueChange={(v) => updateFilter("maritalStatus", v ?? "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Estado civil">
              {(value: string) =>
                `Estado civil: ${MARITAL_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? "Todos"}`
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                Estado civil: {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.occupationStatus} onValueChange={(v) => updateFilter("occupationStatus", v ?? "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Estudante/Trabalhador">
              {(value: string) =>
                `Ocupação: ${OCCUPATION_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? "Todos"}`
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {OCCUPATION_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                Ocupação: {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(
          [
            ["firstTime", "Primeira vez"],
            ["isMemberTibl", "Membro TIBL"],
            ["baptized", "Baptizado"],
            ["bringingChildren", "Leva filhos"],
            ["transportRequired", "Transporte"],
            ["tentRequired", "Tenda"],
            ["mattressRequired", "Colchão"],
            ["wantsToBuyTent", "Compra tenda"],
            ["wantsToBuyMattress", "Compra colchão"],
            ["isSponsored", "Patrocinado"],
            ["checkedIn", "Check-in"],
            ["insideVenue", "Está no local"],
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
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Data de Inscrição</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Nome</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Idade</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Igreja</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Membro TIBL</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Ocupação</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Baptizado</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">1ª vez</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Estado Civil</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Filhos</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Telefone</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">WhatsApp</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Email</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Alérgico a</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Transporte</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Tenda</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Colchão</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Patrocinado</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Pagamento</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Check-in</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Está no local</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Pertences</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={24} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />A carregar inscritos...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={24} className="py-8 text-center text-muted-foreground">
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
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
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
                      <Badge variant={p.occupationStatus === "WORKER" ? "default" : "secondary"}>
                        {p.occupationStatus === "WORKER" ? "Trabalhador(a)" : "Estudante"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={p.baptized ? "default" : "secondary"}>{p.baptized ? "Sim" : "Não"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.firstTime ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-sm">
                      {p.maritalStatus === "MARRIED" ? "Casado(a)" : p.maritalStatus === "SINGLE" ? "Solteiro(a)" : "-"}
                    </TableCell>
                    <TableCell className="text-sm">{p.bringingChildren ? `Sim (${p.numberOfChildren})` : "Não"}</TableCell>
                    <TableCell className="text-sm">{p.phone}</TableCell>
                    <TableCell className="text-sm">{p.whatsapp}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.allergicTo || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {p.transportStop ? (
                        <p>{p.transportStop.name}</p>
                      ) : p.ownTransportType ? (
                        <>
                          <p>{p.ownTransportType === "INDIVIDUAL" ? "Transporte individual" : "Táxi"}</p>
                          {p.ownTransportType === "INDIVIDUAL" && (
                            <p className="text-xs text-muted-foreground">
                              {p.carSeats} lugares · {p.carRouteStops}
                            </p>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{p.tentRequired ? "Sim" : "Não"}</p>
                      {!p.tentRequired && p.tentsCanProvide > 0 && (
                        <p className="text-xs text-muted-foreground">Disponibiliza {p.tentsCanProvide}</p>
                      )}
                      {p.wantsToBuyTent && (
                        <p className="text-xs text-muted-foreground">
                          Compra {p.tentPurchaseQuantity}x {p.tentPurchaseType?.name ?? "tenda"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{p.mattressRequired ? "Sim" : "Não"}</p>
                      {!p.mattressRequired && p.mattressesCanProvide > 0 && (
                        <p className="text-xs text-muted-foreground">Disponibiliza {p.mattressesCanProvide}</p>
                      )}
                      {p.wantsToBuyMattress && (
                        <p className="text-xs text-muted-foreground">Compra {p.mattressPurchaseQuantity}x colchão</p>
                      )}
                    </TableCell>
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
                        {p.paymentStatus === PaymentStatus.REJECTED && p.paymentRejectionReason && (
                          <p className="text-xs text-destructive">Motivo: {p.paymentRejectionReason}</p>
                        )}
                        {p.paidInHand !== null && (
                          <p className="text-xs text-muted-foreground">{p.paidInHand ? "Pago em mão" : "Não foi em mão"}</p>
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
                        {canEdit && p.paymentStatus === PaymentStatus.PENDING && (
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
                              onClick={() => openRejectDialog(p)}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge variant={p.checkedIn ? "default" : "secondary"}>
                          {p.checkedIn ? "Feito" : "Pendente"}
                        </Badge>
                        {!p.checkedIn && p.paymentStatus === PaymentStatus.CONFIRMED && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            disabled={checkingInId === p.id}
                            onClick={() => handleCheckIn(p)}
                          >
                            {checkingInId === p.id ? <Spinner className="size-3" /> : <ScanLine className="size-3" />}
                            Fazer check-in
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.checkedIn ? (
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={p.insideVenue ? "default" : "secondary"}>
                            {p.insideVenue ? "Dentro" : "Fora"}
                          </Badge>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            disabled={recordingMovementId === p.id}
                            onClick={() => handleRecordMovement(p)}
                          >
                            {recordingMovementId === p.id ? (
                              <Spinner className="size-3" />
                            ) : p.insideVenue ? (
                              <LogOut className="size-3" />
                            ) : (
                              <LogIn className="size-3" />
                            )}
                            {p.insideVenue ? "Registar saída" : "Registar entrada"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => startEditingBelongings(p)}
                              className="shrink-0 text-muted-foreground hover:text-primary"
                              aria-label="Editar pertences"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 px-2"
                            nativeButton={false}
                            render={<Link href={`/admin/participantes/${p.id}/editar`} />}
                            aria-label="Editar inscrição"
                          >
                            <PencilLine className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 px-2"
                          disabled={downloadingId === p.id}
                          onClick={() => handleDownloadComprovativo(p)}
                          aria-label="Baixar comprovativo"
                        >
                          {downloadingId === p.id ? <Spinner className="size-3" /> : <Download className="size-3.5" />}
                        </Button>
                        {session && (
                          <ParticipantHistoryDialog
                            participantId={p.id}
                            token={session.accessToken}
                            trigger={
                              <Button size="xs" variant="outline" className="h-7 px-2" aria-label="Ver histórico">
                                <History className="size-3.5" />
                              </Button>
                            }
                          />
                        )}
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 border-destructive/40 px-2 text-destructive hover:bg-destructive/10"
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p)}
                            aria-label="Eliminar inscrição"
                          >
                            {deletingId === p.id ? <Spinner className="size-3" /> : <Trash2 className="size-3.5" />}
                          </Button>
                        )}
                      </div>
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

      <Dialog
        open={!!rejectingParticipant}
        onOpenChange={(open) => {
          if (!open) setRejectingParticipant(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar pagamento</DialogTitle>
            <DialogDescription>
              {rejectingParticipant && `Indique o motivo da rejeição para ${rejectingParticipant.fullName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value.trim()) setRejectionReasonError(null);
              }}
              placeholder="Ex.: Valor não corresponde, comprovativo ilegível..."
              rows={3}
            />
            {rejectionReasonError && <p className="text-sm text-destructive">{rejectionReasonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingParticipant(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={reviewingId === rejectingParticipant?.id}
              onClick={confirmReject}
            >
              {reviewingId === rejectingParticipant?.id && <Spinner />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
