# 12-01 SUMMARY: VoiceHandler Respects voiceProvider Config

**Status:** DONE
**Date:** 2026-04-15
**Commits:** a789481, 26a404f

## Tasks Completed

### Task 1: VoiceHandler config-aware (a789481)
- Added `import { getConfig } from './config'` to voice-handler.ts
- Modified `getProviders()` to accept `voiceProvider` parameter
- `voiceProvider: 'none'` returns empty array (voice disabled)
- `voiceProvider: 'groq'` only includes Groq provider
- `voiceProvider: 'openai'` only includes OpenAI provider
- `voiceProvider: undefined` preserves legacy behavior (all available keys)
- Error messages now indicate which specific API key is missing based on config
- `transcribe()` calls `getConfig()` on each invocation (supports hot-reload)

### Task 2: Bot early return for disabled voice (26a404f)
- Added `getConfig` import to bot voice handler
- Early check before file download: if `voiceProvider === 'none'`, reply with informative message and return
- No unnecessary download/processing when voice is disabled

### Task 3: Unit tests
- SKIPPED per execution instructions (no test files)

## Verification

### Build verification
- `bun build packages/core/src/voice-handler.ts --no-bundle` -- PASS
- `bun build packages/bot/src/handlers/voice.ts --no-bundle` -- PASS

## Files Changed
- `packages/core/src/voice-handler.ts` -- config-aware provider selection
- `packages/bot/src/handlers/voice.ts` -- early return when voice disabled

## Criteria Met
- [x] VoiceHandler reads voiceProvider from config via getConfig()
- [x] voiceProvider='none' disables voice completely (immediate error, no download)
- [x] voiceProvider='groq' uses only Groq, no fallback
- [x] voiceProvider='openai' uses only OpenAI, no fallback
- [x] voiceProvider=undefined preserves legacy behavior (tries all)
- [x] Error messages indicate which key is missing
- [x] Bot voice handler does early-return with friendly message when voice disabled
