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
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be under 80 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number")
});

type AuthValues = {
  name?: string;
  email: string;
  password: string;
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const isRegister = mode === "register";
  const form = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: isRegister
      ? { name: "", email: "", password: "" }
      : { email: "", password: "" }
  });

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
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
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
