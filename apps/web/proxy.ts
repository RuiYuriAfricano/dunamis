import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, type Session } from "@/lib/auth";

function readSession(request: NextRequest): Session | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as Session;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const session = readSession(request);

  if (!session?.accessToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/check-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/check-in"],
};
