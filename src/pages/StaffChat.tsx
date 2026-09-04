import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; sender: "admin" | "customer"; text: string; created_at: string };

const StaffChat = () => {
  const { kind, id } = useParams();
  const taskId = kind && id ? `${kind}:${id}` : "";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const ch = (supabase as any).channel(`livechat_staff_${taskId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `task_id=eq.${taskId}` },
        (payload: any) => setMsgs(prev => [...prev, payload.new]))
      .subscribe();
    return () => { cancelled = true; (supabase as any).removeChannel(ch); };
  }, [taskId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || !taskId) return;
    setInput("");
    await (supabase as any).from("live_chat_messages").insert({ task_id: taskId, sender: "admin", text });
  };

  if (!taskId) return <div className="p-6 text-sm">Ungültiger Chat-Link.</div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
      <div className="bg-[#002776] text-white px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="font-semibold">Live-Chat · apoBank</div>
          <div className="text-[11px] opacity-90 font-mono">{taskId}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 py-4 space-y-2">
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
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="border-t bg-white p-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Als Berater antworten…"
            className="flex-1 h-10 px-3 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#002776]/40" />
          <button type="submit" disabled={!input.trim()}
            className="h-10 w-10 rounded-md bg-[#002776] text-white flex items-center justify-center disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffChat;
