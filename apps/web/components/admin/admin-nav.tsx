"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { useSession } from "@/lib/use-session";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/participantes", label: "Inscritos" },
  { href: "/check-in", label: "Check-in" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  function logout() {
    clearSession();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="animate-in fade-in slide-in-from-top-2 border-b bg-background duration-500">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo-dunamis-new.png" alt="DUNAMIS" width={621} height={278} className="h-7 w-auto" />
          <span className="h-5 w-px bg-border" aria-hidden />
          <Image
            src="/logo-manancial.png"
            alt="Culto Manancial"
            width={856}
            height={226}
            className="hidden h-5 w-auto opacity-70 sm:block"
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname.startsWith(link.href)
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            Ver site
          </Link>
          {session && (
            <span className="hidden text-muted-foreground sm:inline">{session.name}</span>
          )}
          <Button size="sm" variant="outline" onClick={logout}>
            Sair
          </Button>
        </nav>
      </div>
    </header>
  );
}
