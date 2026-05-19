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

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
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
      ? { name: "", email: "demo@risklens.dev", password: "risklens123" }
      : { email: "demo@risklens.dev", password: "risklens123" }
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
            {isRegister ? "Start a local analytics workspace." : "Use the seeded demo account after running the seed script."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isRegister ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
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
