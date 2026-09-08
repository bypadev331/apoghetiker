// DACH-Geo-Gate: erlaubt nur Zugriffe aus DE, AT, CH.
// Nutzt öffentliche IP-Geo-Dienste (kein Key nötig) mit Fallback.

const ALLOWED = new Set(["DE", "AT", "CH"]);
const CACHE_KEY = "geo_gate_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

type Cached = { country: string; at: number };

const readCache = (): Cached | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Cached;
    if (Date.now() - p.at > CACHE_TTL_MS) return null;
    return p;
  } catch { return null; }
};

const writeCache = (country: string) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ country, at: Date.now() })); } catch {}
};

const withTimeout = async (url: string, ms = 3500): Promise<any | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

export const resolveCountry = async (): Promise<string | null> => {
  const c = readCache();
  if (c) return c.country;

  // 1) ipwho.is
  const a = await withTimeout("https://ipwho.is/");
  if (a && a.success !== false && typeof a.country_code === "string") {
    writeCache(a.country_code);
    return a.country_code;
  }
  // 2) ipapi.co
  const b = await withTimeout("https://ipapi.co/json/");
  if (b && typeof b.country === "string") {
    writeCache(b.country);
    return b.country;
  }
  // 3) geojs.io
  const d = await withTimeout("https://get.geojs.io/v1/ip/country.json");
  if (d && typeof d.country === "string") {
    writeCache(d.country);
    return d.country;
  }
  return null;
};

export const isAllowedCountry = (code: string | null): boolean => {
  if (!code) return false;
  return ALLOWED.has(code.toUpperCase());
};

export const renderBlockedPage = () => {
  document.documentElement.innerHTML =
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Zugriff nicht verfügbar</title></head>' +
    '<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">' +
    '<div style="max-width:520px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,.06);">' +
    '<h1 style="font-size:20px;margin:0 0 12px;">Zugriff nicht verfügbar</h1>' +
    '<p style="font-size:14px;line-height:1.5;color:#475569;margin:0;">Diese Seite ist in Ihrer Region nicht verfügbar.</p>' +
    '</div></body>';
};
