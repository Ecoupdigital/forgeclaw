"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanCard } from "@/lib/types";

interface KanbanBoardProps {
  plans: PlanCard[];
}

const COLUMNS = [
  { id: "planned" as const, label: "Planned" },
  { id: "executing" as const, label: "Executing" },
  { id: "completed" as const, label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-text-secondary/20 text-text-secondary",
  executing: "bg-amber-500/20 text-amber-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

export function KanbanBoard({ plans }: KanbanBoardProps) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const items = plans.filter((p) => p.status === col.id);
        return (
          <div key={col.id} className="flex w-72 shrink-0 flex-col">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {col.label}
              </h3>
              <Badge
                variant="outline"
                className="h-5 border-violet-dim bg-violet/10 px-1.5 text-xs text-text-secondary"
              >
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-violet-dim/50 p-4 text-center text-xs text-text-secondary">
                  No items
                </div>
              )}
              {items.map((plan) => (
                <Card
                  key={plan.id}
                  className="border-violet-dim bg-deep-space hover:border-violet-glow transition-colors"
                >
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-text-secondary">
                        {plan.id}
                      </span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[plan.status]}`}>
                        {plan.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm text-text-primary">
                      {plan.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {plan.description}
                    </p>
                    {plan.agent && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-mono text-[10px] text-amber-400">
                          {plan.agent}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
