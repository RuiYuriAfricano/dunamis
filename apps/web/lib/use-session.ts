"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type Session } from "./auth";

export function useSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/admin/login");
      return;
    }
    setSession(current);
  }, [router]);

  return session;
}
