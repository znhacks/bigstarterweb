"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createRole } from "../actions";

export function NewRoleForm() {
  const t = useTranslations("superadmin.roles");
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createRole(fd);
    setPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.push("/superadmin/roles");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("new.title")}</h1>
      </div>

      <Card className="border-border/80 rounded-2xl">
        <CardHeader>
          <CardTitle>{t("new.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("new.nameLabel")}</Label>
            <Input id="name" name="name" required placeholder="Manager" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hierarchy_level">{t("new.hierarchyLabel")}</Label>
            <Input
              id="hierarchy_level"
              name="hierarchy_level"
              type="number"
              defaultValue={30}
              min={0}
            />
            <p className="text-muted-foreground text-xs">{t("new.hierarchyHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/superadmin/roles">{t("messages.cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("new.submit")}
        </Button>
      </div>
    </form>
  );
}
