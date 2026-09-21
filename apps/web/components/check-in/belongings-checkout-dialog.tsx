"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BelongingsCheckoutDialog({
  open,
  onOpenChange,
  belongings,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  belongings: string | null | undefined;
  submitting: boolean;
  onConfirm: (belongingsOk: boolean, notes: string) => void;
}) {
  const [belongingsOk, setBelongingsOk] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setBelongingsOk(null);
      setNotes("");
    }
  }, [open]);

  function handleConfirm() {
    if (belongingsOk === null) return;
    if (!belongingsOk && !notes.trim()) return;
    onConfirm(belongingsOk, notes.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificar pertences antes da saída</DialogTitle>
          <DialogDescription>Confira as malas/pastas com o que foi registado no check-in.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Pertences registados</p>
            <p>{belongings || "Nenhum pertence registado."}</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={belongingsOk === true ? "default" : "outline"}
              className={cn("flex-1", belongingsOk === true && "border-emerald-500")}
              onClick={() => setBelongingsOk(true)}
            >
              <CheckCircle2 className="size-4" />
              Tudo OK
            </Button>
            <Button
              type="button"
              variant={belongingsOk === false ? "default" : "outline"}
              className={cn("flex-1", belongingsOk === false && "bg-destructive text-white hover:bg-destructive/90")}
              onClick={() => setBelongingsOk(false)}
            >
              <TriangleAlert className="size-4" />
              Falta algo
            </Button>
          </div>

          {belongingsOk === false && (
            <div className="animate-in fade-in slide-in-from-top-1 space-y-1.5 duration-200">
              <Label htmlFor="missing-notes">O que está em falta?</Label>
              <Textarea
                id="missing-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Falta o carregador de telemóvel"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || belongingsOk === null || (belongingsOk === false && !notes.trim())}
          >
            {submitting && <Spinner />}
            Confirmar saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
