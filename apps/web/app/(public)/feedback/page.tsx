"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch, ApiError } from "@/lib/api";
import type { FeedbackInput } from "@dunamis/types";

const CATEGORIES: { key: keyof FeedbackInput; label: string }[] = [
  { key: "registrationRating", label: "Inscrição" },
  { key: "transportRating", label: "Transportes" },
  { key: "checkInRating", label: "Check-in" },
  { key: "discipleshipRating", label: "Estudos bíblicos da manhã (discipulado)" },
  { key: "worshipRating", label: "Cultos" },
  { key: "preachingRating", label: "Pregações" },
  { key: "activitiesRating", label: "Atividades recreativas" },
  { key: "musicRating", label: "Música, bandas e concertos" },
  { key: "foodRating", label: "Alimentação" },
  { key: "accommodationRating", label: "Alojamento" },
];

function StarRating({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star
            className={`size-6 transition-colors ${
              value && n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [ratings, setRatings] = useState<Partial<Record<keyof FeedbackInput, number>>>({});
  const [comments, setComments] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setRating(key: keyof FeedbackInput, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: FeedbackInput = {
        ...ratings,
        comments: comments.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
      };
      await apiFetch("/feedback", { method: "POST", body: JSON.stringify(payload) });
      setSubmitted(true);
      toast.success("Obrigado pelo seu feedback!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar o feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <MessageCircleHeart className="mb-4 size-12 text-primary" aria-hidden />
        <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Obrigado pelo seu feedback!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A sua opinião ajuda-nos a tornar o próximo DUNAMIS ainda melhor.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-center font-display text-3xl tracking-wide text-dunamis-green">
        Dê-nos o seu feedback
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Como foi a sua experiência no DUNAMIS? Avalie o que quiser — pode deixar em branco o que não se aplica.
      </p>

      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="text-xl">A sua avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="font-normal">{cat.label}</Label>
                  <StarRating value={ratings[cat.key]} onChange={(v) => setRating(cat.key, v)} />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comentários (o que mais achou importante, sugestões, etc.)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Escreva aqui o que quiser partilhar..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome (opcional)</Label>
                <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email (opcional)</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? "A enviar..." : "Enviar feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
