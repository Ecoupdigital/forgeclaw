"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "sessions", label: "Sessions" },
  { id: "crons", label: "Crons" },
  { id: "memory", label: "Memory" },
  { id: "config", label: "Config" },
  { id: "harness", label: "Harness" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DashboardShellProps {
  sessionsTab: ReactNode;
  cronsTab: ReactNode;
  memoryTab: ReactNode;
  configTab: ReactNode;
  harnessTab: ReactNode;
}

export function DashboardShell({
  sessionsTab,
  cronsTab,
  memoryTab,
  configTab,
  harnessTab,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const tabContent: Record<TabId, ReactNode> = {
    sessions: sessionsTab,
    crons: cronsTab,
    memory: memoryTab,
    config: configTab,
    harness: harnessTab,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-violet-dim bg-deep-space px-4">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-sm font-bold tracking-wider text-violet">
            FORGECLAW
          </h1>
          <span className="text-xs text-text-secondary">v0.1.0</span>
        </div>

        <nav
          className="flex items-center gap-1"
          role="tablist"
          aria-label="Dashboard navigation"
        >
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "bg-violet text-white hover:bg-violet/90"
                  : "text-text-secondary hover:text-text-body hover:bg-night-panel"
              }
            >
              {tab.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-text-secondary">Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 overflow-hidden"
        role="tabpanel"
        aria-label={`${activeTab} tab content`}
      >
        {tabContent[activeTab]}
      </main>
    </div>
  );
}
