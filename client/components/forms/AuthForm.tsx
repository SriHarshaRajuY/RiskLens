"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(254, "Email must be 254 characters or fewer")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(128, "Password must be 128 characters or fewer")
});

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be 80 characters or fewer")
      .regex(/^[A-Za-z][A-Za-z .'-]*[A-Za-z]$/, "Use letters, spaces, apostrophes, periods, or hyphens")
      .refine((value) => !/\s{2,}/.test(value), "Name cannot contain repeated spaces"),
    email: loginSchema.shape.email,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character")
      .refine((value) => !/\s/.test(value), "Password cannot contain spaces"),
    confirmPassword: z.string().min(1, "Confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

type AuthValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

function PasswordToggle({ visible, onToggle, label }: { visible: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      onClick={onToggle}
      aria-label={label}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function getPasswordStrength(checksPassed: number, hasValue: boolean): {
  label: string;
  segments: number;
  barClass: string;
  textClass: string;
} {
  if (!hasValue) {
    return { label: "Enter a password", segments: 0, barClass: "bg-slate-200", textClass: "text-slate-400" };
  }
  if (checksPassed <= 2) {
    return { label: "Weak", segments: 1, barClass: "bg-red-500", textClass: "text-red-600" };
  }
  if (checksPassed <= 4) {
    return { label: "Fair", segments: 2, barClass: "bg-amber-500", textClass: "text-amber-600" };
  }
  if (checksPassed === 5) {
    return { label: "Good", segments: 3, barClass: "bg-teal-500", textClass: "text-teal-700" };
  }
  return { label: "Strong", segments: 4, barClass: "bg-emerald-600", textClass: "text-emerald-700" };
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    mode: "onTouched",
    defaultValues: isRegister
      ? { name: "", email: "", password: "", confirmPassword: "" }
      : { email: "", password: "" }
  });

  const passwordValue = form.watch("password") ?? "";
  const confirmValue = form.watch("confirmPassword") ?? "";

  const passwordChecks = [
    { label: "8+ characters", valid: passwordValue.length >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(passwordValue) },
    { label: "Lowercase letter", valid: /[a-z]/.test(passwordValue) },
    { label: "Number", valid: /[0-9]/.test(passwordValue) },
    { label: "Special character", valid: /[^A-Za-z0-9]/.test(passwordValue) },
    { label: "No spaces", valid: passwordValue.length > 0 && !/\s/.test(passwordValue) }
  ];

  const checksPassed = passwordChecks.filter((c) => c.valid).length;
  const strength = getPasswordStrength(checksPassed, passwordValue.length > 0);
  const showChecklist = isRegister && (passwordFocused || passwordValue.length > 0 || Boolean(form.formState.errors.password));
  const passwordsMatch = isRegister && confirmValue.length > 0 && confirmValue === passwordValue;

  const passwordDescription =
    [form.formState.errors.password ? "password-error" : undefined, isRegister ? "password-requirements" : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  function handleKeyEvent(event: KeyboardEvent<HTMLInputElement>): void {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  async function onSubmit(values: AuthValues) {
    setSubmitError(null);
    try {
      const email = values.email.trim().toLowerCase();
      if (isRegister) {
        await register(values.name?.trim() ?? "", email, values.password);
      } else {
        await login(email, values.password);
      }
      router.replace("/dashboard");
    } catch (error) {
      const message = getApiErrorMessage(error, isRegister ? "Could not create account" : "Could not sign in");
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.12),transparent_32%),linear-gradient(135deg,#f5f7f2_0%,#eef5ed_50%,#f8fafc_100%)] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f5f7f2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            <span className="tracking-tight">RiskLens</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-white/80 hover:text-slate-950">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden bg-white/85 sm:inline-flex">
              <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create account"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="hidden lg:block animate-page-enter">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private portfolio workspace
          </div>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tight text-slate-950">
            {isRegister ? "Start tracking your portfolio with clarity." : "Welcome back to your portfolio workspace."}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
            Organize your trades, monitor exposure and drawdown thresholds, and review plain-English risk summaries in one calm place.
          </p>
          <div className="mt-8 grid max-w-md gap-3.5">
            {[
              {
                title: "Private by default",
                detail: "Your portfolios, trades, and alert settings stay strictly isolated to your account."
              },
              {
                title: "Effortless trade tracking",
                detail: "Upload spreadsheets or enter individual trades with automatic oversell protection."
              },
              {
                title: "Clear risk insights",
                detail: "Understand what drives your risk score without confusing jargon or guesswork."
              }
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md border-slate-200/90 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur animate-page-enter">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div className="inline-flex rounded-lg border bg-slate-100/80 p-1 text-xs font-medium">
                <Link
                  href="/login"
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-all",
                    !isRegister ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-all",
                    isRegister ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Sign up
                </Link>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">{isRegister ? "Create your account" : "Sign in to RiskLens"}</CardTitle>
              <CardDescription className="mt-1">
                {isRegister ? "Set up your private workspace in under a minute." : "Enter your email and password to open your dashboard."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {submitError ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs text-red-800 animate-in fade-in duration-150"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            ) : null}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {isRegister ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Alex Morgan"
                    autoComplete="name"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    aria-describedby={form.formState.errors.name ? "name-error" : undefined}
                    {...form.register("name")}
                  />
                  {form.formState.errors.name ? (
                    <p id="name-error" className="text-xs font-medium text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p id="email-error" className="text-xs font-medium text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {capsLockOn ? (
                    <span className="text-[11px] font-medium text-amber-700">Caps Lock is on</span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    className="pr-11"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={passwordDescription}
                    onKeyUp={handleKeyEvent}
                    onKeyDown={handleKeyEvent}
                    {...form.register("password", {
                      onBlur: () => setPasswordFocused(false)
                    })}
                    onFocus={() => setPasswordFocused(true)}
                  />
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    label={showPassword ? "Hide password" : "Show password"}
                  />
                </div>

                {form.formState.errors.password ? (
                  <p id="password-error" className="text-xs font-medium text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}

                {showChecklist ? (
                  <div
                    id="password-requirements"
                    className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 animate-in fade-in duration-150"
                    aria-label="Password requirements"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Password strength</span>
                      <span className={cn("font-semibold", strength.textClass)}>{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 rounded-full transition-colors duration-200",
                            step <= strength.segments ? strength.barClass : "bg-slate-200"
                          )}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5 text-xs">
                      {passwordChecks.map((check) => (
                        <span
                          key={check.label}
                          className={cn(
                            "flex items-center gap-1.5 transition-colors duration-150",
                            check.valid ? "font-medium text-emerald-700" : "text-slate-500"
                          )}
                        >
                          {check.valid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                          )}
                          {check.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {isRegister ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    {passwordsMatch ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Passwords match
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="pr-11"
                      aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                      aria-describedby={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
                      onKeyUp={handleKeyEvent}
                      onKeyDown={handleKeyEvent}
                      {...form.register("confirmPassword")}
                    />
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                      label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    />
                  </div>
                  {form.formState.errors.confirmPassword ? (
                    <p id="confirm-password-error" className="text-xs font-medium text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRegister ? "Creating workspace..." : "Signing in..."}
                  </>
                ) : isRegister ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-600">
              {isRegister ? "Already have an account?" : "New to RiskLens?"}{" "}
              <Link className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline" href={isRegister ? "/login" : "/register"}>
                {isRegister ? "Sign in" : "Create free account"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
