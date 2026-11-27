"use client";

import { useEffect, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceTabItem<T extends string = string> = {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: "default" | "danger";
};

export function useWorkspaceTab<T extends string>(validTabs: readonly T[], defaultTab: T): [T, (tab: T) => void] {
  const [activeTab, setActiveTab] = useState<T>(defaultTab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("tab") as T | null;
    if (param && validTabs.includes(param)) {
      setActiveTab(param);
    }
  }, [validTabs]);

  function selectTab(nextTab: T): void {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextTab === defaultTab) {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", nextTab);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  return [activeTab, selectTab];
}

export function WorkspaceTabs<T extends string>({
  tabs,
  activeTab,
  onChange
}: {
  tabs: ReadonlyArray<WorkspaceTabItem<T>>;
  activeTab: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="sticky top-16 z-[8] -mx-1 bg-background/95 px-1 pt-2 pb-2 backdrop-blur-md">
      <div
        role="tablist"
        aria-label="Workspace sections"
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card p-1.5 shadow-soft"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                isActive
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 ? (
                <span
                  className={cn(
                    "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tab.badgeTone === "danger"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-foreground"
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
