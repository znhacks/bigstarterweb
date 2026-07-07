"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2Icon, MailIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Impor klien Supabase Anda
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

type FormValues = z.infer<typeof formSchema>;

export default function Page() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Menentukan URL redirect dinamis setelah user menekan link verifikasi reset di email mereka.
      // Mereka akan otomatis diarahkan ke halaman pengaturan keamanan untuk membuat password baru.
      const redirectToUrl = `${window.location.origin}/auth/callback?next=/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectToUrl
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Reset instructions sent! Please check your inbox.");
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset instructions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we&#39;ll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2Icon className="h-6 w-6 animate-bounce text-emerald-600" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kami telah sukses mengirimkan instruksi penyetelan ulang kata sandi ke email Anda.
                Silakan periksa folder inbox atau spam Anda.
              </p>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="mt-2 w-full">
                Resend Email
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email" className="sr-only">
                        Email address
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <MailIcon className="absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 transform opacity-30" />
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            autoComplete="email"
                            disabled={isSubmitting}
                            className="h-10 w-full ps-10"
                            placeholder="Enter your email address"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground inline-flex items-center gap-0.5 font-semibold hover:underline">
              Log in <ArrowLeft className="h-3 w-3 rotate-180 rtl:rotate-0" />
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Impor ikon pendukung sukses tambahan
import { CheckCircle2 as CheckCircle2Icon } from "lucide-react";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
