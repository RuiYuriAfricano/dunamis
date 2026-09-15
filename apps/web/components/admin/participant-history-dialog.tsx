"use client";

import { useEffect, useState, type ReactElement } from "react";
import { LogIn, LogOut, Pencil, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { MovementType, type MovementLogEntry, type ParticipantEditLogEntry } from "@dunamis/types";

const FIELD_LABELS: Record<string, string> = {
  fullName: "Nome completo",
  gender: "Sexo",
  birthDate: "Data de nascimento",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  email: "Email",
  church: "Igreja",
  isMemberTibl: "Membro TIBL",
  occupationStatus: "Estudante/Trabalhador",
  baptized: "Baptizado",
  allergicTo: "Alérgico a",
  firstTime: "Primeira vez",
  maritalStatus: "Estado civil",
  bringingChildren: "Leva filhos",
  numberOfChildren: "Nº de filhos",
  transportRequired: "Transporte da organização",
  transportStopId: "Paragem",
  ownTransportType: "Transporte próprio",
  carSeats: "Lugares no carro",
  carRouteStops: "Paragens no trajeto",
  tentRequired: "Precisa de tenda",
  mattressRequired: "Precisa de colchão",
  tentsCanProvide: "Tendas que pode disponibilizar",
  mattressesCanProvide: "Colchões que pode disponibilizar",
  wantsToBuyTent: "Quer comprar tenda",
  tentPurchaseTypeId: "Tipo de tenda comprada",
  tentPurchaseQuantity: "Qtd. tendas compradas",
  wantsToBuyMattress: "Quer comprar colchão",
  mattressPurchaseQuantity: "Qtd. colchões comprados",
  isSponsored: "Patrocinado",
  paidInHand: "Pago em mão",
  paymentAmount: "Valor pago",
  paymentProofPath: "Comprovativo",
  paymentStatus: "Estado do pagamento",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rejeitado",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value === true) return "Sim";
  if (value === false) return "Não";
  if (field === "paymentStatus" && typeof value === "string") {
    return PAYMENT_STATUS_LABELS[value] ?? value;
  }
  if (field === "occupationStatus") {
    return value === "WORKER" ? "Trabalhador" : "Estudante";
  }
  return String(value);
}

export function ParticipantHistoryDialog({
  participantId,
  token,
  trigger,
}: {
  participantId: string;
  token: string;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<MovementLogEntry[] | null>(null);
  const [edits, setEdits] = useState<ParticipantEditLogEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      apiFetch<MovementLogEntry[]>(`/participants/${participantId}/movements`, { token }),
      apiFetch<ParticipantEditLogEntry[]>(`/participants/${participantId}/edit-history`, { token }),
    ])
      .then(([m, e]) => {
        setMovements(m);
        setEdits(e);
      })
      .finally(() => setLoading(false));
  }, [open, participantId, token]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col gap-4 sm:max-w-lg">
        <DialogTitle>Histórico</DialogTitle>
        <Tabs defaultValue="movements">
          <TabsList>
            <TabsTrigger value="movements">Entradas/Saídas</TabsTrigger>
            <TabsTrigger value="edits">Edições</TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="mt-3 max-h-[55vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {!loading && movements?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem registos de entrada/saída.</p>
            )}
            {!loading && movements && movements.length > 0 && (
              <ul className="space-y-2">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                    {m.type === "CHECK_IN" ? (
                      <ScanLine className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : m.type === MovementType.ENTRY ? (
                      <LogIn className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <LogOut className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    )}
                    <div>
                      <p className="font-medium">
                        {m.type === "CHECK_IN" ? "Check-in inicial" : m.type === MovementType.ENTRY ? "Entrada" : "Saída"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.recordedAt).toLocaleString("pt-PT")} · {m.recordedByName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="edits" className="mt-3 max-h-[55vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {!loading && edits?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem edições registadas.</p>
            )}
            {!loading && edits && edits.length > 0 && (
              <ul className="space-y-3">
                {edits.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-2.5 text-sm">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Pencil className="size-3.5 shrink-0 text-primary" aria-hidden />
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.editedAt).toLocaleString("pt-PT")} · {entry.editedByName}
                      </p>
                    </div>
                    <ul className="space-y-1 pl-6">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-medium text-foreground">{FIELD_LABELS[c.field] ?? c.field}</span>:{" "}
                          <span className="text-muted-foreground line-through">{formatValue(c.field, c.oldValue)}</span>{" "}
                          → <span className="text-foreground">{formatValue(c.field, c.newValue)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
