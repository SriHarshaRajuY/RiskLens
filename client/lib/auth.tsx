"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<AuthPayload>("/auth/me")
      .catch(async () => {
        const refreshed = await apiRequest<AuthPayload>("/auth/refresh", { method: "POST", skipAuthRefresh: true });
        setCsrfToken(refreshed.csrfToken);
        return apiRequest<AuthPayload>("/auth/me");
      })
      .then((payload) => {
        setCsrfToken(payload.csrfToken);
        setUser(payload.user);
      })
      .catch(() => {
        clearCsrfToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

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
