import { DashboardShell } from "@/components/dashboard-shell";
import { SessionsTab } from "@/components/sessions-tab";
import { CronsTab } from "@/components/crons-tab";
import { MemoryTab } from "@/components/memory-tab";
import { ConfigTab } from "@/components/config-tab";
import { HarnessTab } from "@/components/harness-tab";

export default function HomePage() {
  return (
    <DashboardShell
      sessionsTab={<SessionsTab />}
      cronsTab={<CronsTab />}
      memoryTab={<MemoryTab />}
      configTab={<ConfigTab />}
      harnessTab={<HarnessTab />}
    />
  );
}
