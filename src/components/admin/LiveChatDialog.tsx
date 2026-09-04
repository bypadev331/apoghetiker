import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; sender: "admin" | "customer"; text: string; created_at: string };

interface Props {
  taskId: string;
  label?: string;
}

const LiveChatDialog = ({ taskId, label }: Props) => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    const ch = (supabase as any).channel(`livechat_admin_${taskId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `task_id=eq.${taskId}` },
        (payload: any) => {
          setMsgs(prev => [...prev, payload.new]);
          if (payload.new.sender === "customer" && !open) setUnread(u => u + 1);
        })
      .subscribe();
    return () => { cancelled = true; (supabase as any).removeChannel(ch); };
  }, [taskId, open]);

  useEffect(() => { if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); } }, [open, msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await (supabase as any).from("live_chat_messages").insert({ task_id: taskId, sender: "admin", text });
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Live-Chat öffnen" className="relative">
        <MessageCircle className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md h-[560px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#002776] text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Live-Chat {label ? `· ${label}` : ""}</div>
                <div className="text-[11px] opacity-90 font-mono">{taskId}</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#f5f7fa]">
              {msgs.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">Noch keine Nachrichten.</div>}
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words ${
                    m.sender === "admin" ? "bg-[#002776] text-white" : "bg-white text-foreground border border-border/60"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={e => { e.preventDefault(); send(); }} className="border-t p-2 flex items-center gap-2 bg-white">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Als Berater antworten…"
                className="flex-1 h-9 px-3 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#002776]/40" />
              <button type="submit" disabled={!input.trim()}
                className="h-9 w-9 rounded-md bg-[#002776] text-white flex items-center justify-center disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChatDialog;
