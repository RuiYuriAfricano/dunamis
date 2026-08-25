"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { useSession } from "@/lib/use-session";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/participantes", label: "Inscritos" },
  { href: "/check-in", label: "Check-in" },
];

const ADMIN_ONLY_LINKS = [{ href: "/admin/configuracoes", label: "Configurações" }];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = session?.role === "ADMIN" ? [...LINKS, ...ADMIN_ONLY_LINKS] : LINKS;

  function logout() {
    setMenuOpen(false);
    clearSession();
    router.push("/admin/login");
    router.refresh();
  }

  function linkClass(href: string) {
    return pathname.startsWith(href)
      ? "font-semibold text-foreground"
      : "text-muted-foreground transition-colors hover:text-foreground";
  }

  return (
    <header className="animate-in fade-in slide-in-from-top-2 border-b bg-background duration-500">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <Image src="/logo-dunamis-new.png" alt="DUNAMIS" width={621} height={278} className="h-7 w-auto" />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <Image
            src="/logo-manancial.png"
            alt="Culto Manancial"
            width={856}
            height={226}
            className="hidden h-5 w-auto opacity-70 sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            Ver site
          </Link>
          {session && <span className="text-muted-foreground">{session.name}</span>}
          <Button size="sm" variant="outline" onClick={logout}>
            Sair
          </Button>
        </nav>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="animate-in fade-in slide-in-from-top-1 flex flex-col gap-1 border-t px-4 py-3 text-sm duration-200 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-2 py-2.5 ${linkClass(link.href)}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/"
            className="rounded-md px-2 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            Ver site
          </Link>
          {session && <span className="px-2 py-1 text-xs text-muted-foreground">{session.name}</span>}
          <Button size="sm" variant="outline" className="mt-1 w-full" onClick={logout}>
            Sair
          </Button>
        </nav>
      )}
    </header>
  );
}
