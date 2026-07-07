"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSION_GROUPS } from "@/lib/rbac";
import { updateRole, deleteRole, setRolePermissions } from "../actions";

interface RoleEditorProps {
  role: { id: string; name: string; hierarchy_level: number };
  permissions: { id: string; name: string; description: string | null }[];
  grantedIds: string[];
}

export function RoleEditor({ role, permissions, grantedIds }: RoleEditorProps) {
  const t = useTranslations("superadmin.roles");
  const router = useRouter();

  const [savingRole, setSavingRole] = React.useState(false);
  const [savingPerms, setSavingPerms] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set(grantedIds));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingRole(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", role.id);
    const res = await updateRole(fd);
    setSavingRole(false);
    if (!res.success) setError(res.error);
  };

  const onSavePerms = async () => {
    setSavingPerms(true);
    setError(null);
    const res = await setRolePermissions(role.id, Array.from(selected));
    setSavingPerms(false);
    if (!res.success) setError(res.error);
  };

  const onDelete = async () => {
    if (!confirm(t("messages.confirmDelete"))) return;
    setDeleting(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", role.id);
    const res = await deleteRole(fd);
    setDeleting(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.push("/superadmin/roles");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{role.name}</h1>
        <Button asChild variant="outline">
          <Link href="/superadmin/roles">{t("messages.back")}</Link>
        </Button>
      </div>

      {error && (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {/* Edit role */}
      <form onSubmit={onSaveRole} className="space-y-4">
        <Card className="border-border/80 rounded-2xl">
          <CardHeader>
            <CardTitle>{t("detail.editTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("new.nameLabel")}</Label>
              <Input id="name" name="name" required defaultValue={role.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hierarchy_level">{t("new.hierarchyLabel")}</Label>
              <Input
                id="hierarchy_level"
                name="hierarchy_level"
                type="number"
                min={0}
                defaultValue={role.hierarchy_level}
              />
              <p className="text-muted-foreground text-xs">{t("new.hierarchyHint")}</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={savingRole}>
            {savingRole && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("detail.save")}
          </Button>
        </div>
      </form>

      {/* Permissions matrix */}
      <Card className="border-border/80 rounded-2xl">
        <CardHeader>
          <CardTitle>{t("detail.permissionsTitle")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("detail.permissionsDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {PERMISSION_GROUPS.map((group) => {
            const groupPerms = permissions.filter((p) => group.names.includes(p.name as any));
            if (groupPerms.length === 0) return null;
            return (
              <div key={group.domain} className="space-y-3">
                <h3 className="text-foreground text-sm font-semibold">{group.label}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {groupPerms.map((p) => (
                    <label
                      key={p.id}
                      htmlFor={p.id}
                      className="border-border/60 hover:bg-accent/40 flex items-start gap-3 rounded-xl border p-3 cursor-pointer">
                      <Checkbox
                        id={p.id}
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <p className="text-foreground text-sm font-medium">{p.name}</p>
                        {p.description && (
                          <p className="text-muted-foreground text-xs">{p.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={onSavePerms} disabled={savingPerms}>
              {savingPerms && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("detail.savePermissions")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-destructive">{t("detail.dangerTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">{t("detail.dangerDesc")}</p>
          <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            {t("messages.delete")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
