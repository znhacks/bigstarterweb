"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, Building2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getCountryDefaults } from "@/lib/i18n/country-defaults";
import { LOCALE_COOKIE } from "@/i18n/routing";

import { countryRepository } from "@/supabase/repositories/countries";
import { AUTH_FEATURES } from "@/config/auth";
import { profileRepository } from "@/supabase/repositories/profiles";
import { setupRegistrationTenant } from "@/app/actions/tenant";

const COOKIE_OPTS = "path=/;max-age=31536000;SameSite=Lax";
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value};${COOKIE_OPTS}`;
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("guest.register");

  // Baca tujuan pengalihan & token/code dari URL (?next=..., ?code=..., ?token=...)
  const nextTarget = searchParams.get("next");
  const initialCode = searchParams.get("code") || searchParams.get("token") || "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("");

  // Options: "create" (Buat Tenant) vs "join" (Join dengan Kode)
  const [regType, setRegType] = useState<"create" | "join">(initialCode ? "join" : "create");
  const [orgName, setOrgName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [inviteCode, setInviteCode] = useState(initialCode);

  const [countries, setCountries] = useState<
    { id: number; name: string; iso2: string; currency: string | null; timezones: string | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    (async () => {
      const countriesRepo = await countryRepository(supabase);
      const { data } = await countriesRepo
        .query()
        .select("id, name, iso2, currency, timezones")
        .order("name", { ascending: true });

      if (data) setCountries(data as any);
    })();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAlreadyExists(false);

    if (regType === "create" && (!orgName || orgName.trim().length < 2)) {
      setErrorMsg(t("orgNameRequired"));
      setIsLoading(false);
      return;
    }

    if (regType === "join" && (!inviteCode || !inviteCode.trim())) {
      setErrorMsg(t("inviteCodeRequired"));
      setIsLoading(false);
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    try {
      // Pre-check invite code / org name validity BEFORE creating auth user
      if (regType === "join") {
        const preCheck = await setupRegistrationTenant({
          userId: "precheck",
          regType: "join",
          inviteCode
        });
        if (preCheck.error && !preCheck.error.includes("Pengguna tidak terautentikasi")) {
          setErrorMsg(preCheck.error);
          setIsLoading(false);
          return;
        }
      }

      const redirectUrl = nextTarget
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`
        : `${window.location.origin}/auth/callback`;

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectUrl
        }
      });

      if (authError) throw authError;

      if (data.user) {
        const row = countries.find((c) => c.iso2 === country);
        const defaults = getCountryDefaults(country);
        const currency = row?.currency || defaults.currency || "USD";
        let timezone = defaults.timezone || "UTC";
        try {
          const tzRaw = row?.timezones ? JSON.parse(row.timezones) : null;
          const first = Array.isArray(tzRaw) ? tzRaw[0] : null;
          timezone =
            (first?.zoneName as string) ||
            (typeof first === "string" ? first : timezone) ||
            timezone;
        } catch {}
        const locale = defaults.locale || "en";

        const profilesRepo = await profileRepository(supabase);
        await profilesRepo.insert({
          id: data.user.id,
          full_name: fullName,
          address_country: country || null,
          preferred_language: locale,
          timezone,
          currency
        });

        // Proses pembuatan/penyambungan tenant
        const tenantSetup = await setupRegistrationTenant({
          userId: data.user.id,
          regType,
          orgName,
          inviteCode,
          schoolCode
        });

        if (tenantSetup.error) {
          setErrorMsg(tenantSetup.error);
          setIsLoading(false);
          return;
        }

        try {
          await fetch("/api/welcome-mail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email,
              fullName
            })
          });
        } catch (welcomeError) {
          console.warn("Welcome email failed:", welcomeError);
        }

        if (country) {
          setCookie(LOCALE_COOKIE, locale);
          setCookie("USER_CURRENCY", currency);
          setCookie("USER_TIMEZONE", timezone);
        }

        setSuccessMsg(t("successText"));
      }
    } catch (err: any) {
      if (err?.message && /already registered/i.test(err.message)) {
        setAlreadyExists(true);
      } else {
        setErrorMsg(err.message || t("errorDefault"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || t("errorGoogle"));
    }
  };

  const handleGitHubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || t("errorGoogle"));
    }
  };

  return (
    <div className="grid gap-4">
      {/* Alert Error */}
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Alert Sukses */}
      {successMsg && (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>{t("success")}</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Alert Akun Sudah Ada */}
      {alreadyExists && (
        <Alert className="rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>{t("accountExistsTitle")}</AlertTitle>
          <AlertDescription>
            {t("accountExistsDesc")}{" "}
            <Link href="/login" className="font-semibold underline">
              {t("goToLogin")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleRegister} className="grid gap-4">
        {/* Switcher Tipe Pendaftaran Organisasi */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("registrationType")}
          </Label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setRegType("create")}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                regType === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <Building2 className="h-3.5 w-3.5" />
              <span>{t("optionCreateOrg")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRegType("join")}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                regType === "join"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t("optionJoinOrg")}</span>
            </button>
          </div>
        </div>

        {/* Input Dinamis berdasarkan Pilihan Organisasi */}
        {regType === "create" ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="org_name">{t("orgName")}</Label>
              <Input
                id="org_name"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t("orgNamePlaceholder")}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="school_code" className="text-xs text-muted-foreground font-medium">
                Kode Sekolah Jurnal Mengajar (Opsional)
              </Label>
              <Input
                id="school_code"
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="Contoh: SMKN11, SMKN4"
                disabled={isLoading}
                className="h-9 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="invite_code">{t("inviteCode")}</Label>
            <Input
              id="invite_code"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("inviteCodePlaceholder")}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="first_name">{t("firstName")}</Label>
          <Input
            id="first_name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t("firstName")}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t("country")}</Label>
          <SearchableSelect
            options={countries.map((c) => ({ value: c.iso2, label: c.name }))}
            value={country}
            onChange={setCountry}
            placeholder={t("selectCountry")}
            searchPlaceholder={t("selectCountry")}
            emptyText={t("countryNotFound")}
            disabled={isLoading || countries.length === 0}
          />
        </div>

        <Button type="submit" className="mt-2 h-10 w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("creatingAccount") : t("register")}
        </Button>
      </form>

      <div className="my-2">
        <div className="flex items-center gap-3">
          <div className="w-full border-t" />
          <span className="text-muted-foreground shrink-0 text-sm">{t("orContinueWith")}</span>
          <div className="w-full border-t" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Tombol Registrasi Google */}
        {AUTH_FEATURES.enableGoogle && (
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}>
            <svg viewBox="0 0 24 24" className="me-2 h-4 w-4">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("google")}
          </Button>
        )}
        {AUTH_FEATURES.enableGithub && (
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleGitHubSignIn}
            disabled={isLoading}>
            <GitHubLogoIcon className="me-2 h-4 w-4" />
            {t("github")}
          </Button>
        )}
      </div>
    </div>
  );
}
