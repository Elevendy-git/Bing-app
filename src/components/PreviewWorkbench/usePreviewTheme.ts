import { useEffect, useState } from "react";
import type { PreviewTheme } from "./PhonePreview";
import type { PreviewAppearance } from "./previewTypes";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function usePreviewTheme(appearance: PreviewAppearance): PreviewTheme {
  const [systemDark, setSystemDark] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia(DARK_SCHEME_QUERY).matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(DARK_SCHEME_QUERY);
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return appearance === "system" ? (systemDark ? "dark" : "light") : appearance;
}
