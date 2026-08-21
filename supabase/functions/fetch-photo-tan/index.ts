// Fetch an image URL (also resolves prnt.sc / lightshot pages) and optionally
// auto-crop to the largest dark-bordered rectangle (photoTAN QR frame).
// Returns { dataUrl } as base64 data URL.

import { decode as decodePng } from "https://deno.land/x/pngs@0.1.1/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function resolveImageUrl(url: string): Promise<string> {
  // Direct image URL heuristic
  if (/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url)) return url;

  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,*/*" } });
  const ct = res.headers.get("content-type") || "";
  if (ct.startsWith("image/")) return url;
  const html = await res.text();
  // og:image / twitter:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<img[^>]+class=["'][^"']*screenshot-image[^"']*["'][^>]+src=["']([^"']+)["']/i);
  if (og) return new URL(og[1], url).toString();
  throw new Error("Konnte kein Bild auf der Seite finden");
}

// Auto-crop by locating the largest dense dark region and cropping to its
// tight bounding box (removes surrounding white/beige/background around QR).
function autoCrop(pixels: Uint8Array, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  // darkness threshold
  const isDark = (i: number) => {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    return (r + g + b) / 3 < 90;
  };
  // rows/cols dark-pixel counts
  const rowC = new Uint32Array(h);
  const colC = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isDark((y * w + x) * 4)) { rowC[y]++; colC[x]++; }
    }
  }
  const rowThr = Math.max(6, w * 0.02);
  const colThr = Math.max(6, h * 0.02);
  let top = 0; while (top < h && rowC[top] < rowThr) top++;
  let bot = h - 1; while (bot > top && rowC[bot] < rowThr) bot--;
  let left = 0; while (left < w && colC[left] < colThr) left++;
  let right = w - 1; while (right > left && colC[right] < colThr) right--;
  if (right - left < 40 || bot - top < 40) return null;
  // small padding
  const pad = Math.round(Math.min(right - left, bot - top) * 0.03);
  return {
    x: Math.max(0, left - pad),
    y: Math.max(0, top - pad),
    w: Math.min(w, right - left + 1 + pad * 2),
    h: Math.min(h, bot - top + 1 + pad * 2),
  };
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { url, autoCrop: doCrop = true } = await req.json();
    if (!url || typeof url !== "string") throw new Error("url fehlt");

    const imgUrl = await resolveImageUrl(url.trim());
    const imgRes = await fetch(imgUrl, { headers: { "User-Agent": UA, "Referer": url } });
    if (!imgRes.ok) throw new Error(`Bild-Download fehlgeschlagen (${imgRes.status})`);
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    // Only attempt crop for PNG in-runtime (keeps deps minimal). Otherwise pass-through.
    if (doCrop && contentType.includes("png")) {
      try {
        const img = decodePng(bytes);
        const box = autoCrop(img.image, img.width, img.height);
        if (box) {
          // Encode cropped region as raw PNG via canvas polyfill? Deno lacks canvas.
          // Simplest: return original + crop coords; client crops via <canvas>.
          return new Response(JSON.stringify({
            dataUrl: `data:${contentType};base64,${toBase64(bytes)}`,
            crop: box,
            width: img.width,
            height: img.height,
          }), { headers: { ...CORS, "Content-Type": "application/json" } });
        }
      } catch (_) { /* fall through */ }
    }

    return new Response(JSON.stringify({
      dataUrl: `data:${contentType};base64,${toBase64(bytes)}`,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
