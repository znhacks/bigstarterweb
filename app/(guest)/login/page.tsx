import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMeta } from "@/lib/utils";
import { LoginForm } from "./components/login-form";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.login");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  const tlogin = useTranslations("guest.login");
  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">{tlogin("title")}</CardTitle>
          <CardDescription>{tlogin("desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Form Login Client Component */}
          <LoginForm />

          <div className="mt-4 text-center text-sm">
            {tlogin("noaccount?")}{" "}
            <Link href="/register" className="underline">
              {tlogin("signup")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
