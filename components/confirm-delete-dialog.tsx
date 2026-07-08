"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul dialog. */
  title?: string;
  /** Deskripsi (boleh berisi {name}). */
  description?: string;
  /** Nama yang harus diketik setelah kata "delete" (mis. "Acme Inc"). */
  confirmName: string;
  /** Label tombol destruktif. */
  actionLabel?: string;
  /** Dipanggil saat konfirmasi (input cocok). */
  onConfirm: () => void | Promise<void>;
  /** State loading di tombol. */
  loading?: boolean;
}

/**
 * Dialog konfirmasi destruktif dgn "type-to-confirm":
 * user harus mengetik persis `delete {confirmName}` (case-insensitive, trim)
 * agar tombol hapus aktif.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmName,
  actionLabel,
  onConfirm,
  loading
}: ConfirmDeleteDialogProps) {
  const t = useTranslations("common.confirmDelete");
  const [value, setValue] = useState("");

  // Reset input setiap kali dialog dibuka.
  useEffect(() => {
    if (open) setValue("");
  }, [open, confirmName]);

  const required = useMemo(
    () => `delete ${confirmName}`.trim().toLowerCase(),
    [confirmName]
  );
  const matches = value.trim().toLowerCase() === required;

  const placeholder = t("placeholder", { phrase: `delete ${confirmName}` });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || t("description", { name: confirmName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-9"
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">{t("hint", { phrase: `delete ${confirmName}` })}</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || loading}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel || t("action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
