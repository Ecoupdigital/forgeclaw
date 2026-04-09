export function agentsTemplate(): string {
  return `# AGENTS.md - Available AI Agents

## Default Agents

### General Assistant
- **Trigger:** Default for all messages
- **Capabilities:** Chat, Q&A, general tasks
- **Model:** Claude Sonnet (fast)

### Code Agent
- **Trigger:** /code command or code-related requests
- **Capabilities:** Write, review, debug, refactor code
- **Model:** Claude Opus (thorough)

### DevOps Agent
- **Trigger:** /deploy, /infra commands
- **Capabilities:** Deployment, infrastructure, CI/CD
- **Model:** Claude Sonnet

## Agent Routing

Messages are routed to agents based on:
1. Explicit command prefix (/code, /deploy)
2. Content analysis (code snippets, technical terms)
3. Conversation context (ongoing coding session)

## Custom Agents

Add custom agents by creating files in ~/.forgeclaw/agents/
Format: YAML frontmatter + markdown instructions
`
}
