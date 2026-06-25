import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMeta } from "@/lib/utils";
import { LoginForm } from "./components/login-form"; // Impor Client Component login form

export function generateMetadata() {
  return generateMeta({
    title: "Login Page v2",
    description:
      "A login form with email and password. There's an option to login with Google and a link to sign up if you don't have an account.",
    canonical: "/login/v2"
  });
}

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
            <Link href="/dashboard/register" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
