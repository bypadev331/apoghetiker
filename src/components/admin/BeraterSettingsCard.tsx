import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reloadBerater, useBerater } from "@/hooks/useBerater";

const BeraterSettingsCard = () => {
  const berater = useBerater();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("api_settings")
        .select("id, berater_name")
        .limit(1)
        .maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setName(data.berater_name || "");
      }
    })();
  }, []);

  const saveName = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({ berater_name: name.trim() || null })
      .eq("id", settingsId);
    setSaving(false);
    if (error) return toast.error("Fehler beim Speichern");
    toast.success("Berater-Name gespeichert");
    reloadBerater();
  };

  const onUpload = async (file: File) => {
    if (!settingsId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `berater-${Date.now()}.${ext}`;
    const up = await (supabase as any).storage
      .from("berater")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setUploading(false);
      return toast.error("Upload fehlgeschlagen: " + up.error.message);
    }
    const { error } = await (supabase as any)
      .from("api_settings")
      .update({ berater_photo_path: path })
      .eq("id", settingsId);
    setUploading(false);
    if (error) return toast.error("Fehler beim Speichern");
    toast.success("Foto aktualisiert");
    reloadBerater();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle2 className="h-4 w-4" /> Berater
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border bg-muted shrink-0">
            <img src={berater.photoUrl} alt={berater.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium">Name des Beraters</label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Justus Sperling" />
              <Button size="sm" onClick={saveName} disabled={saving}>Speichern</Button>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-2">Foto ändern</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" /> {uploading ? "Lädt hoch..." : "Neues Foto wählen"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Name und Foto erscheinen überall (Live-Chat, /berater, Auth-Flow und in der E-Mail-Signatur).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeraterSettingsCard;
