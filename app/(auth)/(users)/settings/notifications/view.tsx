"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  getPushPermission,
  isPushSupported,
  subscribePush,
  unsubscribePush
} from "@/lib/push/client";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "@/config/notification-definitions";
import {
  getEffectivePrefsAction,
  savePreferencesAction
} from "@/app/(auth)/(users)/notifications/action";

type ChannelMap = Record<string, boolean>;
type PrefMap = Record<string, ChannelMap>;

export function NotificationsPreferencesView() {
  const t = useTranslations("notifications");
  const tRoot = useTranslations();

  const [prefs, setPrefs] = React.useState<PrefMap>({});
  const [loading, setLoading] = React.useState(true);

  const [pushSupported] = React.useState(() => isPushSupported());
  const [pushPerm, setPushPerm] = React.useState(getPushPermission());
  const [pushBusy, setPushBusy] = React.useState(false);

  React.useEffect(() => {
    getEffectivePrefsAction()
      .then((p) => setPrefs((p as PrefMap) ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const categoryLabel = (id: string) => {
    try {
      return tRoot(`notifications.category.${id}`);
    } catch {
      return id;
    }
  };
  const channelLabel = (c: string) => {
    try {
      return t(`channel.${c}`);
    } catch {
      return c;
    }
  };
  const pushStateLabel = () => {
    if (pushPerm === "granted") return t("preferences.pushStateGranted");
    if (pushPerm === "denied") return t("preferences.pushStateDenied");
    if (pushPerm === "unsupported") return t("preferences.pushUnsupported");
    return t("preferences.pushStateDefault");
  };

  const refreshPushPerm = () => setPushPerm(getPushPermission());

  const handleEnablePush = async () => {
    setPushBusy(true);
    const res = await subscribePush();
    setPushBusy(false);
    refreshPushPerm();
    if (res.ok) toast.success(t("preferences.pushStateGranted"));
    else if (res.error === "permission-denied") toast.error(t("preferences.pushStateDenied"));
    else if (res.error === "unsupported" || res.error === "missing-vapid")
      toast.error(t("preferences.pushUnsupported"));
    else toast.error(res.error ?? "Error");
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    await unsubscribePush();
    setPushBusy(false);
    refreshPushPerm();
    toast.success(t("preferences.pushStateDefault"));
  };

  const handleToggle = async (category: string, channel: string, value: boolean) => {
    const prev = prefs[category] ?? {};
    const next = { ...prev, [channel]: value };
    const updated = { ...prefs, [category]: next };
    setPrefs(updated);
    try {
      await savePreferencesAction(updated);
      toast.success(t("preferences.toastSaved"));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
      setPrefs((p) => ({ ...p, [category]: prev }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Push card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="size-4" />
            <CardTitle className="text-base">{t("preferences.pushTitle")}</CardTitle>
          </div>
          <CardDescription>{t("preferences.pushDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {pushSupported ? (
              pushPerm === "granted" ? (
                <Bell className="size-4 text-emerald-500" />
              ) : (
                <BellOff className="text-muted-foreground size-4" />
              )
            ) : null}
            <span className="text-sm">{pushStateLabel()}</span>
          </div>
          {pushSupported ? (
            pushPerm === "granted" ? (
              <Button variant="outline" size="sm" onClick={handleDisablePush} disabled={pushBusy}>
                {t("preferences.pushDisable")}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleEnablePush}
                disabled={pushBusy || pushPerm === "denied"}>
                {pushBusy && <Spinner className="size-3.5" />}
                {t("preferences.pushEnable")}
              </Button>
            )
          ) : (
            <Badge variant="secondary" className="text-xs">
              {t("preferences.pushUnsupported")}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Channel matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("preferences.matrixTitle")}</CardTitle>
          <CardDescription>{t("preferences.matrixDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground p-6 text-center text-sm">…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-start font-medium">{t("preferences.colCategory")}</th>
                    {NOTIFICATION_CHANNELS.map((c) => (
                      <th key={c.key} className="p-3 text-center font-medium">
                        {channelLabel(c.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_CATEGORIES.map((cat) => (
                    <tr key={cat.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{categoryLabel(cat.id)}</td>
                      {NOTIFICATION_CHANNELS.map((c) => (
                        <td key={c.key} className="p-3 text-center">
                          <Switch
                            checked={prefs[cat.id]?.[c.key] ?? false}
                            onCheckedChange={(v) => handleToggle(cat.id, c.key, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
