import Image from "next/image";
import { EVENT_PHONE } from "@/lib/event";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 text-center">
        <div className="flex items-center gap-4">
          <Image src="/logo-dunamis.png" alt="DUNAMIS" width={438} height={170} className="h-8 w-auto" />
          <span className="h-6 w-px bg-border" />
          <Image
            src="/logo-manancial.png"
            alt="Culto Manancial"
            width={856}
            height={226}
            className="h-6 w-auto opacity-80"
          />
          <span className="h-6 w-px bg-border" />
          <Image
            src="/logo-tibl.png"
            alt="Terceira Igreja Baptista de Luanda"
            width={992}
            height={992}
            className="h-9 w-9 rounded-full opacity-90"
          />
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          O DUNAMIS é uma iniciativa do <span className="font-medium text-foreground">Ministério Manancial</span>,
          da <span className="font-medium text-foreground">Terceira Igreja Baptista de Luanda</span>.
        </p>
        <p className="text-xs text-muted-foreground">Contacto: {EVENT_PHONE}</p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Terceira Igreja Baptista de Luanda — DUNAMIS
        </p>
      </div>
    </footer>
  );
}
