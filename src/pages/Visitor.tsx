import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Bot, Monitor, Smartphone } from "lucide-react";

interface Row {
  id: string;
  ua: string | null;
  ip: string | null;
  path: string | null;
  referrer: string | null;
  is_bot: boolean;
  created_at: string;
}

const PIN = "260346";
const PIN_KEY = "visitor_pin_ok_v1";

const describeDevice = (ua: string | null): { label: string; Icon: any } => {
  const s = ua || "";
  if (/iPhone|iPad|iPod/i.test(s)) return { label: "iOS", Icon: Smartphone };
  if (/Android/i.test(s)) return { label: "Android", Icon: Smartphone };
  if (/Windows/i.test(s)) return { label: "Windows PC", Icon: Monitor };
  if (/Macintosh|Mac OS X/i.test(s)) return { label: "Mac", Icon: Monitor };
  if (/Linux/i.test(s)) return { label: "Linux", Icon: Monitor };
  return { label: "Unbekannt", Icon: Monitor };
};

const fmtBerlin = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Europe/Berlin",
  });

const Visitor = () => {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "human" | "bot">("all");

  useEffect(() => { setAuthed(sessionStorage.getItem(PIN_KEY) === "1"); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("visitors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authed) return;
    load();
    const ch = (supabase as any)
      .channel("visitors_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visitors" }, (p: any) => {
        setRows(prev => [p.new as Row, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [authed]);

  const filtered = rows.filter(r =>
    filter === "all" ? true : filter === "bot" ? r.is_bot : !r.is_bot
  );

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === PIN) {
              sessionStorage.setItem(PIN_KEY, "1");
              setAuthed(true);
              setPin("");
            } else {
              toast.error("Falsche PIN");
            }
          }}
          className="w-full max-w-sm bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm"
        >
          <h1 className="text-2xl font-light text-primary">Visitor Log</h1>
          <div className="space-y-2">
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full">Anmelden</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-light text-primary">Besucher · /visitor</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }}>Logout</Button>
          </div>
        </header>

        <div className="flex gap-2">
          {(["all", "human", "bot"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                filter === f ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
              }`}
            >
              {f === "all" ? `Alle (${rows.length})` : f === "human" ? `Menschen (${rows.filter(r => !r.is_bot).length})` : `Bots (${rows.filter(r => r.is_bot).length})`}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Zeit (Berlin)</th>
                  <th className="text-left px-3 py-2">Gerät</th>
                  <th className="text-left px-3 py-2">IP</th>
                  <th className="text-left px-3 py-2">Pfad</th>
                  <th className="text-left px-3 py-2">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const d = describeDevice(r.ua);
                  return (
                    <tr key={r.id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{fmtBerlin(r.created_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {r.is_bot ? <Bot className="h-4 w-4 text-orange-500" /> : <d.Icon className="h-4 w-4 text-muted-foreground" />}
                          {r.is_bot ? "Bot" : d.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.ip || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.path || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-all max-w-[420px]">{r.ua || "—"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Noch keine Besucher</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visitor;
