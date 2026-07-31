"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NOTIFICATION_CHANNELS } from "@/config/notification-definitions";
import { saveCategoryDefaults } from "../action";
import type { SuperadminCategory } from "../types";

type ChannelMap = Record<string, boolean>;

export function PreferencesView({ categories }: { categories: SuperadminCategory[] }) {
  const t = useTranslations("superadmin.notifications.preferences");
  const tRoot = useTranslations();
  const tNotif = useTranslations("notifications");

  const [state, setState] = React.useState<Record<string, ChannelMap>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, { ...c.defaultChannels }]))
  );

  const categoryLabel = (cat: SuperadminCategory) => {
    try {
      return tRoot(cat.labelKey);
    } catch {
      return cat.id;
    }
  };
  const channelLabel = (c: string) => {
    try {
      return tNotif(`channel.${c}`);
    } catch {
      return c;
    }
  };

  const handleToggle = async (categoryId: string, channel: string, value: boolean) => {
    const prev = state[categoryId] ?? {};
    const next = { ...prev, [channel]: value };
    setState((s) => ({ ...s, [categoryId]: next }));
    const res = await saveCategoryDefaults(categoryId, next);
    if (res.error) {
      toast.error(res.error);
      setState((s) => ({ ...s, [categoryId]: prev })); // rollback
    } else {
      toast.success(t("toastSaved"));
    }
  };

  return (
    <div className="mx-auto w-full space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("matrixTitle")}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("matrixDescription")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-start font-medium">{t("colCategory")}</th>
                  {NOTIFICATION_CHANNELS.map((c) => (
                    <th key={c.key} className="p-3 text-center font-medium">
                      {channelLabel(c.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{categoryLabel(cat)}</span>
                        {cat.isSystem && (
                          <Badge variant="outline" className="text-[10px]">
                            system
                          </Badge>
                        )}
                      </div>
                      {cat.description ? (
                        <p className="text-muted-foreground text-xs">{cat.description}</p>
                      ) : null}
                    </td>
                    {NOTIFICATION_CHANNELS.map((c) => (
                      <td key={c.key} className="p-3 text-center">
                        <Switch
                          checked={state[cat.id]?.[c.key] ?? false}
                          onCheckedChange={(v) => handleToggle(cat.id, c.key, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
