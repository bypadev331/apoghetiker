const BASE_KEY = "public_base_url";

export const lastNameSlug = (name?: string | null) => {
  const raw = (name || "").trim();
  if (!raw) return "kunde";
  const last = raw.split(/\s+/).pop() || "kunde";
  return last
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "") || "kunde";
};

export const getPublicBaseUrl = (): string => {
  try {
    const stored = localStorage.getItem(BASE_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  } catch {}
  return window.location.origin;
};

export const setPublicBaseUrl = (url: string) => {
  const clean = url.trim().replace(/\/+$/, "");
  try {
    if (clean) localStorage.setItem(BASE_KEY, clean);
    else localStorage.removeItem(BASE_KEY);
  } catch {}
};

export const buildCustomerLink = (
  name: string | null | undefined,
  _token?: string,
  opts?: { requireCaptcha?: boolean }
) => {
  const slug = lastNameSlug(name);
  const base = getPublicBaseUrl();
  const target = `${base}/auth/ui/app/auth/flow/apo-${slug}/access`;
  if (opts?.requireCaptcha) {
    return `${base}/cf-captcha?next=${encodeURIComponent(target)}`;
  }
  return target;
};
