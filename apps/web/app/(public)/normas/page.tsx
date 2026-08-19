import {
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  Ban,
  BadgeCheck,
  Users,
  PhoneCall,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    icon: BadgeCheck,
    title: "Conduta geral",
    items: [
      "O DUNAMIS é um espaço de comunhão cristã — pede-se respeito mútuo entre todos os participantes, equipa e visitantes.",
      "Cumprimento dos horários das atividades e das indicações da organização e dos coordenadores de área.",
      "Zonas de alojamento organizadas por sexo; não é permitida a permanência de participantes em tendas do sexo oposto.",
    ],
  },
  {
    icon: HeartPulse,
    title: "Saúde e bem-estar",
    items: [
      "Participantes com condições de saúde crónicas ou alergias devem indicá-lo à organização no momento do check-in.",
      "Haverá um ponto de primeiros socorros identificado no recinto durante todo o acampamento.",
      "Recomenda-se levar medicação pessoal necessária, protetor solar e roupa adequada ao clima.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Em caso de emergência",
    items: [
      "Dirija-se de imediato a qualquer membro da equipa de organização, identificável por crachá/colete.",
      "Pontos de encontro e rotas de evacuação estarão sinalizados no recinto e serão comunicados na chegada.",
      "Situações de emergência médica grave serão encaminhadas para a unidade de saúde mais próxima do Kikuxi.",
    ],
  },
  {
    icon: Ban,
    title: "Itens não permitidos",
    items: [
      "Bebidas alcoólicas, substâncias ilícitas, armas ou objetos perfurocortantes não autorizados.",
      "Material inflamável ou pirotécnico fora do controlo da organização.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Check-in e identificação",
    items: [
      "A entrada no recinto é feita mediante apresentação do QR Code (impresso ou no telemóvel) recebido na inscrição.",
      "O QR Code é pessoal e intransmissível — cada participante deve efetuar o seu próprio check-in.",
      "Equipas de segurança e organização estarão presentes nos pontos de acesso durante todo o evento.",
    ],
  },
  {
    icon: Users,
    title: "Participantes menores de idade",
    items: [
      "Menores de idade devem ter autorização do encarregado de educação e um contacto de responsável indicado na inscrição ou no check-in.",
      "A supervisão de menores é partilhada entre a organização e os líderes/responsáveis de cada igreja ou grupo.",
    ],
  },
];

export default function NormasPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 duration-500">
        <ShieldCheck className="size-8 shrink-0 text-primary" aria-hidden />
        <h1 className="font-display text-2xl tracking-wide text-dunamis-green sm:text-3xl">
          Normas e procedimentos de segurança
        </h1>
      </div>
      <p className="animate-in fade-in slide-in-from-bottom-2 mt-4 max-w-2xl text-muted-foreground delay-75 duration-500 fill-mode-both">
        Para que o DUNAMIS seja um tempo seguro e proveitoso para todos, pedimos a leitura destas
        normas antes do evento. Este documento será revisto e atualizado pela organização — a
        versão final será também partilhada no dia da inscrição no recinto.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section, i) => (
          <Card
            key={section.title}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="size-4 text-primary" aria-hidden />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="size-4 text-primary" aria-hidden />
            Contacto de emergência durante o evento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O contacto da coordenação de segurança do DUNAMIS será divulgado no comprovativo de
          inscrição e afixado nos pontos de acesso ao recinto.
        </CardContent>
      </Card>
    </div>
  );
}
