import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMeta } from "@/lib/utils";
import { RegisterForm } from "./components/register-form"; // Import komponen Client Form

export async function generateMetadata() {
  return generateMeta({
    title: "Register Page v2",
    description:
      "A login form with email and password. There's an option to login with Google and a link to sign up if you don't have an account.",
    canonical: "/register/v2"
  });
}

export default function Page() {
  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Account</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Panggil Client Form yang terhubung ke Supabase di sini */}
          <RegisterForm />

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/dashboard/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
