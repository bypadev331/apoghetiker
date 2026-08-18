// Shared helpers for EZ Agency token panels

export const generateToken = () => {
  let out = "";
  for (let i = 0; i < 6; i++) out += String(Math.floor(Math.random() * 10));
  return `${out.slice(0, 3)}-${out.slice(3)}`;
};

export const defaultPastDateTime = () => {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "1" -> "0,01", "123" -> "1,23", "999999" -> "9.999,99"
export const formatBetragInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  const padded = digits.padStart(3, "0");
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decPart = padded.slice(-2);
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intFmt},${decPart}`;
};

export const parseBetrag = (s: string): number =>
  parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

// German number-to-words (integer euro portion)
const ones = ["null","ein","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf","dreizehn","vierzehn","fünfzehn","sechzehn","siebzehn","achtzehn","neunzehn"];
const tens = ["","","zwanzig","dreißig","vierzig","fünfzig","sechzig","siebzig","achtzig","neunzig"];
const under1000 = (n: number): string => {
  if (n === 0) return "";
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) out += `${ones[h]}hundert`;
  if (r === 0) return out;
  if (r < 20) return out + (r === 1 ? "eins" : ones[r]);
  const t = Math.floor(r / 10);
  const u = r % 10;
  if (u === 0) return out + tens[t];
  return out + `${u === 1 ? "ein" : ones[u]}und${tens[t]}`;
};
const intToGermanWords = (n: number): string => {
  if (!isFinite(n) || n < 0) return "";
  n = Math.floor(n);
  if (n === 0) return "null";
  if (n >= 1_000_000_000) return "über eine Milliarde";
  const mio = Math.floor(n / 1_000_000);
  const rest1 = n % 1_000_000;
  const tsd = Math.floor(rest1 / 1000);
  const rest2 = rest1 % 1000;
  let out = "";
  if (mio > 0) out += mio === 1 ? "eine Million " : `${under1000(mio)} Millionen `;
  if (tsd > 0) out += tsd === 1 ? "eintausend" : `${under1000(tsd)}tausend`;
  if (rest2 > 0) out += under1000(rest2);
  return out.trim();
};
export const numberToGermanWords = (n: number): string => {
  if (!isFinite(n) || n < 0) return "";
  const euros = Math.floor(n);
  const cents = Math.round((n - euros) * 100);
  const euroPart = `${intToGermanWords(euros)} Euro`;
  if (cents > 0) return `${euroPart} und ${intToGermanWords(cents)} Cent`;
  return euroPart;
};
