"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mongoId } from "@/lib/mongo";
import type { Portfolio } from "@/types/portfolio";

const ACTIVE_PORTFOLIO_KEY = "risklens.activePortfolioId";

function readActivePortfolioId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(ACTIVE_PORTFOLIO_KEY) || undefined;
}

export function persistActivePortfolioId(portfolioId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_PORTFOLIO_KEY, portfolioId);
}

export function clearActivePortfolioId(portfolioId?: string): void {
  if (typeof window === "undefined") return;
  const current = readActivePortfolioId();
  if (!portfolioId || current === portfolioId) {
    window.localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
  }
}

export function useActivePortfolio(portfolios?: Portfolio[]) {
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | undefined>(() => readActivePortfolioId());

  const validPortfolioIds = useMemo(
    () => (portfolios ?? []).map((portfolio) => mongoId(portfolio._id)).filter((id): id is string => Boolean(id)),
    [portfolios]
  );

  const resolvedActivePortfolioId = useMemo(() => {
    if (!validPortfolioIds.length) return undefined;
    if (activePortfolioId && validPortfolioIds.includes(activePortfolioId)) return activePortfolioId;
    return validPortfolioIds[0];
  }, [activePortfolioId, validPortfolioIds]);

  useEffect(() => {
    if (!resolvedActivePortfolioId) {
      if (activePortfolioId && validPortfolioIds.length === 0) {
        clearActivePortfolioId(activePortfolioId);
        setActivePortfolioIdState(undefined);
      }
      return;
    }
    if (resolvedActivePortfolioId !== activePortfolioId) {
      persistActivePortfolioId(resolvedActivePortfolioId);
      setActivePortfolioIdState(resolvedActivePortfolioId);
    }
  }, [activePortfolioId, resolvedActivePortfolioId, validPortfolioIds.length]);

  const setActivePortfolioId = useCallback((portfolioId: string) => {
    persistActivePortfolioId(portfolioId);
    setActivePortfolioIdState(portfolioId);
  }, []);

  const activePortfolio = useMemo(
    () => (portfolios ?? []).find((portfolio) => mongoId(portfolio._id) === resolvedActivePortfolioId),
    [resolvedActivePortfolioId, portfolios]
  );

  return {
    activePortfolio,
    activePortfolioId: resolvedActivePortfolioId,
    setActivePortfolioId
  };
}
