import { supabase } from "@/integrations/supabase/client";
import { isBot } from "./botDetect";

let logged = false;
let cachedIp: string | null = null;

async function fetchIp(): Promise<string | null> {
  if (cachedIp) return cachedIp;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json();
    if (typeof j?.ip === "string") { cachedIp = j.ip; return j.ip; }
  } catch {}
  return null;
}

export async function logVisit(path: string): Promise<void> {
  if (logged) return;
  logged = true;
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
    const ref = typeof document !== "undefined" ? document.referrer || null : null;
    const bot = isBot(ua ?? undefined);
    const ip = await fetchIp();
    await (supabase as any).from("visitors").insert({
      ua, ip, path, referrer: ref, is_bot: bot,
    });
  } catch {}
}
