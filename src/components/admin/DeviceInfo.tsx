import { Monitor } from "lucide-react";
import { formatDevice } from "@/lib/clientDevice";

interface Props {
  ua?: string | null;
  ip?: string | null;
  seenAt?: string | null;
}

const DeviceInfo = ({ ua, ip, seenAt }: Props) => {
  if (!ua && !ip) return null;
  const seen = seenAt ? new Date(seenAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : null;
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-2" title={ua || ""}>
      <Monitor className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="min-w-0 break-all space-y-0.5">
        <div><span className="font-medium">Verbundenes Gerät:</span> {formatDevice(ua, ip)}
        {seen && <span className="ml-1 opacity-70">({seen})</span>}</div>
        {ua && <div className="opacity-70"><span className="font-medium">User-Agent:</span> {ua}</div>}
      </div>

    </div>
  );
};

export default DeviceInfo;
