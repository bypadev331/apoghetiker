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
  const [iban, setIban] = useState("");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) { toast.error("Bitte Name ausfüllen"); return; }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("adress_tokens").insert({
      token,
      auftraggeber_name: name,
      auftraggeber_iban: iban || null,
      curr_strasse: strasse || null,
      curr_plz: plz || null,
      curr_ort: ort || null,
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    const url = buildCustomerLink(name, token);
    setLastLink(url);
    try { await navigator.clipboard.writeText(url); toast.success(`Kunden-Link kopiert: ${token}`); }
    catch { toast.success(`Adress-Token erstellt: ${token}`); }
    setName(""); setIban(""); setStrasse(""); setPlz(""); setOrt("");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">IBAN (optional)</Label>
              <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="DE..." className="font-mono" />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Aktuelle Adresse (Vorbelegung)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Straße und Hausnummer</Label>
              <Input value={strasse} onChange={e => setStrasse(e.target.value)} placeholder="Musterstraße 1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">PLZ</Label>
              <Input value={plz} onChange={e => setPlz(e.target.value)} placeholder="40213" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ort</Label>
              <Input value={ort} onChange={e => setOrt(e.target.value)} placeholder="Düsseldorf" />
            </div>
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
