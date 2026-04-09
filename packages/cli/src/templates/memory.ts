export function memoryTemplate(): string {
  return `# MEMORY.md - Memory System

## How Memory Works

ForgeClaw maintains context through:

### Short-term Memory
- Current conversation context
- Recent commands and results
- Active project state

### Long-term Memory
- Daily logs in ~/.forgeclaw/memory/DAILY/
- Project decisions and rationale
- User preferences learned over time

### Project Memory
- Per-project context stored in project directories
- Git history analysis for project understanding
- Dependency and architecture knowledge

## Memory Format

Daily logs follow this format:
\`\`\`
## YYYY-MM-DD

### Decisions
- [project] Decision made and why

### Tasks Completed
- [project] What was done

### Notes
- Observations, patterns, things to remember
\`\`\`

## Retrieval

Memory is retrieved based on:
1. Current project context
2. Semantic similarity to current task
3. Recency (recent memories weighted higher)
`
}
