"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#sobre", label: "Sobre" },
  { href: "/#programa", label: "Programa" },
  { href: "/#localizacao", label: "Localização" },
  { href: "/#faq", label: "FAQ" },
  { href: "/normas", label: "Normas" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
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

        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/inscricao" />} size="sm">
            Inscrever-me
          </Button>

          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="animate-in fade-in slide-in-from-top-1 flex flex-col gap-1 border-t px-6 py-3 text-sm duration-200 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
