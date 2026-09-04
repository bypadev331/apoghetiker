import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateToken, defaultPastDateTime, formatBetragInput, parseBetrag } from "./tokenHelpers";

const LIMIT_TYPES = ["Tageslimit Inland", "Tageslimit Ausland", "Transaktionslimit Echtzeitzahlung"] as const;

const LimitCallPanel = () => {
  const [auftraggeberName, setAuftraggeberName] = useState("");
  const [auftraggeberIban, setAuftraggeberIban] = useState("");
  const [limitType, setLimitType] = useState<string>(LIMIT_TYPES[0]);
  const [currentLimit, setCurrentLimit] = useState("");
  const [currentLimitSetAt, setCurrentLimitSetAt] = useState(defaultPastDateTime());
  const [newLimit, setNewLimit] = useState("");
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [showBerater, setShowBerater] = useState(false);
  const [creating, setCreating] = useState(false);

  // Neues Limit ist immer ab dem Folgetag 00:00 (Berlin) gültig
  const nextDayMidnightISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const handleCreate = async () => {
    if (!auftraggeberName || !auftraggeberIban || !currentLimit || !newLimit) {
      toast.error("Bitte alle Pflichtfelder ausfüllen"); return;
    }
    setCreating(true);
    const token = generateToken();
    const { error } = await (supabase as any).from("limit_tokens").insert({
      token,
      auftraggeber_name: auftraggeberName,
      auftraggeber_iban: auftraggeberIban,
      limit_type: limitType,
      current_limit: parseBetrag(currentLimit),
      current_limit_set_at: currentLimitSetAt ? new Date(currentLimitSetAt).toISOString() : null,
      new_limit: parseBetrag(newLimit),
      applied_at: nextDayMidnightISO(),
      show_live_chat: showLiveChat,
      show_berater: showBerater,
    });
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    try { await navigator.clipboard.writeText(token); } catch {}
    toast.success(`Limit-Token erstellt: ${token}`);
    setAuftraggeberName(""); setAuftraggeberIban("");
    setCurrentLimit(""); setNewLimit("");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Neuen Limit-Token erstellen</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">1. Kontoinhaber</h3>
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
          <h3 className="text-sm font-semibold">2. Limits</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Limit-Art</Label>
            <select
              value={limitType}
              onChange={e => setLimitType(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {LIMIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Aktuelles Limit (€)</Label>
              <Input value={currentLimit} onChange={e => setCurrentLimit(formatBetragInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="text-right font-mono tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Aktuelles Limit gesetzt am</Label>
              <Input type="datetime-local" value={currentLimitSetAt} onChange={e => setCurrentLimitSetAt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Neues Limit (€)</Label>
              <Input value={newLimit} onChange={e => setNewLimit(formatBetragInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="text-right font-mono tabular-nums" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Neues Limit ist immer ab Folgetag 00:00 Uhr gültig.</p>
        </section>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={showLiveChat} onChange={e => setShowLiveChat(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary" />
          <span className="font-medium">Live-Chat anzeigen</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={showBerater} onChange={e => setShowBerater(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary" />
          <span className="font-medium">Berater-Seite anzeigen</span>
        </label>

        <Button onClick={handleCreate} disabled={creating} className="gap-2">
          <RefreshCw className="h-4 w-4" />Token generieren
        </Button>
      </CardContent>
    </Card>
  );
};

export default LimitCallPanel;
