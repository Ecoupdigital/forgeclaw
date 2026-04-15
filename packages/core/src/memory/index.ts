export type {
  MemoryProvider,
  MemoryToolInput,
  MemoryToolResult,
  PrefetchResult,
  ProviderInitContext,
  ToolSchema,
} from './types';
export { MemoryManager, buildMemoryContextBlock, sanitizeContext } from './manager';
export { BuiltinMemoryStore } from './builtin-store';
export { BuiltinMemoryProvider } from './builtin-provider';
export { scanMemoryContent, isContentSafe } from './security-scanner';
export type { SecurityViolation, SecurityViolationKind } from './security-scanner';
export { runWriter } from './writer';
export { runJanitor } from './janitor';

// Singleton — used by the bot, dashboard API, and cron runners.
import { MemoryManager } from './manager';
import { BuiltinMemoryStore } from './builtin-store';
export const memoryManagerV2 = new MemoryManager();
memoryManagerV2.registerBuiltin(new BuiltinMemoryStore());
