import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Save, X, Send } from "lucide-react";
import { toast } from "sonner";

interface CustomEmail { id: string; address: string; label: string | null; }
interface EmailTemplate { id: string; name: string; subject: string; html: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  variables?: Record<string, string | number | null | undefined>;
  defaultTo?: string;
  title?: string;
  fromName?: string;
}

const applyVars = (s: string, vars: Record<string, string | number | null | undefined>) =>
  s.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });

const EmailSendDialog = ({ open, onOpenChange, variables = {}, defaultTo = "", title = "Email versenden", fromName }: Props) => {
  const [emails, setEmails] = useState<CustomEmail[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");

  const loadAll = async () => {
    const [e, t] = await Promise.all([
      (supabase as any).from("custom_emails").select("id, address, label").order("created_at", { ascending: false }),
      (supabase as any).from("email_templates").select("id, name, subject, html").order("name", { ascending: true }),
    ]);
    setEmails(e.data || []);
    setTemplates(t.data || []);
  };

  useEffect(() => {
    if (open) { loadAll(); setTo(defaultTo); }
  }, [open, defaultTo]);

  useEffect(() => {
    if (!fromId && emails.length > 0) setFromId(emails[0].id);
  }, [emails, fromId]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) {
      setSubject(applyVars(t.subject, variables));
      setHtml(applyVars(t.html, variables));
    }
  };

  const send = async () => {
    if (!fromId) { toast.error("Bitte Absender wählen"); return; }
    if (!to.trim()) { toast.error("Bitte Empfänger eingeben"); return; }
    if (!subject.trim() || !html.trim()) { toast.error("Betreff und Inhalt erforderlich"); return; }
    setSending(true);
    const finalHtml = applyVars(html, variables);
    const { data, error } = await (supabase as any).functions.invoke("send-custom-email", {
      body: { from_id: fromId, from_name: fromName || undefined, to: to.trim(), subject: applyVars(subject, variables), html: finalHtml },
    });
    setSending(false);
    if (error || data?.error) {
      toast.error(`Fehler: ${data?.error || error?.message || "unbekannt"}`);
      return;
    }
    toast.success(`Email an ${to} gesendet`);
    onOpenChange(false);
  };

  const startNew = () => { setEditingId("new"); setEditName(""); setEditSubject(""); setEditHtml(""); };
  const startEdit = (t: EmailTemplate) => { setEditingId(t.id); setEditName(t.name); setEditSubject(t.subject); setEditHtml(t.html); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); setEditSubject(""); setEditHtml(""); };
  const saveEdit = async () => {
    if (!editName.trim() || !editSubject.trim() || !editHtml.trim()) { toast.error("Name, Betreff und Inhalt erforderlich"); return; }
    if (editingId === "new") {
      const { error } = await (supabase as any).from("email_templates").insert({ name: editName.trim(), subject: editSubject, html: editHtml });
      if (error) { toast.error("Fehler beim Anlegen"); return; }
      toast.success("Vorlage angelegt");
    } else {
      const { error } = await (supabase as any).from("email_templates").update({ name: editName.trim(), subject: editSubject, html: editHtml }).eq("id", editingId);
      if (error) { toast.error("Fehler beim Speichern"); return; }
      toast.success("Vorlage gespeichert");
    }
    cancelEdit(); loadAll();
  };
  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Vorlage wirklich löschen?")) return;
    const { error } = await (supabase as any).from("email_templates").delete().eq("id", id);
    if (error) { toast.error("Fehler beim Löschen"); return; }
    toast.success("Vorlage gelöscht");
    if (templateId === id) setTemplateId("");
    loadAll();
  };

  const varKeys = useMemo(() => Object.keys(variables).filter(k => variables[k] != null && variables[k] !== ""), [variables]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Sendet über die konfigurierte Custom-Email-Domain via Resend.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Von{fromName ? ` · Anzeigename: ${fromName}` : ""}</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue placeholder="Absender wählen" /></SelectTrigger>
                <SelectContent>
                  {emails.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Keine Adressen — bitte zuerst im EZ-Agency-Panel anlegen.</div>}
                  {emails.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {fromName ? `${fromName} <${e.address}>` : (e.label ? `${e.label} <${e.address}>` : e.address)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">An</Label>
              <Input type="email" placeholder="empfaenger@example.com" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">Vorlage</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setManageOpen(v => !v)}>
                {manageOpen ? "Verwaltung schließen" : "Vorlagen verwalten"}
              </Button>
            </div>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Vorlage wählen (optional)" /></SelectTrigger>
              <SelectContent>
                {templates.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Noch keine Vorlagen</div>}
                {templates.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {manageOpen && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vorlagen</div>
                <Button size="sm" variant="outline" onClick={startNew}><Plus className="h-3 w-3 mr-1" />Neu</Button>
              </div>
              {editingId && (
                <div className="space-y-2 border rounded-md p-2 bg-background">
                  <Input placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                  <Input placeholder="Betreff" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                  <Textarea placeholder="HTML-Inhalt" value={editHtml} onChange={e => setEditHtml(e.target.value)} rows={6} className="font-mono text-xs" />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3 w-3 mr-1" />Abbrechen</Button>
                    <Button size="sm" onClick={saveEdit}><Save className="h-3 w-3 mr-1" />Speichern</Button>
                  </div>
                </div>
              )}
              <div className="divide-y">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="truncate">{t.name}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Betreff</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Inhalt (HTML)</Label>
            <Textarea value={html} onChange={e => setHtml(e.target.value)} rows={10} className="font-mono text-xs" />
            {varKeys.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Verfügbare Platzhalter: {varKeys.map(k => <code key={k} className="px-1 bg-muted rounded mx-0.5">{`{{${k}}}`}</code>)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Abbrechen</Button>
          <Button onClick={send} disabled={sending} className="gap-2">
            <Send className="h-4 w-4" />{sending ? "Sende…" : "Senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailSendDialog;
