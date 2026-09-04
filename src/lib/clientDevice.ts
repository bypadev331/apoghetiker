import { supabase } from "@/integrations/supabase/client";

export type TokenTable =
  | "auth_tokens"
  | "storno_tokens"
  | "limit_tokens"
  | "pin_tokens"
  | "adress_tokens";

const fetchIp = async (): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    const j = await res.json();
    return typeof j?.ip === "string" ? j.ip : null;
  } catch {
    return null;
  }
};

export const recordClientDevice = async (table: TokenTable, id: string) => {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
    const ip = await fetchIp();
    await (supabase as any)
      .from(table)
      .update({ client_ua: ua, client_ip: ip, client_seen_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* silent */
  }
};

const uaShort = (ua: string): string => {
  const os =
    /Windows NT 10/.test(ua) ? "Windows 10/11" :
    /Windows/.test(ua) ? "Windows" :
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android/.test(ua) ? "Android" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "Unbekannt";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
};

export const formatDevice = (ua?: string | null, ip?: string | null): string => {
  const parts: string[] = [];
  if (ua) parts.push(uaShort(ua));
  if (ip) parts.push(`IP ${ip}`);
  return parts.join(" · ") || "—";
};
