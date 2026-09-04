import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import beraterFotoDefault from "@/assets/berater.png.asset.json";

const DEFAULT_NAME = "Justus Sperling";
const DEFAULT_PHOTO = beraterFotoDefault.url;

export type BeraterInfo = {
  name: string;
  initials: string;
  photoUrl: string;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "JS";

let cache: BeraterInfo | null = null;
const listeners = new Set<(info: BeraterInfo) => void>();

const resolvePhoto = async (path: string | null): Promise<string> => {
  if (!path) return DEFAULT_PHOTO;
  try {
    const { data } = await (supabase as any).storage
      .from("berater")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl || DEFAULT_PHOTO;
  } catch {
    return DEFAULT_PHOTO;
  }
};

const load = async () => {
  const { data } = await (supabase as any)
    .from("api_settings")
    .select("berater_name, berater_photo_path")
    .limit(1)
    .maybeSingle();
  const name = data?.berater_name?.trim() || DEFAULT_NAME;
  const photoUrl = await resolvePhoto(data?.berater_photo_path || null);
  const info: BeraterInfo = { name, initials: initialsOf(name), photoUrl };
  cache = info;
  listeners.forEach((l) => l(info));
};

let subscribed = false;
const ensureSubscribed = () => {
  if (subscribed) return;
  subscribed = true;
  load();
  (supabase as any)
    .channel("api_settings_berater")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "api_settings" },
      () => load(),
    )
    .subscribe();
};

export const useBerater = (): BeraterInfo => {
  const [info, setInfo] = useState<BeraterInfo>(
    cache || { name: DEFAULT_NAME, initials: "JS", photoUrl: DEFAULT_PHOTO },
  );
  useEffect(() => {
    ensureSubscribed();
    listeners.add(setInfo);
    if (cache) setInfo(cache);
    return () => {
      listeners.delete(setInfo);
    };
  }, []);
  return info;
};

export const reloadBerater = () => load();
