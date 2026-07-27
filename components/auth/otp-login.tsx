"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTranslations } from "next-intl";
import { completeOtpLogin } from "@/lib/otp/client";

export function OtpLoginForm() {
  const t = useTranslations("otp");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextTarget = searchParams.get("next");

  const sendCode = async () => {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: email, channel: "email", purpose: "login" })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("sendError"));
      setSent(true);
    } catch (e: any) {
      setError(e.message || t("sendError"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: email, channel: "email", purpose: "login", code })
      });
      const data = await res.json();

      if (!res.ok || !data.valid) throw new Error(data.error || t("verifyError"));

      if (data.tokenHash) {
        const loginRes = await completeOtpLogin(data.tokenHash);
        if (!loginRes.ok) throw new Error(loginRes.error || t("verifyError"));
        router.push(nextTarget || "/");
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      setError(e.message || t("verifyError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!sent ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="otp-email">{t("email")}</Label>
            <Input
              id="otp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email")}
              disabled={busy}
            />
          </div>
          <Button onClick={sendCode} disabled={busy || !email} className="h-10 w-full">
            {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("sendCode")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{t("codeSent", { email })}</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button onClick={verify} disabled={busy || code.length < 6} className="h-10 w-full">
            {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("verify")}
          </Button>
          <Button variant="link" onClick={sendCode} disabled={busy} className="text-xs">
            {t("resend")}
          </Button>
        </>
      )}
    </div>
  );
}
