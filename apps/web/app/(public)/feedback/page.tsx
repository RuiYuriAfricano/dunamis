"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Star,
  MessageCircleHeart,
  ClipboardList,
  Bus,
  ScanLine,
  BookOpen,
  Church,
  Mic2,
  PartyPopper,
  Music2,
  UtensilsCrossed,
  Tent,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch, ApiError } from "@/lib/api";
import type { FeedbackInput } from "@dunamis/types";

const CATEGORIES: { key: keyof FeedbackInput; label: string; description: string; icon: LucideIcon }[] = [
  {
    key: "registrationRating",
    label: "Inscrição",
    description: "O processo de se inscrever no site, antes do acampamento",
    icon: ClipboardList,
  },
  {
    key: "transportRating",
    label: "Transportes",
    description: "Autocarros e pontos de recolha",
    icon: Bus,
  },
  {
    key: "checkInRating",
    label: "Check-in",
    description: "A chegada e o registo à entrada do acampamento",
    icon: ScanLine,
  },
  {
    key: "discipleshipRating",
    label: "Discipulado da manhã",
    description: "Estudos bíblicos matinais",
    icon: BookOpen,
  },
  {
    key: "worshipRating",
    label: "Cultos",
    description: "Momentos de adoração e culto",
    icon: Church,
  },
  {
    key: "preachingRating",
    label: "Pregações",
    description: "As mensagens e pregadores",
    icon: Mic2,
  },
  {
    key: "activitiesRating",
    label: "Atividades recreativas",
    description: "Jogos e dinâmicas de convívio",
    icon: PartyPopper,
  },
  {
    key: "musicRating",
    label: "Música, bandas e concertos",
    description: "Louvor, bandas e apresentações musicais",
    icon: Music2,
  },
  {
    key: "foodRating",
    label: "Alimentação",
    description: "As refeições servidas no acampamento",
    icon: UtensilsCrossed,
  },
  {
    key: "accommodationRating",
    label: "Alojamento",
    description: "Tendas, colchões e onde dormiu",
    icon: Tent,
  },
];

function StarRating({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          className="rounded-sm p-1 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`size-6 transition-colors sm:size-7 ${
              value && n <= value ? "fill-primary text-primary" : "text-muted-foreground/30"
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

  const answeredCount = Object.keys(ratings).length;

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
        <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <MessageCircleHeart className="size-8 text-primary" aria-hidden />
        </span>
        <h1 className="font-display text-2xl tracking-wide text-dunamis-green">Obrigado pelo seu feedback!</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A sua opinião ajuda-nos a tornar o próximo DUNAMIS ainda melhor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-dunamis-green/5 via-background to-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-primary/10">
            <MessageCircleHeart className="size-7 text-primary" aria-hidden />
          </span>
          <h1 className="font-display text-3xl tracking-wide text-dunamis-green">Dê-nos o seu feedback</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Como foi a sua experiência no DUNAMIS? Avalie cada área com estrelas — pode deixar em branco o que não
            se aplica a si.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="overflow-hidden rounded-2xl border shadow-sm">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.key}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                  i !== 0 ? "border-t" : ""
                } ${i % 2 === 1 ? "bg-muted/20" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <cat.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                </div>
                <div className="pl-12 sm:pl-0">
                  <StarRating value={ratings[cat.key]} onChange={(v) => setRating(cat.key, v)} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {answeredCount === 0
              ? "Ainda não avaliou nenhuma área."
              : `Avaliou ${answeredCount} de ${CATEGORIES.length} áreas.`}
          </p>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="comments">Quer partilhar mais alguma coisa? (opcional)</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Sugestões, elogios, o que achou que podia melhorar..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">O seu nome (opcional)</Label>
                  <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">O seu email (opcional)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O feedback é anónimo — só preencha nome e email se quiser que a organização o possa contactar.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? "A enviar..." : "Enviar feedback"}
          </Button>
        </form>
      </div>
    </div>
  );
}
