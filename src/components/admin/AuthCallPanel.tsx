import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { generateToken } from "./tokenHelpers";
import AuthLiveCard from "./AuthLiveCard";

type Method = "photo" | "sms" | "push";

const AuthCallPanel = () => {
  const [auftraggeberName, setAuftraggeberName] = useState("");
  const [auftraggeberIban, setAuftraggeberIban] = useState("");
  const [tanMethod, setTanMethod] = useState<Method>("photo");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!auftraggeberName) { toast.error("Bitte Name angeben"); return; }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("auth_tokens").insert({
      token,
      auftraggeber_name: auftraggeberName,
      auftraggeber_iban: auftraggeberIban || null,
      tan_method: tanMethod,
      customer_phase: "login",
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    const url = `${window.location.origin}/auth/${token}`;
    setLastLink(url);
    try { await navigator.clipboard.writeText(url); toast.success(`Kunden-Link kopiert: ${token}`); }
    catch { toast.success(`Auth-Token erstellt: ${token}`); }
    setAuftraggeberName(""); setAuftraggeberIban("");
  };

  const copyLink = async () => {
    if (!lastLink) return;
    try { await navigator.clipboard.writeText(lastLink); toast.success("Link kopiert"); } catch {}
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Neue Kundenauthentifizierungs-Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Kontoinhaber</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={auftraggeberName} onChange={e => setAuftraggeberName(e.target.value)} placeholder="Max Mustermann" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IBAN (optional)</Label>
                <Input value={auftraggeberIban} onChange={e => setAuftraggeberIban(e.target.value)} placeholder="DE00 …" className="font-mono" />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">TAN-Verfahren (Vorgabe)</h3>
            <div className="flex flex-wrap gap-2">
              {(["photo", "sms", "push"] as const).map(m => (
                <Button key={m} size="sm" type="button"
                  variant={tanMethod === m ? "default" : "outline"}
                  onClick={() => setTanMethod(m)}>
                  {m === "photo" ? "PhotoTAN" : m === "sms" ? "SMS-TAN" : "Push-TAN"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Kann später live in der Steuerung geändert werden.</p>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              <RefreshCw className="h-4 w-4" />Session erstellen &amp; Link kopieren
            </Button>
            {lastLink && (
              <Button variant="outline" onClick={copyLink} className="gap-2">
                <Link2 className="h-4 w-4" />Letzten Link kopieren
              </Button>
            )}
          </div>
          {lastLink && (
            <div className="text-xs text-muted-foreground font-mono break-all">{lastLink}</div>
          )}
        </CardContent>
      </Card>

      <AuthLiveCard />
    </div>
  );
};

export default AuthCallPanel;
