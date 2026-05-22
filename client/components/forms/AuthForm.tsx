"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Activity, ArrowLeft } from "lucide-react";
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

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const isRegister = mode === "register";
  const form = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
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
      if (isRegister) {
        await register(values.name ?? "", values.email, values.password);
      } else {
        await login(values.email, values.password);
      }
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Authentication failed"));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 text-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-400 text-slate-950">
            <Activity className="h-4 w-4" />
          </span>
          RiskLens
        </Link>
        <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </Button>
      </header>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
        <Card className="w-full max-w-md border-white/10 bg-white text-slate-950">
          <CardHeader>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <CardTitle>{isRegister ? "Create RiskLens account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isRegister ? "Start a secure analytics workspace." : "Log in to your portfolio risk workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={passwordDescription}
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
                {isRegister ? (
                  <div id="password-requirements" className="grid grid-cols-2 gap-2 text-xs text-muted-foreground" aria-label="Password requirements">
                    {passwordChecks.map((check) => (
                      <span key={check.label} className={check.valid ? "text-emerald-700" : undefined}>
                        {check.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {isRegister ? (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    aria-describedby={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword ? (
                    <p id="confirm-password-error" className="text-sm text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Working..." : isRegister ? "Create account" : "Log in"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Need a workspace?"}{" "}
              <Link className="font-medium text-primary" href={isRegister ? "/login" : "/register"}>
                {isRegister ? "Log in" : "Create account"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
