"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_THEME, ThemeType } from "@/lib/themes";
import { supabase } from "@/lib/supabase";

function setThemeCookie(key: string, value: string | null) {
  if (typeof window === "undefined") return;

  if (!value) {
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure;" : ""}`;
  } else {
    document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure;" : ""}`;
  }
}

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  /** Reset: hapus profile.theme ({}) → tenant/default mewarisi. */
  resetTheme: () => void;
  /** Save eksplisit: persist theme saat ini ke profiles.theme. */
  saveTheme: () => Promise<void>;
  isSaving: boolean;
  /** Source of the current theme: "user" | "tenant" | "default". */
  themeSource: string;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: ThemeType;
}) {
  const [theme, setThemeState] = useState<ThemeType>(() =>
    initialTheme ? initialTheme : DEFAULT_THEME
  );
  const [themeSource, setThemeSource] = useState<string>("default");
  const [isSaving, setIsSaving] = useState(false);
  const themeRequestRef = useRef(0);

  // --- Fetch DB-resolved theme (user > tenant > default) ---
  const applyDbTheme = useCallback(async (tenantContext?: { id?: string; slug?: string }) => {
    const requestId = ++themeRequestRef.current;
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;

      // Extract tenant_slug dari URL — lebih reliable daripada localStorage active_org_id
      // yg bisa stale saat pindah tenant via navigasi.
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const tenantSlug = tenantContext?.slug || pathParts[0] || "";
      const tenantId = tenantContext?.id || localStorage.getItem("active_org_id") || "";

      const res = await fetch("/api/theme", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-tenant-slug": tenantSlug,
          "x-tenant-id": tenantId,
          ...(tenantContext?.id ? { "x-tenant-switch": "true" } : {})
        }
      })
        .then((r) => r.json())
        .catch(() => null);

      if (requestId === themeRequestRef.current && res?.theme && res.theme.preset !== undefined) {
        setThemeState(res.theme as ThemeType);
        setThemeSource(res.source || "default");
      }
    } catch {
      // Silent fail → keep current theme.
    }
  }, []);

  // Re-fetch theme saat path berubah (pindah tenant = URL berubah).
  // Debounced: mount = immediate; navigasi = delay 300ms.
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      applyDbTheme();
      return;
    }
    const timer = setTimeout(() => applyDbTheme(), 300);
    return () => clearTimeout(timer);
  }, [pathname, applyDbTheme]);

  // Juga dengarkan event "storage" utk perubahan programmatic (e.g. org switch tanpa navigasi).
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ tenantId?: string; tenantSlug?: string }>;
      applyDbTheme({ id: customEvent.detail?.tenantId, slug: customEvent.detail?.tenantSlug });
    };
    window.addEventListener("storage", handler);
    window.addEventListener("active-org-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("active-org-changed", handler);
    };
  }, [applyDbTheme]);

  // --- Apply theme to body + cookies (SSR-consistent) ---
  useEffect(() => {
    const body = document.body;

    setThemeCookie("theme_radius", theme.radius);
    body.setAttribute("data-theme-radius", theme.radius);

    if (theme.radius !== "default") {
      body.setAttribute("data-theme-radius", theme.radius);
    } else {
      body.removeAttribute("data-theme-radius");
    }

    if (theme.preset !== "default") {
      setThemeCookie("theme_preset", theme.preset);
      body.setAttribute("data-theme-preset", theme.preset);
    } else {
      setThemeCookie("theme_preset", null);
      body.removeAttribute("data-theme-preset");
    }

    setThemeCookie("theme_content_layout", theme.contentLayout);
    body.setAttribute("data-theme-content-layout", theme.contentLayout);

    if (theme.scale !== "none") {
      setThemeCookie("theme_scale", theme.scale);
      body.setAttribute("data-theme-scale", theme.scale);
    } else {
      setThemeCookie("theme_scale", null);
      body.removeAttribute("data-theme-scale");
    }
  }, [theme.preset, theme.radius, theme.scale, theme.contentLayout]);

  // --- setTheme: LOCAL PREVIEW ONLY (cookies + body attributes) ---
  // TIDAK auto-save ke DB. Hanya Save eksplisit (appearance page) yg persist.
  // Ini mencegah profiles.theme terisi secara tak sengaja → menutupi tenant theme.
  const setTheme = (next: ThemeType) => {
    setThemeState(next);
  };

  // --- resetTheme: hapus profile.theme ({}) → tenant/default mewarisi ---
  const resetTheme = async () => {
    setThemeState({ ...DEFAULT_THEME });
    setThemeSource("default");
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ theme: {}, scope: "user" })
      });
      // Re-fetch utk apply tenant/default theme
      setTimeout(() => applyDbTheme(), 300);
    } catch {}
  };

  // --- saveTheme: persist current theme ke profiles.theme (explicit save) ---
  const saveTheme = async () => {
    setIsSaving(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ theme, scope: "user" })
      });
      setThemeSource("user");
    } catch {}
    setIsSaving(false);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resetTheme, saveTheme, isSaving, themeSource }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeConfig must be used within an ActiveThemeProvider");
  }
  return context;
}
