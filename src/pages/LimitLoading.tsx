import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apobankLogo from "@/assets/apobank-logo-square.png";
import { getSettings } from "@/lib/adminSettings";

const LimitLoading = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("Überweisungslimit wird festgelegt.");

  const goTo = (override?: string) => {
    const target = override || "/limit/confirm";
    if (/^https?:\/\//i.test(target)) {
      window.location.href = target;
    } else {
      navigate(target);
    }
  };

  useEffect(() => {
    (window as any).onLoadingComplete = (path?: string) => goTo(path);
    return () => { delete (window as any).onLoadingComplete; };
  }, [navigate]);

  useEffect(() => {
    const textTimer = setTimeout(() => setText("Bitte warten."), 3000);
    return () => clearTimeout(textTimer);
  }, []);

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
          <img
            src={apobankLogo}
            alt="apoBank"
            className="w-44 h-44 object-contain"
          />
        </div>
      </div>
      <p className="mt-8 text-lg text-foreground font-medium">{text}</p>
    </div>
  );
};

export default LimitLoading;
