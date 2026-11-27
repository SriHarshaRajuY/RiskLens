"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mongoId } from "@/lib/mongo";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/types/portfolio";

type WorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  portfolios?: Portfolio[];
  activePortfolioId?: string;
  onPortfolioChange?: (portfolioId: string) => void;
  openHref?: string;
  openLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  portfolios = [],
  activePortfolioId,
  onPortfolioChange,
  openHref,
  openLabel = "Open workspace",
  actions,
  className
}: WorkspaceHeaderProps) {
  const portfolioOptions = portfolios
    .map((portfolio) => ({ id: mongoId(portfolio._id), name: portfolio.name }))
    .filter((portfolio): portfolio is { id: string; name: string } => Boolean(portfolio.id));

  const showSwitcher = portfolioOptions.length > 1 && activePortfolioId && onPortfolioChange;
  const showControls = showSwitcher || openHref || actions;

  return (
    <div className={cn("flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 lg:max-w-[56%]">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>

      {showControls ? (
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          {showSwitcher ? (
            <label className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg border bg-card px-3 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:min-w-[240px]">
              <BriefcaseBusiness className="h-4 w-4 shrink-0 text-primary" />
              <span className="sr-only">Workspace</span>
              <select
                className="h-full min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-foreground outline-none"
                value={activePortfolioId}
                onChange={(event) => onPortfolioChange(event.target.value)}
                aria-label="Workspace"
              >
                {portfolioOptions.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {openHref ? (
            <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
              <Link href={openHref}>
                {openLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
