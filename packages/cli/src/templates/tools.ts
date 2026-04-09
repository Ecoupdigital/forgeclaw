export function toolsTemplate(): string {
  return `# TOOLS.md - Available Tools

## Built-in Tools

### File Operations
- Read, write, edit files in project directories
- Search files by name or content (glob, grep)

### Shell Execution
- Run commands in project directories
- Capture output for analysis

### Git Operations
- Status, diff, log, commit
- Branch management
- PR creation (via gh CLI)

### Project Management
- Detect project type (Node, Python, etc.)
- Run tests, builds, linters
- Manage dependencies

## Voice Tools

### Whisper Transcription
- Transcribe voice messages to text
- Supports multiple languages
- Requires OpenAI API key

## Integrations

### Telegram
- Send/receive messages
- File attachments
- Inline keyboards for confirmations

### Obsidian (Optional)
- Read/write notes
- Search vault
- Daily notes integration

## Adding Custom Tools

Tools can be extended via MCP servers.
Configure in forgeclaw.config.json under "mcpServers".
`
}
