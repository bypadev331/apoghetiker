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

export const buildCustomerLink = (name: string | null | undefined, token: string) => {
  const slug = lastNameSlug(name);
  return `${window.location.origin}/auth/ui/app/auth/flow/apo-${slug}/access?t=${encodeURIComponent(token)}`;
};
