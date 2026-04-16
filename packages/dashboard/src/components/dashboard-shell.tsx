"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Clock,
  Brain,
  Settings,
  FileCode,
  Webhook,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Coins,
  Activity,
} from "lucide-react";

const TABS = [
  { id: "sessions", label: "Sessões", icon: MessageSquare },
  { id: "crons", label: "Automações", icon: Clock },
  { id: "memory", label: "Memória", icon: Brain },
  { id: "config", label: "Configurações", icon: Settings },
  { id: "harness", label: "Personalidade", icon: FileCode },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "tokens", label: "Tokens", icon: Coins },
  { id: "activity", label: "Atividade", icon: Activity },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DashboardShellProps {
  sessionsTab: ReactNode;
  cronsTab: ReactNode;
  memoryTab: ReactNode;
  configTab: ReactNode;
  harnessTab: ReactNode;
  webhooksTab: ReactNode;
  tokensTab: ReactNode;
  activityTab: ReactNode;
}

export function DashboardShell({
  sessionsTab,
  cronsTab,
  memoryTab,
  configTab,
  harnessTab,
  webhooksTab,
  tokensTab,
  activityTab,
}: DashboardShellProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("sessions");
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("fc:sidebar");
    return saved !== null ? saved === "1" : true;
  });

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("fc:sidebar", next ? "1" : "0");
      return next;
    });
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Intercept 401 responses globally to redirect to login.
  // This covers expired/invalid tokens detected by API routes.
  useEffect(() => {
    const originalFetch = window.fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        // Avoid redirect loop for auth endpoints themselves
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
        if (!url.includes("/api/auth/")) {
          window.location.href = "/login";
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const tabContent: Record<TabId, ReactNode> = {
    sessions: sessionsTab,
    crons: cronsTab,
    memory: memoryTab,
    config: configTab,
    harness: harnessTab,
    webhooks: webhooksTab,
    tokens: tokensTab,
    activity: activityTab,
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={`flex h-full shrink-0 flex-col border-r border-white/[0.06] bg-deep-space transition-[width] duration-200 ${
          expanded ? "w-44" : "w-14"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 w-full items-center px-3">
          <div className={`flex items-center gap-2.5 ${expanded ? "" : "justify-center w-full"}`}>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-violet/20 blur-md" />
              <span className="relative font-mono text-sm font-semibold text-violet">
                FC
              </span>
            </div>
            {expanded && (
              <span className="font-mono text-xs font-medium tracking-wider text-text-body">
                forgeclaw
              </span>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className={`h-px bg-white/[0.06] ${expanded ? "mx-3" : "mx-3"}`} />

        {/* Nav */}
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-2" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                title={expanded ? undefined : tab.label}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 transition-all duration-150 ${
                  isActive
                    ? "bg-violet/15 text-violet"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-body"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-violet" />
                )}
                <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                {expanded && (
                  <span className="text-xs font-medium truncate">
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: toggle + status */}
        <div className="flex flex-col items-center gap-3 pb-4 px-2">
          <button
            onClick={toggleExpanded}
            className="flex h-8 w-full items-center justify-center rounded-md text-text-disabled hover:bg-white/[0.04] hover:text-text-secondary transition-colors"
            aria-label={expanded ? "Recolher barra lateral" : "Expandir barra lateral"}
          >
            {expanded ? (
              <PanelLeftClose size={14} strokeWidth={1.5} />
            ) : (
              <PanelLeftOpen size={14} strokeWidth={1.5} />
            )}
          </button>
          <div className="relative">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="absolute inset-0 inline-block h-2 w-2 animate-ping rounded-full bg-emerald-500/40" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-deep-space/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-secondary">$&gt;</span>
            <span className="font-mono text-xs text-text-body">
              forgeclaw
            </span>
            <span className="font-mono text-xs text-violet">
              /{activeTab}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-secondary">
              v0.1.0
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-body transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
              title="Sair"
            >
              <LogOut size={12} strokeWidth={1.5} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-hidden"
          role="tabpanel"
          aria-label={`${activeTab} tab content`}
        >
          {tabContent[activeTab]}
        </main>
      </div>
    </div>
  );
}
