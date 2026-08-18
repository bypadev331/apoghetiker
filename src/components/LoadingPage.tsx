import { useEffect, useState } from "react";
import apobankLogo from "@/assets/apobank-logo-square.png";

interface LoadingPageProps {
  onComplete: () => void;
}

const LoadingPage = ({ onComplete }: LoadingPageProps) => {
  const [text, setText] = useState("Kundendaten werden geladen");

  useEffect(() => {
    const textTimer = setTimeout(() => setText("bitte warten"), 3000);
    const completeTimer = setTimeout(() => onComplete(), 6000);
    return () => {
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative w-56 h-56">
        {/* Rotating quarter-circle arc */}
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
        {/* Logo */}
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

export default LoadingPage;
