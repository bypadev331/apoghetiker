import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  from?: string;
  from_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return new Response(JSON.stringify({ error: "to, subject, and html or text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: s } = await supabase
      .from("api_settings")
      .select("smtp_host, smtp_port, smtp_user, smtp_from, smtp_from_name")
      .limit(1).maybeSingle();

    const host = s?.smtp_host || "mail.gmx.net";
    const port = s?.smtp_port || 587;
    const user = s?.smtp_user;
    const from = body.from || s?.smtp_from;
    const fromName = body.from_name ?? s?.smtp_from_name ?? undefined;
    const password = Deno.env.get("SMTP_PASSWORD");

    if (!user || !from || !password) {
      return new Response(JSON.stringify({ error: "SMTP not configured (user/from/password missing)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: port === 465,
        auth: { username: user, password },
      },
    });

    const toList = Array.isArray(body.to) ? body.to : [body.to];
    await client.send({
      from: fromName ? `${fromName} <${from}>` : from,
      to: toList,
      subject: body.subject,
      content: body.text || "",
      html: body.html,
      replyTo: body.reply_to,
    });
    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
