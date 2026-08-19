export const SESSION_COOKIE = "dunamis_session";

export interface Session {
  accessToken: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
}

export function setSession(session: Session) {
  const value = encodeURIComponent(JSON.stringify(session));
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 12}; SameSite=Lax${secure}`;
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getSession(): Session | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as Session;
  } catch {
    return null;
  }
}
