"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, jsonBody, setStoredToken, getStoredToken } from "@/lib/api";
import type { AuthPayload, User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setToken(stored);
    apiRequest<{ user: User }>("/auth/me", { token: stored })
      .then((payload) => setUser(payload.user))
      .catch(() => {
        setStoredToken(null);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      async login(email: string, password: string) {
        const payload = await apiRequest<AuthPayload>("/auth/login", {
          method: "POST",
          body: jsonBody({ email, password })
        });
        setStoredToken(payload.token);
        setToken(payload.token);
        setUser(payload.user);
      },
      async register(name: string, email: string, password: string) {
        const payload = await apiRequest<AuthPayload>("/auth/register", {
          method: "POST",
          body: jsonBody({ name, email, password })
        });
        setStoredToken(payload.token);
        setToken(payload.token);
        setUser(payload.user);
      },
      logout() {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      }
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
