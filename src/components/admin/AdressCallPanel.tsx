import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { generateToken } from "./tokenHelpers";
import { buildCustomerLink } from "@/lib/customerLink";

const AdressCallPanel = () => {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) { toast.error("Bitte Name ausfüllen"); return; }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("adress_tokens").insert({
      token,
      auftraggeber_name: name,
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    const url = buildCustomerLink(name, token);
    setLastLink(url);
    try { await navigator.clipboard.writeText(url); toast.success(`Kunden-Link kopiert: ${token}`); }
    catch { toast.success(`Adress-Token erstellt: ${token}`); }
    setName("");
  };

  const copyLink = async () => {
    if (!lastLink) return;
    try { await navigator.clipboard.writeText(lastLink); toast.success("Link kopiert"); } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Neuen Adress-Änderungs-Token erstellen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Kontoinhaber</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" />
          </div>
        </section>


        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            <RefreshCw className="h-4 w-4" />Adress-Token generieren
          </Button>
          <Button type="button" variant="outline" onClick={copyLink} className="gap-2">
            <Link2 className="h-4 w-4" />Link kopieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdressCallPanel;
