"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { apiRequest, clearCsrfToken, jsonBody, setCsrfToken } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import type { AuthPayload, User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname ?? "/");

  useEffect(() => {
    let cancelled = false;

    if (isPublicRoute) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    apiRequest<AuthPayload>("/auth/me")
      .catch(async () => {
        const refreshed = await apiRequest<AuthPayload>("/auth/refresh", { method: "POST", skipAuthRefresh: true });
        if (!cancelled) setCsrfToken(refreshed.csrfToken);
        return apiRequest<AuthPayload>("/auth/me");
      })
      .then((payload) => {
        if (cancelled) return;
        setCsrfToken(payload.csrfToken);
        setUser(payload.user);
      })
      .catch(() => {
        if (cancelled) return;
        clearCsrfToken();
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPublicRoute]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async login(email: string, password: string) {
        const payload = await apiRequest<AuthPayload>("/auth/login", {
          method: "POST",
          body: jsonBody({ email, password })
        });
        setCsrfToken(payload.csrfToken);
        setUser(payload.user);
      },
      async register(name: string, email: string, password: string) {
        const payload = await apiRequest<AuthPayload>("/auth/register", {
          method: "POST",
          body: jsonBody({ name, email, password })
        });
        setCsrfToken(payload.csrfToken);
        setUser(payload.user);
      },
      async logout() {
        await apiRequest<{ loggedOut: boolean }>("/auth/logout", {
          method: "POST",
          skipAuthRefresh: true
        }).catch(() => undefined);
        clearCsrfToken();
        disconnectSocket();
        setUser(null);
      }
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
