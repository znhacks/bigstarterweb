"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteRole } from "./actions";

export interface RoleRow {
  id: string;
  name: string;
  hierarchy_level: number;
  members_count: number;
  permissions_count: number;
}

export function RolesList({ rows }: { rows: RoleRow[] }) {
  const t = useTranslations("superadmin.roles");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    setPendingId(id);
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    const res = await deleteRole(fd);
    setPendingId(null);
    if (!res.success) setError(res.error);
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <div className="border-border/80 overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("list.name")}</TableHead>
              <TableHead>{t("list.hierarchy")}</TableHead>
              <TableHead>{t("list.members")}</TableHead>
              <TableHead>{t("list.permissions")}</TableHead>
              <TableHead className="text-end">{t("list.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  {t("list.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/superadmin/roles/${r.id}`} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">h{r.hierarchy_level}</Badge>
                  </TableCell>
                  <TableCell>{r.members_count}</TableCell>
                  <TableCell>{r.permissions_count}</TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/superadmin/roles/${r.id}`} title={t("detail.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        disabled={pendingId === r.id}
                        title={t("messages.delete")}>
                        {pendingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="text-destructive h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
