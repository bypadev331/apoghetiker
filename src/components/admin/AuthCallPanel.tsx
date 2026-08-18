import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateToken } from "./tokenHelpers";

const AuthCallPanel = () => {
  const [auftraggeberName, setAuftraggeberName] = useState("");
  const [auftraggeberIban, setAuftraggeberIban] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!auftraggeberName) { toast.error("Bitte Name angeben"); return; }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("auth_tokens").insert({
      token,
      auftraggeber_name: auftraggeberName,
      auftraggeber_iban: auftraggeberIban || null,
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    try { await navigator.clipboard.writeText(token); } catch {}
    toast.success(`Auth-Token erstellt: ${token}`);
    setAuftraggeberName(""); setAuftraggeberIban("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Neuen Kundenauthentifizierungs-Token erstellen
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

        <Button onClick={handleCreate} disabled={creating} className="gap-2">
          <RefreshCw className="h-4 w-4" />Auth-Token generieren
        </Button>
      </CardContent>
    </Card>
  );
};

export default AuthCallPanel;
