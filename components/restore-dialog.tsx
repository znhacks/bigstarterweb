"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatToUserTimezone } from "@/lib/date";
import { useLocale } from "next-intl";
import {
  listDeletedUsers,
  listDeletedTenants,
  restoreUser,
  restoreTenant
} from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";

type Kind = "user" | "tenant";

interface DeletedRow {
  id: string;
  name: string;
  deleted_at: string | null;
}

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: Kind;

  onRestored?: () => void;
}

export function RestoreDialog({ open, onOpenChange, kind, onRestored }: RestoreDialogProps) {
  const t = useTranslations("common.restore");
  const locale = useLocale();
  const tz =
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const [rows, setRows] = useState<DeletedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = kind === "user" ? await listDeletedUsers() : await listDeletedTenants();
    if (res.data) {
      setRows(
        res.data.map((r: any) => ({
          id: r.id,
          name: r.full_name || r.name || "—",
          deleted_at: r.deleted_at
        }))
      );
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const res = kind === "user" ? await restoreUser(id) : await restoreTenant(id);
    setRestoringId(null);
    if (res.error) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    onRestored?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{kind === "user" ? t("deletedUsers") : t("deletedOrgs")}</DialogTitle>
          <DialogDescription>{t("desc")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{t("empty")}</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    {r.deleted_at && (
                      <p className="text-muted-foreground text-xs">
                        {t("deletedOn")}: {formatToUserTimezone(r.deleted_at, tz, locale)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoringId === r.id}
                    onClick={() => handleRestore(r.id)}
                    className="h-8 shrink-0">
                    {restoringId === r.id ? (
                      <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                    )}
                    {t("restore")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
