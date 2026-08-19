export function formatAngolaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  return parts.join(" ");
}

export function stripPhoneMask(value: string): string {
  return value.replace(/\D/g, "");
}
