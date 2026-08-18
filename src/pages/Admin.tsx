import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import {
  isAuthed,
  login,
  logout,
} from "@/lib/adminSettings";
import EzAgencyPanel from "@/components/admin/EzAgencyPanel";

const Admin = () => {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, pw)) { setAuthed(true); setPw(""); setUsername(""); }
    else toast.error("Falscher Benutzername oder Passwort");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
          <h1 className="text-2xl font-light text-primary">Admin Login</h1>
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Passwort</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Anmelden</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-light text-primary">Admin Panel</h1>
          <Button variant="outline" onClick={() => { logout(); setAuthed(false); }}>Logout</Button>
        </header>

        <div className="flex items-center gap-2 text-lg font-medium text-foreground">
          <Briefcase className="h-5 w-5" />
          EZ Agency
        </div>

        <EzAgencyPanel />
      </div>
    </div>
  );
};

export default Admin;
