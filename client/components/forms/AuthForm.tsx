"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Activity, ArrowLeft, Check, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api";

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

const registerSchema = z.object({
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
}).refine((values) => values.password === values.confirmPassword, {
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
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      onClick={onToggle}
      aria-label={label}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    mode: "onTouched",
    defaultValues: isRegister
      ? { name: "", email: "", password: "", confirmPassword: "" }
      : { email: "", password: "" }
  });
  const passwordValue = form.watch("password") ?? "";
  const passwordChecks = [
    { label: "8+ characters", valid: passwordValue.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(passwordValue) },
    { label: "Lowercase", valid: /[a-z]/.test(passwordValue) },
    { label: "Number", valid: /[0-9]/.test(passwordValue) },
    { label: "Special character", valid: /[^A-Za-z0-9]/.test(passwordValue) },
    { label: "No spaces", valid: passwordValue.length > 0 && !/\s/.test(passwordValue) }
  ];
  const passwordDescription = [
    form.formState.errors.password ? "password-error" : undefined,
    isRegister ? "password-requirements" : undefined
  ].filter(Boolean).join(" ") || undefined;

  async function onSubmit(values: AuthValues) {
    try {
      const email = values.email.trim().toLowerCase();
      if (isRegister) {
        await register(values.name?.trim() ?? "", email, values.password);
      } else {
        await login(email, values.password);
      }
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, isRegister ? "Could not create account" : "Could not log in"));
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-slate-950">
      <header className="border-b border-slate-200/80 bg-[#f5f7f2]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            RiskLens
          </Link>
          <Button asChild variant="ghost" className="text-slate-700 hover:bg-white hover:text-slate-950">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private portfolio access
          </div>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-normal text-slate-950">
            {isRegister ? "Create your portfolio workspace." : "Welcome back to your portfolio workspace."}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            Keep trades, alerts, activity, and risk insights organized in one private workspace.
          </p>
          <div className="mt-8 grid max-w-md gap-3">
            {[
              "Your portfolio stays private",
              "Trades and alerts stay organized",
              "Clear checks before saving changes"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle>{isRegister ? "Create account" : "Sign in"}</CardTitle>
            <CardDescription>
              {isRegister ? "Create your account to start tracking portfolios." : "Enter your email and password to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {isRegister ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    aria-describedby={form.formState.errors.name ? "name-error" : undefined}
                    {...form.register("name")}
                  />
                  {form.formState.errors.name ? (
                    <p id="name-error" className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p id="email-error" className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    className="pr-11"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={passwordDescription}
                    {...form.register("password")}
                  />
                  <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} label={showPassword ? "Hide password" : "Show password"} />
                </div>
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
                {isRegister ? (
                  <div id="password-requirements" className="grid grid-cols-2 gap-2 text-xs text-slate-500" aria-label="Password requirements">
                    {passwordChecks.map((check) => (
                      <span key={check.label} className={check.valid ? "font-medium text-emerald-700" : undefined}>
                        {check.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {isRegister ? (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="pr-11"
                      aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                      aria-describedby={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
                      {...form.register("confirmPassword")}
                    />
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                      label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    />
                  </div>
                  {form.formState.errors.confirmPassword ? (
                    <p id="confirm-password-error" className="text-sm text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Working..." : isRegister ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">
              {isRegister ? "Already have an account?" : "Need a workspace?"} {" "}
              <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href={isRegister ? "/login" : "/register"}>
                {isRegister ? "Sign in" : "Create account"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}