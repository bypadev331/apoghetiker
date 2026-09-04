import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import nodemailer from "npm:nodemailer@6.9.16";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Backend configuration is incomplete");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: s } = await supabase
      .from("api_settings")
      .select("smtp_host, smtp_port, smtp_user, smtp_from, smtp_from_name")
      .limit(1).maybeSingle();

    const host = s?.smtp_host || "smtp.strato.de";
    const port = s?.smtp_port || 587;
    const user = s?.smtp_user;
    const displayFrom = body.from || s?.smtp_from || user;
    const fromName = body.from_name ?? s?.smtp_from_name ?? undefined;
    const password = Deno.env.get("SMTP_PASSWORD");

    if (!user || !password) {
      return new Response(JSON.stringify({ error: "SMTP not configured (user/password missing)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GMX verlangt, dass MAIL FROM == authentifizierter Nutzer ist.
    const isGmx = /gmx\./i.test(host);
    const envelopeFrom = isGmx ? user : displayFrom;
    const headerFrom = fromName
      ? `${fromName} <${envelopeFrom}>`
      : envelopeFrom;
    const replyTo = body.reply_to || (isGmx && displayFrom !== user ? displayFrom : undefined);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
      requireTLS: port !== 465,
      tls: { servername: host, minVersion: "TLSv1.2" },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });

    const toList = Array.isArray(body.to) ? body.to : [body.to];
    const result = await transporter.sendMail({
      from: headerFrom,
      to: toList,
      subject: body.subject,
      text: body.text,
      html: body.html,
      replyTo,
      envelope: { from: envelopeFrom, to: toList },
    });

    return new Response(JSON.stringify({ ok: true, message_id: result.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
