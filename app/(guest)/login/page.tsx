import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMeta } from "@/lib/utils";
import { LoginForm } from "./components/login-form";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoSandbox } from "./components/demosanbox";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Login",
  description: "Halaman ini menjelaskan tentang profil perusahaan kami."
});

export default function Page() {
  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Form Login Client Component */}
          <LoginForm />

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="fixed right-6 bottom-6 z-50">
        <DemoSandbox />
      </div>
    </div>
  );
}
