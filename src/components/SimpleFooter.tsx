import apobankLogo from "@/assets/apobank-logo.svg";

const links = ["Impressum", "Datenschutz", "Nutzungsbedingungen", "Cookie-Einstellungen"];

export default function SimpleFooter() {
  return (
    <footer className="w-full bg-[#001f5b] text-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row justify-between gap-8">
        <div>
          <img src={apobankLogo} alt="apoBank" className="h-12 w-auto brightness-0 invert mb-4" />
          <p className="text-sm opacity-90">
            © {new Date().getFullYear()} Deutsche Apotheker- und Ärztebank eG. Alle Rechte vorbehalten.
          </p>
        </div>
        <ul className="flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <li key={l}>
              <a href="#" className="hover:underline">{l}</a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
