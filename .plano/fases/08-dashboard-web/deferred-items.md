# Deferred Items - Phase 08 Dashboard Web

Issues encountered during plan execution that are out of scope for the current plan.

## Pre-existing TypeScript errors

### sessions-tab.tsx (line 185)

```
src/components/sessions-tab.tsx(185,9): error TS2322:
Type '{ id: number; threadId: null; chatId: number; name: string; projectDir: string | null; sessionId: string; }[]'
is not assignable to type 'TopicInfo[]'.
Property 'createdAt' is missing in type ... but required in type 'TopicInfo'.
```

- **Discovered during:** 08-01 task 4 (typecheck dashboard)
- **Cause:** Pre-existing — exists on `main` before 08-01 changes (verified via git stash)
- **Fix needed:** Either add `createdAt` to the inline TopicInfo objects in sessions-tab or relax the TopicInfo type
- **Owner:** Whichever plan covers the sessions tab (not in 08 cron-focused scope)
