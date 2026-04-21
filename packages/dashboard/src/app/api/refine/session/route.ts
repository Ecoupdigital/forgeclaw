/**
 * POST /api/refine/session
 *   Creates a new refine interview session and returns its snapshot.
 *
 * GET /api/refine/session?sessionId=<id>
 *   Retrieves the current state of an active session.
 *
 * Auth: required (cookie fc-token or Authorization Bearer). Dashboard auto-
 * login via `?token=` in /refine page sets the cookie before any fetch, so
 * server-side we always validate against the cookie here.
 */

import { requireApiAuth } from "@/lib/auth";
import {
  getRefineStore,
  runRefineStart,
} from "@/lib/refine-sessions";
import type {
  RefineApiError,
  RefineCreateSessionBody,
  RefineArchetype,
  RefineSection,
  RefineMode,
} from "@/lib/refine-types";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FORGECLAW_DIR } from "@/lib/onboarding-state";

const VALID_MODES: readonly RefineMode[] = ["default", "archetype", "section", "reset"];
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

const CONFIG_PATH = join(FORGECLAW_DIR, "forgeclaw.config.json");

/**
 * Resolve the archetype from forgeclaw.config.json. Used when the POST body
 * does not specify one (default/section/reset modes reuse the current
 * archetype; only 'archetype' mode takes it from the body).
 */
function resolveConfigArchetype(): RefineArchetype | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const slug = parsed.archetype;
    if (typeof slug === "string" && VALID_ARCHETYPES.includes(slug as RefineArchetype)) {
      return slug as RefineArchetype;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let body: RefineCreateSessionBody;
  try {
    body = (await request.json()) as RefineCreateSessionBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" } satisfies RefineApiError,
      { status: 400 },
    );
  }

  // Validate mode
  if (!VALID_MODES.includes(body.mode)) {
    return Response.json(
      {
        error: `Invalid mode '${String(body.mode)}'. Valid: ${VALID_MODES.join(", ")}`,
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  // Resolve archetype
  let archetype: RefineArchetype;
  if (body.mode === "archetype") {
    // Must be specified when switching archetype
    if (!body.archetype || !VALID_ARCHETYPES.includes(body.archetype)) {
      return Response.json(
        {
          error: `mode='archetype' requires a valid archetype. Valid: ${VALID_ARCHETYPES.join(", ")}`,
          code: "INVALID_INPUT",
        } satisfies RefineApiError,
        { status: 400 },
      );
    }
    archetype = body.archetype;
  } else {
    // Reuse current archetype from config
    if (body.archetype && VALID_ARCHETYPES.includes(body.archetype)) {
      archetype = body.archetype;
    } else {
      const fromConfig = resolveConfigArchetype();
      if (!fromConfig) {
        return Response.json(
          {
            error:
              "No archetype configured. Run `forgeclaw install` or pass archetype explicitly.",
            code: "NO_ARCHETYPE",
          } satisfies RefineApiError,
          { status: 409 },
        );
      }
      archetype = fromConfig;
    }
  }

  // Validate section when mode === 'section'
  let section: RefineSection | null = null;
  if (body.mode === "section") {
    if (!body.section || !VALID_SECTIONS.includes(body.section)) {
      return Response.json(
        {
          error: `mode='section' requires a valid section. Valid: ${VALID_SECTIONS.join(", ")}`,
          code: "INVALID_INPUT",
        } satisfies RefineApiError,
        { status: 400 },
      );
    }
    section = body.section;
  }

  try {
    const snapshot = await runRefineStart({
      archetype,
      mode: body.mode,
      section,
    });
    return Response.json(snapshot);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[refine/session] start failed:", message);
    return Response.json(
      {
        error: `Failed to start refine session: ${message}`,
        code: "INTERVIEWER_FAILED",
      } satisfies RefineApiError,
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json(
      {
        error: "Query param 'sessionId' is required",
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  const store = getRefineStore();
  const snapshot = store.toSnapshot(sessionId);
  if (!snapshot) {
    return Response.json(
      {
        error: `Session not found or expired: ${sessionId}`,
        code: "NO_SESSION",
      } satisfies RefineApiError,
      { status: 404 },
    );
  }
  return Response.json(snapshot);
}
