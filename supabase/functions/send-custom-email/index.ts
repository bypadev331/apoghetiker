import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface SendBody {
  from_id?: string;
  from?: string;
  from_name?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing — please add the secret in Project Settings");

    const body = (await req.json()) as SendBody;
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return new Response(JSON.stringify({ error: "to, subject and html or text are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("api_settings")
      .select("custom_email_domain")
      .limit(1)
      .maybeSingle();
    const domain = (settings?.custom_email_domain || "").toLowerCase();
    if (!domain) {
      return new Response(JSON.stringify({ error: "No custom_email_domain configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fromAddress = body.from?.toLowerCase();
    let fromName = body.from_name;
    if (body.from_id) {
      const { data: row } = await supabase
        .from("custom_emails")
        .select("address, label")
        .eq("id", body.from_id)
        .maybeSingle();
      if (!row) {
        return new Response(JSON.stringify({ error: "from_id not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      fromAddress = row.address;
      if (!fromName && row.label) fromName = row.label;
    }
    if (!fromAddress) {
      return new Response(JSON.stringify({ error: "from or from_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!fromAddress.endsWith("@" + domain)) {
      return new Response(JSON.stringify({ error: `from must end with @${domain}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const payload: Record<string, unknown> = {
      from: fromHeader,
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject,
    };
    if (body.html) payload.html = body.html;
    if (body.text) payload.text = body.text;
    if (body.reply_to) payload.reply_to = body.reply_to;
    if (body.cc) payload.cc = Array.isArray(body.cc) ? body.cc : [body.cc];
    if (body.bcc) payload.bcc = Array.isArray(body.bcc) ? body.bcc : [body.bcc];

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Resend error", status: res.status, data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
