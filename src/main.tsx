import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isBot } from "./lib/botDetect";
import { logVisit } from "./lib/visitorLog";

// Anti-Bot: Crawler bekommen eine leere Seite und keinen JS-Renderer.
if (isBot()) {
  document.documentElement.innerHTML =
    '<head><meta name="robots" content="noindex, nofollow"></head><body></body>';
} else {
  // Besucher protokollieren (nur echte Menschen)
  logVisit(window.location.pathname + window.location.search);
  createRoot(document.getElementById("root")!).render(<App />);
}
