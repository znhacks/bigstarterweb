"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatToUserTimezone } from "@/lib/date";
import { restoreOwnAccount } from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";

export function RestoreView({ deletedAt }: { deletedAt: string | null }) {
  const t = useTranslations("guest.restore");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tz =
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    const res = await restoreOwnAccount();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    router.push("/");
  };

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
            <RotateCcw className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
          {deletedAt && (
            <p className="text-muted-foreground text-xs">
              {t("deletedOn")}: {formatToUserTimezone(deletedAt, tz, locale)}
            </p>
          )}
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button onClick={handleRestore} disabled={loading} className="w-full">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("restore")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
