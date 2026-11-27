"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { clearActivePortfolioId } from "@/hooks/useActivePortfolio";
import { apiRequest, clearCsrfToken, jsonBody, setCsrfToken } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
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
const USER_STORAGE_KEY = "risklens_user";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user: User | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(getStoredUser);
  const hasUserRef = useRef(Boolean(user));
  hasUserRef.current = Boolean(user);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname ?? "/");
  const [isLoading, setIsLoading] = useState(() => !getStoredUser() && !isPublicRoute);

  useEffect(() => {
    let cancelled = false;

    if (isPublicRoute) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Only set loading if we don't already have user data in state
    if (!hasUserRef.current) {
      setIsLoading(true);
    }

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
        storeUser(payload.user);
      })
      .catch(() => {
        if (cancelled) return;
        clearCsrfToken();
        setUser(null);
        storeUser(null);
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
        storeUser(payload.user);
        setIsLoading(false);
      },
      async register(name: string, email: string, password: string) {
        const payload = await apiRequest<AuthPayload>("/auth/register", {
          method: "POST",
          body: jsonBody({ name, email, password })
        });
        setCsrfToken(payload.csrfToken);
        setUser(payload.user);
        storeUser(payload.user);
        setIsLoading(false);
      },
      async logout() {
        await apiRequest<{ loggedOut: boolean }>("/auth/logout", {
          method: "POST",
          skipAuthRefresh: true
        }).catch(() => undefined);
        clearCsrfToken();
        clearActivePortfolioId();
        disconnectSocket();
        queryClient.clear();
        setUser(null);
        storeUser(null);
        setIsLoading(false);
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
