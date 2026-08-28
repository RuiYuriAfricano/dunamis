import Link from "next/link";
import Image from "next/image";
import { FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  EVENT_DATE_RANGE,
  EVENT_SCHEDULE,
  EVENT_LOCATION,
  EVENT_MEETING_POINT,
  PAYMENT_AMOUNT_STUDENT,
  PAYMENT_AMOUNT_WORKER,
} from "@/lib/event";

const HIGHLIGHTS = [
  "🎵 Música ao vivo",
  "📖 Pregação da Palavra",
  "🌊 Batismos",
  "⚽ Desportos e jogos",
  "🔥 Fogueira",
  "🎨 Arte e cultura",
];

// Deliberately static — the deadline/capacity check only happens where it
// actually gates something, on /inscricao. That keeps this page servable
// from cache instead of blocking every homepage visit on the API (and, on
// the free tiers, on Render/Neon waking up from a cold start).
const infoItems = [
  { label: "Data", value: EVENT_DATE_RANGE, icon: "📅" },
  { label: "Horário", value: EVENT_SCHEDULE, icon: "🕐" },
  { label: "Local", value: EVENT_LOCATION, icon: "📍" },
  { label: "Concentração", value: EVENT_MEETING_POINT, icon: "🚩" },
  {
    label: "Valor da inscrição",
    value: `Estudante: ${PAYMENT_AMOUNT_STUDENT.toLocaleString("pt-PT")} Kz · Trabalhador: ${PAYMENT_AMOUNT_WORKER.toLocaleString("pt-PT")} Kz`,
    icon: "💳",
  },
  { label: "Transporte", value: "Disponibilizado pela organização, com 4 paragens", icon: "🚌" },
  { label: "Alojamento", value: "Tendas e colchões disponíveis mediante inscrição", icon: "⛺" },
];

const FAQ_ITEMS = [
  {
    question: "Como faço a minha inscrição?",
    answer:
      'Basta preencher o formulário de inscrição online na página "Inscrever-me". No final, receberá um número de inscrição e um comprovativo em PDF com o seu QR Code — guarde-os, pois são a sua prova de inscrição.',
  },
  {
    question: "Preciso de transporte, o que faço?",
    answer:
      "No formulário de inscrição indique que precisa de transporte e escolha a paragem mais próxima de si: Nova Vida, Viana, Cidade ou Terceira Igreja Baptista.",
  },
  {
    question: "A organização disponibiliza tenda e colchão?",
    answer:
      "Sim. No formulário de inscrição pode indicar se precisa de tenda e/ou colchão para a organização preparar a quantidade necessária.",
  },
  {
    question: "Como funciona o check-in no dia do evento?",
    answer:
      "Apresente o QR Code recebido na inscrição (no telemóvel ou impresso) à equipa de check-in à entrada do acampamento.",
  },
  {
    question: "Perdi o meu comprovativo de inscrição, e agora?",
    answer:
      'Aceda à página "Consultar inscrição" e introduza o seu número de inscrição e o número de telefone utilizado no registo.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-dunamis-green text-dunamis-green-foreground">
        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col items-start gap-5">
            <Image
              src="/logo-dunamis.png"
              alt="Acampamento DUNAMIS"
              width={438}
              height={170}
              priority
              className="animate-in fade-in slide-in-from-bottom-2 h-16 w-auto duration-700 sm:h-20"
            />
            <p className="animate-in fade-in slide-in-from-bottom-4 max-w-md text-dunamis-green-foreground/80 delay-75 duration-700 fill-mode-both">
              Um acampamento de comunhão, crescimento espiritual e formação, reunindo jovens e
              membros de diferentes igrejas em Kikuxi, Luanda.
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-wrap gap-3 text-sm text-dunamis-green-foreground/80 delay-150 duration-700 fill-mode-both">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                📅 {EVENT_DATE_RANGE}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">📍 {EVENT_LOCATION}</span>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 flex gap-3 delay-200 duration-700 fill-mode-both">
              <Button nativeButton={false} render={<Link href="/inscricao" />} size="lg">
                Inscrever-me
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/consultar" />}
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-dunamis-green-foreground hover:bg-white/10 hover:text-dunamis-green-foreground"
              >
                Já me inscrevi
              </Button>
            </div>
          </div>

          <div className="animate-in fade-in zoom-in-95 flex justify-center delay-150 duration-700 fill-mode-both lg:justify-end">
            <Image
              src="/banner-dunamis.jpg"
              alt="Cartaz do Acampamento DUNAMIS 2026"
              width={630}
              height={771}
              priority
              className="w-56 rotate-2 rounded-xl border-4 border-white/10 shadow-2xl transition-transform duration-500 hover:rotate-0 sm:w-72"
            />
          </div>
        </div>
      </section>

      <section id="sobre" className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="font-display text-2xl tracking-wide text-dunamis-green">Sobre o evento</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          O DUNAMIS é um acampamento cristão interigrejas organizado pelo Ministério Manancial, da
          Terceira Igreja Baptista de Luanda, com o propósito de promover comunhão, crescimento
          espiritual e formação entre jovens e membros de diferentes igrejas. Este ano esperamos
          reunir cerca de 2.000 participantes para dias de convivência, ensino e adoração.
        </p>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Ao longo de 3 dias vais viver música ao vivo, pregações que desafiam e transformam,
          batismos nas águas, desportos, jogos, fogueiras à noite e muito mais — tudo pensado para
          acelerar o teu crescimento espiritual e ampliar os teus horizontes. Não venhas só: traz
          alguém contigo e conhece gente nova.
        </p>
        <div className="mt-5 flex max-w-3xl flex-wrap gap-2 text-sm text-muted-foreground">
          {HIGHLIGHTS.map((item) => (
            <span key={item} className="rounded-full border bg-background px-3 py-1">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-6">
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<a href="/dunamis-prospecto.pdf" target="_blank" rel="noreferrer" />}
          >
            <FileText className="size-4" aria-hidden />
            Ver prospecto completo
          </Button>
        </div>
      </section>

      <section id="video" className="mx-auto w-full max-w-4xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border bg-black shadow-lg">
          <video
            controls
            preload="metadata"
            playsInline
            className="aspect-video w-full"
            aria-label="Vídeo promocional do DUNAMIS"
          >
            <source src="/video-promocional.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      <section id="informacoes" className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl tracking-wide text-dunamis-green">Informações</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {infoItems.map((item) => (
              <Card
                key={item.label}
                className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.value}</CardContent>
              </Card>
            ))}

            <Link href="/normas" className="block">
              <Card className="h-full border-primary/30 bg-primary/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="size-4 text-primary" aria-hidden />
                    Normas e segurança
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-primary underline underline-offset-2">
                  Consultar as normas do DUNAMIS e os procedimentos de segurança →
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <section id="programa" className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="font-display text-2xl tracking-wide text-dunamis-green">Programa</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          O programa completo com os horários das atividades será publicado nesta página antes
          do evento.
        </p>
      </section>

      <section id="localizacao" className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl tracking-wide text-dunamis-green">Localização</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            O acampamento decorre no Kikuxi, Luanda. Mais detalhes sobre o acesso ao local serão
            partilhados aqui e no momento da inscrição.
          </p>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="font-display text-2xl tracking-wide text-dunamis-green">Perguntas frequentes</h2>
        <Accordion className="mt-6">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
