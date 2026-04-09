export function styleTemplate(): string {
  return `# STYLE.md - Communication Style Guide

## Default Tone

- Professional but friendly
- Concise and actionable
- Technical when appropriate

## Message Formatting

### Short responses (< 50 words)
Plain text, no formatting needed.

### Medium responses (50-200 words)
Use bullet points and bold for key terms.

### Long responses (> 200 words)
Use headers, code blocks, and structured formatting.

## Code Formatting

- Always use syntax-highlighted code blocks
- Include file path as comment when relevant
- Show only changed lines for diffs (use +/- prefix)

## Emoji Usage

- Minimal emoji in technical responses
- Status indicators: OK, WARN, ERROR prefixes
- No decorative emoji

## Language

- Default: Follow user's language
- Technical terms: Keep in English
- Variable/function names: Never translate

## Error Communication

- State what went wrong clearly
- Show the relevant error message
- Suggest concrete fix steps
- Offer to fix automatically when possible
`
}
