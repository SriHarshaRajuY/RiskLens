"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2)
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
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
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
              {form.formState.isSubmitting ? "Working..." : isRegister ? "Create account" : "Login"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Need a workspace?"}{" "}
            <Link className="font-medium text-primary" href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Login" : "Register"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
