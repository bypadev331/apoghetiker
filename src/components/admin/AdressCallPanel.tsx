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

const LABEL_TO_KEY: Record<string, string> = {
  "titel": "titel", "vorname": "vorname", "weitere vornamen": "weitereVornamen",
  "nachname": "nachname", "geburtsdatum": "geburtsdatum", "geburtsort": "geburtsort",
  "staatsangehörigkeit": "staatsangehoerigkeit", "weitere staatsangehörigkeiten": "weitereStaatsangehoerigkeiten",
  "familienstand": "familienstand", "steuer-id": "steuerId",
  "private mobilfunknummer": "mobil", "mobil": "mobil",
  "private festnetznummer": "festnetz", "festnetz": "festnetz",
  "private e-mail-adresse": "email", "e-mail": "email",
  "straße und hausnummer": "strasse", "straße + nr.": "strasse", "strasse": "strasse",
  "adresszusatz": "zusatz", "postleitzahl": "plz", "plz": "plz",
  "ort und land": "ortLand", "ort": "ortLand",
  "erwerbstätigkeit": "erwerbstaetigkeit", "berufsgruppe": "berufsgruppe",
  "fachrichtung": "fachrichtung", "stellung im unternehmen": "stellung",
};
const SKIP_LINES = new Set(["persönliche angaben", "private kontaktinformationen", "meldeadresse", "berufliche angaben", "bearbeiten"]);
const parseProfilePaste = (text: string): Record<string, string> => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !SKIP_LINES.has(l.toLowerCase()));
  const out: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    const key = LABEL_TO_KEY[lines[i].toLowerCase()];
    if (key && i + 1 < lines.length) {
      const val = lines[i + 1];
      if (!LABEL_TO_KEY[val.toLowerCase()] && !/^keine angabe$|^keine$/i.test(val)) out[key] = val;
      i++;
    }
  }
  return out;
};

const AdressCallPanel = () => {
  const [profileText, setProfileText] = useState("");
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async () => {
    const parsed = profileText.trim() ? parseProfilePaste(profileText) : {};
    const auftraggeber = [parsed.vorname, parsed.nachname].filter(Boolean).join(" ") || "Kunde";
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("adress_tokens").insert({
      token,
      auftraggeber_name: auftraggeber,
      profile_data: Object.keys(parsed).length ? parsed : null,
      show_live_chat: showLiveChat,
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    const url = buildCustomerLink(auftraggeber, token);
    setLastLink(url);
    try { await navigator.clipboard.writeText(url); toast.success(`Kunden-Link kopiert: ${token}`); }
    catch { toast.success(`Adress-Token erstellt: ${token}`); }
    setProfileText("");
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

          <h3 className="text-sm font-semibold">Kundendaten (optional, Vorbelegung wie in TG)</h3>
          <p className="text-xs text-muted-foreground">Alles auf einmal einfügen – Label-Zeile, dann Wert-Zeile. „Keine Angabe" wird ignoriert. Kann später in der Live-Karte geändert werden.</p>
          <textarea
            value={profileText}
            onChange={e => setProfileText(e.target.value)}
            rows={12}
            className="w-full text-xs font-mono border rounded px-2 py-2 bg-background"
            placeholder={"Persönliche Angaben\nBearbeiten\nTitel\nKeine Angabe\nVorname\nGülnaz\nNachname\nKirdemir\n..."}
          />
        </section>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={showLiveChat} onChange={e => setShowLiveChat(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary" />
          <span className="font-medium">Live-Chat anzeigen</span>
        </label>

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
