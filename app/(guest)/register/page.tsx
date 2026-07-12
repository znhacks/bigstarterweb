import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMeta } from "@/lib/utils";
import { RegisterForm } from "./components/register-form"; // Import komponen Client Form
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { useTranslations } from "next-intl";

export async function generateMetadata() {
  const t = await getTranslations("metadata.register");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  const t = useTranslations("register")
  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Panggil Client Form yang terhubung ke Supabase di sini */}
          <RegisterForm />

          <div className="mt-4 text-center text-sm">
            {t("haveaccount")}
            {" "}
            <Link href="/login" className="underline">
              {t("login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
