import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#sobre", label: "Sobre" },
  { href: "/#programa", label: "Programa" },
  { href: "/#localizacao", label: "Localização" },
  { href: "/#faq", label: "FAQ" },
  { href: "/normas", label: "Normas" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-dunamis-new.png" alt="DUNAMIS" width={621} height={278} priority className="h-8 w-auto" />
          <span className="h-6 w-px bg-border" aria-hidden />
          <Image
            src="/logo-manancial.png"
            alt="Culto Manancial"
            width={856}
            height={226}
            className="hidden h-6 w-auto opacity-80 sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <Button nativeButton={false} render={<Link href="/inscricao" />} size="sm">
          Inscrever-me
        </Button>
      </div>
    </header>
  );
}
