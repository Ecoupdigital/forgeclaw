import { spawn } from "node:child_process";
import { requireApiAuth } from "@/lib/auth";

interface RuntimeStatus {
  name: "claude-code" | "codex";
  available: boolean;
  version: string | null;
  binary: string;
  error?: string;
}

function checkVersion(binary: string, timeoutMs = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(binary, ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      resolve(null);
    }, timeoutMs);

    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));

    proc.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve(null);
      const combined = (stdout + stderr).trim();
      const match = combined.match(/(\d+\.\d+\.\d+)/);
      resolve(match ? match[1] : combined.slice(0, 50));
    });
  });
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const [claudeVer, codexVer] = await Promise.all([
    checkVersion("claude"),
    checkVersion("codex"),
  ]);

  const runtimes: RuntimeStatus[] = [
    {
      name: "claude-code",
      available: claudeVer !== null,
      version: claudeVer,
      binary: "claude",
    },
    {
      name: "codex",
      available: codexVer !== null,
      version: codexVer,
      binary: "codex",
    },
  ];

  return Response.json({ runtimes });
}
