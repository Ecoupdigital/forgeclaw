"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefineApp } from "@/components/refine/RefineApp";
import type {
  RefineArchetype,
  RefineMode,
  RefineSection,
} from "@/lib/refine-types";

const VALID_MODES: readonly RefineMode[] = [
  "default",
  "archetype",
  "section",
  "reset",
];
const VALID_ARCHETYPES: readonly RefineArchetype[] = [
  "solo-builder",
  "content-creator",
  "agency-freela",
  "ecom-manager",
  "generic",
];
const VALID_SECTIONS: readonly RefineSection[] = [
  "SOUL",
  "USER",
  "AGENTS",
  "TOOLS",
  "MEMORY",
  "STYLE",
  "HEARTBEAT",
];

function RefinePageInner() {
  const params = useSearchParams();

  const rawMode = params.get("mode") ?? "default";
  const rawArchetype = params.get("archetype");
  const rawSection = params.get("section");

  const mode: RefineMode = (VALID_MODES as readonly string[]).includes(rawMode)
    ? (rawMode as RefineMode)
    : "default";

  const archetype: RefineArchetype | undefined =
    rawArchetype && (VALID_ARCHETYPES as readonly string[]).includes(rawArchetype)
      ? (rawArchetype as RefineArchetype)
      : undefined;

  const section: RefineSection | undefined =
    rawSection && (VALID_SECTIONS as readonly string[]).includes(rawSection)
      ? (rawSection as RefineSection)
      : undefined;

  return <RefineApp mode={mode} archetype={archetype} section={section} />;
}

export default function RefinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-text-secondary">Carregando refine...</p>
        </div>
      }
    >
      <RefinePageInner />
    </Suspense>
  );
}
