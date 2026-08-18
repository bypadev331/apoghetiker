import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { tgCall, deriveWebhookSecret } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const projectRef = (Deno.env.get("SUPABASE_URL") ?? "").match(/https:\/\/([^.]+)/)?.[1];
    if (!projectRef) throw new Error("no project ref");
    const url = `https://${projectRef}.supabase.co/functions/v1/telegram-webhook`;
    const secret = await deriveWebhookSecret();

    const { json: setRes } = await tgCall("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message", "edited_message", "callback_query"],
    });
    const { json: info } = await tgCall("getWebhookInfo", {});

    return new Response(JSON.stringify({ url, setRes, info }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
