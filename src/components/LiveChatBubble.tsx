import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBerater } from "@/hooks/useBerater";

export type LiveChatKind = "storno" | "pin" | "limit" | "auth" | "adress";

const TABLE: Record<LiveChatKind, string> = {
  storno: "storno_tokens",
  pin: "pin_tokens",
  limit: "limit_tokens",
  auth: "auth_tokens",
  adress: "adress_tokens",
};

type Msg = { id: string; sender: "admin" | "customer"; text: string; created_at: string };

interface Props {
  kind: LiveChatKind;
  token: string | null | undefined;
}

const LiveChatBubble = ({ kind, token }: Props) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Resolve token row -> id + show_live_chat (poll every 3s)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await (supabase as any)
        .from(TABLE[kind])
        .select("id, show_live_chat")
        .eq("token", token)
        .maybeSingle();
      if (cancelled || !data) return;
      setTaskId(`${kind}:${data.id}`);
      setEnabled(!!data.show_live_chat);
    };
    check();
    const iv = window.setInterval(check, 3000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [kind, token]);

  // Load & subscribe messages
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("live_chat_messages")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMsgs(data || []);
    };
    load();
    const ch = (supabase as any).channel(`livechat_customer_${taskId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `task_id=eq.${taskId}` },
        (payload: any) => {
          setMsgs(prev => [...prev, payload.new]);
          if (payload.new.sender === "admin" && !open) setUnread(u => u + 1);
        })
      .subscribe();
    return () => { cancelled = true; (supabase as any).removeChannel(ch); };
  }, [taskId, open]);

  useEffect(() => { if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); } }, [open, msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || !taskId) return;
    setInput("");
    await (supabase as any).from("live_chat_messages").insert({ task_id: taskId, sender: "customer", text });
  };

  if (!enabled || !taskId) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] h-14 w-14 rounded-full bg-[#002776] text-white shadow-lg flex items-center justify-center hover:bg-[#001f5b] transition-colors"
          aria-label="Live-Chat öffnen"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] w-[min(360px,calc(100vw-2rem))] h-[min(520px,calc(100vh-2rem))] bg-white rounded-lg shadow-2xl border border-border/40 flex flex-col overflow-hidden">
          <div className="bg-[#002776] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Live-Chat der apoBank</div>
              <div className="text-[11px] opacity-90">Justus Sperling · Ihr Berater</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Schließen" className="p-1 rounded hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#f5f7fa]">
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-white text-[#002776] border border-[#002776]/20 rounded-lg px-3 py-2 text-sm shadow-sm">
                {WELCOME}
              </div>
            </div>
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words ${
                  m.sender === "customer"
                    ? "bg-[#002776] text-white"
                    : "bg-white text-foreground border border-border/60"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); send(); }} className="border-t border-border/40 p-2 flex items-center gap-2 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Nachricht schreiben…"
              className="flex-1 h-9 px-3 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#002776]/40"
            />
            <button type="submit" disabled={!input.trim()}
              className="h-9 w-9 rounded-md bg-[#002776] text-white flex items-center justify-center disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default LiveChatBubble;
