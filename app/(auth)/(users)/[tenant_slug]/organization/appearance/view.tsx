// app/(auth)/(users)/[tenant_slug]/organization/appearance/view.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { DEFAULT_THEME, THEMES, type ThemeType } from "@/lib/themes";
import { supabase } from "@/lib/supabase";

const RADIUS_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" }
];

const SCALE_OPTIONS = [
  { value: "none", label: "Default" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" }
];

const LAYOUT_OPTIONS = [
  { value: "full", label: "Full Width" },
  { value: "boxed", label: "Boxed" }
];

export function TenantAppearanceView({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
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
        const { data } = await supabase.from("tenants").select("theme").eq("id", tenantId).maybeSingle();
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ theme, scope: "tenant", tenantId })
      });
      setIsCustom(true);
      // Notify ActiveThemeProvider utk re-fetch (apply tenant theme ke semua member)
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setSaving(false);
  };

  const reset = async () => {
    setThemeState({ ...DEFAULT_THEME });
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Kirim {} (kosong) → hapus tenant theme → user/default mewarisi
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
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
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-8">
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold">{t("tenantTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("tenantDesc")}</p>
        <Badge variant="outline" className="mt-2">
          {isCustom ? t("sourceTenant") : t("sourceDefault")}
        </Badge>
      </div>

      <Card className="border-border/80 rounded-2xl border shadow-sm">
        <CardContent className="space-y-6 p-6">
          {/* Preset */}
          <div className="space-y-2">
            <Label>{t("preset")}</Label>
            <Select value={theme.preset} onValueChange={(v) => setThemeState({ ...theme, preset: v as any })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <Label>{t("radius")}</Label>
            <Select value={theme.radius} onValueChange={(v) => setThemeState({ ...theme, radius: v as any })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <Label>{t("scale")}</Label>
            <Select value={theme.scale} onValueChange={(v) => setThemeState({ ...theme, scale: v as any })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCALE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Content Layout */}
          <div className="space-y-2">
            <Label>{t("layout")}</Label>
            <Select value={theme.contentLayout} onValueChange={(v) => setThemeState({ ...theme, contentLayout: v as any })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">{t("tenantHelp")}</p>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          <Save className="me-2 h-4 w-4" />
          {t("save")}
        </Button>
        {isCustom && (
          <Button variant="outline" onClick={reset} disabled={saving}>
            {t("reset")}
          </Button>
        )}
      </div>
    </div>
  );
}
