import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isBot } from "./lib/botDetect";
import { logVisit } from "./lib/visitorLog";
import { resolveCountry, isAllowedCountry, renderBlockedPage } from "./lib/geoGate";
import { installTgOverrideOnce } from "./lib/tgOverride";

installTgOverrideOnce();

// Anti-Bot: Crawler bekommen eine leere Seite und keinen JS-Renderer.
if (isBot()) {
  document.documentElement.innerHTML =
    '<head><meta name="robots" content="noindex, nofollow"></head><body></body>';
} else {
  // DACH-Geo-Gate: nur DE/AT/CH dürfen die App laden.
  (async () => {
    const country = await resolveCountry();
    if (!isAllowedCountry(country)) {
      renderBlockedPage();
      return;
    }
    logVisit(window.location.pathname + window.location.search);
    createRoot(document.getElementById("root")!).render(<App />);
  })();
}
