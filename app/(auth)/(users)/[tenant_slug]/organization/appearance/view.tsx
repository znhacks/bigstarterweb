"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, RotateCcw, Paintbrush, LayoutGrid, Ruler, Type } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { DEFAULT_THEME, THEMES, type ThemeType } from "@/lib/themes";
import { supabase } from "@/lib/supabase";

const RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
  { value: "default", label: "Default" }
] as const;

// Nilai peninjau statis agar tidak terpengaruh oleh variabel CSS global
const RADIUS_PREVIEWS = {
  none: { outer: "0px", inner: "0px" },
  sm: { outer: "4px", inner: "2px" },
  md: { outer: "8px", inner: "4px" },
  lg: { outer: "16px", inner: "8px" },
  xl: { outer: "24px", inner: "12px" },
  default: { outer: "8px", inner: "4px" }
} as const;

const SCALE_OPTIONS = [
  { value: "none", label: "Default", size: "text-sm" },
  { value: "sm", label: "Small", size: "text-xs" },
  { value: "md", label: "Medium", size: "text-sm" },
  { value: "lg", label: "Large", size: "text-base" }
] as const;

const LAYOUT_OPTIONS = [
  { value: "full", label: "Full Width" },
  { value: "boxed", label: "Boxed" }
] as const;

const getPresetColor = (preset: string) => {
  const colors: Record<string, string> = {
    default: "#09090b",
    zinc: "#71717a",
    slate: "#64748b",
    stone: "#78716c",
    gray: "#6b7280",
    neutral: "#737373",
    red: "#ef4444",
    rose: "#f43f5e",
    orange: "#f97316",
    green: "#22c55e",
    blue: "#3b82f6",
    yellow: "#eab308",
    violet: "#8b5cf6"
  };
  return colors[preset] || colors.default;
};

export function TenantAppearanceView({
  tenantId,
  tenantName
}: {
  tenantId: string;
  tenantName: string;
}) {
  const t = useTranslations("settings.appearance");
  const [theme, setThemeState] = useState<ThemeType>({ ...DEFAULT_THEME });
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Apply theme ke body (live preview) saat theme berubah
  useEffect(() => {
    const body = document.body;
    if (theme.preset !== "default") body.setAttribute("data-theme-preset", theme.preset);
    else body.removeAttribute("data-theme-preset");
    if (theme.radius !== "default") body.setAttribute("data-theme-radius", theme.radius);
    else body.removeAttribute("data-theme-radius");
    if (theme.scale !== "none") body.setAttribute("data-theme-scale", theme.scale);
    else body.removeAttribute("data-theme-scale");
    body.setAttribute("data-theme-content-layout", theme.contentLayout);
  }, [theme]);

  // Fetch tenant theme
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("tenants")
          .select("theme")
          .eq("id", tenantId)
          .maybeSingle();
        if (data?.theme && typeof data.theme === "object" && "preset" in data.theme) {
          setThemeState(data.theme as ThemeType);
          setIsCustom(true);
        }
      } catch {}
      setLoading(false);
    })();
  }, [tenantId]);

  const save = async () => {
    setSaving(true);
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
        body: JSON.stringify({ theme, scope: "tenant", tenantId })
      });
      setIsCustom(true);
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setSaving(false);
  };

  const reset = async () => {
    setThemeState({ ...DEFAULT_THEME });
    setSaving(true);
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
        body: JSON.stringify({ theme: {}, scope: "tenant", tenantId })
      });
      setIsCustom(false);
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 py-0">
      <div className="grid gap-6">
        {/* Preset Selection */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Paintbrush className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">{t("preset")}</CardTitle>
            </div>
            <CardDescription>
              Pilih warna tema utama untuk identitas organisasi Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {THEMES.map((themeOption) => {
                const isSelected = theme.preset === themeOption.value;
                const hasPreset = themeOption.value !== "default";
                return (
                  <button
                    key={themeOption.value}
                    type="button"
                    onClick={() => setThemeState({ ...theme, preset: themeOption.value as any })}
                    className={`hover:bg-accent/40 flex flex-col items-stretch gap-2 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary ring-primary/10 bg-accent/20 ring-2"
                        : "border-border/60 bg-transparent"
                    }`}>
                    <div
                      data-theme-preset={hasPreset ? themeOption.value : undefined}
                      className="bg-background border-border flex w-full items-center gap-1.5 rounded-lg border p-2 transition-colors">
                      <div className="bg-primary border-foreground/10 h-3.5 w-3.5 rounded-full border" />
                      <div className="bg-secondary h-2 w-2 rounded-full" />
                      <div className="bg-muted-foreground/20 h-1.5 flex-1 rounded" />
                    </div>
                    <span className="text-foreground/90 px-0.5 text-xs font-semibold">
                      {themeOption.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Radius Selection */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Ruler className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">{t("radius")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {RADIUS_OPTIONS.map((o) => {
                  const isSelected = theme.radius === o.value;
                  const preview = RADIUS_PREVIEWS[o.value];
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setThemeState({ ...theme, radius: o.value as any })}
                      className={`hover:bg-accent/40 flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}>
                      {/* Menggunakan inline style peninjau statis */}
                      <div
                        className="flex h-8 w-8 items-center justify-center border-2 border-dashed border-current transition-all"
                        style={{ borderRadius: preview.outer }}>
                        <div
                          className="h-3 w-3 bg-current transition-all"
                          style={{ borderRadius: preview.inner }}
                        />
                      </div>
                      <span className="text-xs font-medium">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Scale Selection */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Type className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">{t("scale")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {SCALE_OPTIONS.map((o) => {
                  const isSelected = theme.scale === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setThemeState({ ...theme, scale: o.value as any })}
                      className={`hover:bg-accent/40 flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}>
                      <span className={`font-bold tracking-tight ${o.size}`}>Aa</span>
                      <span className="text-xs">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Layout Selection */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">{t("layout")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {LAYOUT_OPTIONS.map((o) => {
                const isSelected = theme.contentLayout === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setThemeState({ ...theme, contentLayout: o.value as any })}
                    className={`hover:bg-accent/40 flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary ring-primary/10 bg-accent/10 ring-2"
                        : "border-border/60 bg-transparent"
                    }`}>
                    <div className="bg-muted/50 relative flex h-20 w-full items-center justify-center rounded-lg p-2">
                      {o.value === "full" ? (
                        <div className="border-foreground/10 bg-foreground/5 h-full w-full rounded border" />
                      ) : (
                        <div className="border-foreground/10 bg-foreground/5 h-full w-2/3 rounded border" />
                      )}
                    </div>
                    <span className="text-foreground/90 text-sm font-semibold">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">{t("tenantHelp")}</p>

        <div className="flex gap-3">
          {isCustom && (
            <Button
              variant="outline"
              onClick={reset}
              disabled={saving}
              className="border-border/80">
              <RotateCcw className="me-2 h-4 w-4" />
              {t("reset")}
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="shadow-sm">
            {saving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
