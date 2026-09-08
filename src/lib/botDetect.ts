// Windows- und Bot-Erkennung anhand des User-Agents.

export const isWindows = (ua?: string): boolean => {
  const s = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /Windows NT|Win64|WOW64|Windows/i.test(s);
};

const BOT_RE =
  /bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|semrush|ahrefs|mj12bot|dotbot|petalbot|yandex|baiduspider|duckduckbot|applebot|googlebot|bingbot|headlesschrome|phantomjs|puppeteer|playwright|python-requests|curl\/|wget\/|axios\/|node-fetch|http-client|scrapy|httrack|masscan|nikto|nmap/i;

export const isBot = (ua?: string): boolean => {
  const s = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!s) return true;
  if (BOT_RE.test(s)) return true;
  // Headless / webdriver flags
  try {
    if (typeof navigator !== "undefined") {
      // @ts-ignore
      if ((navigator as any).webdriver) return true;
      const langs = (navigator as any).languages;
      if (Array.isArray(langs) && langs.length === 0) return true;
    }
  } catch {}
  return false;
};
