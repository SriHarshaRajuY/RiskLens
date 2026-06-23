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
    <div className={cn("flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 lg:max-w-[58%]">
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-normal sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>

      {showControls ? (
        <div className="flex w-full flex-col gap-3 rounded-lg border bg-card/95 p-3 shadow-sm lg:w-auto lg:flex-row lg:items-center">
          {showSwitcher ? (
            <label className="flex min-w-0 flex-1 items-center gap-3 lg:min-w-[320px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <span className="sr-only">Workspace</span>
              <select
                className="h-11 min-w-0 flex-1 truncate rounded-md border bg-background px-3.5 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
            <Button asChild variant="outline" className="w-full shrink-0 justify-center lg:w-auto">
              <Link href={openHref}>
                {openLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

