/**
 * UPDetector: Detects UP commands and numbered options in Claude output,
 * transforming them into actionable buttons for the Telegram interface.
 */

export interface UPCommand {
  command: string;
  label: string;
}

export interface NumberedOption {
  number: number;
  text: string;
}

export interface ExtractedActions {
  upCommands: UPCommand[];
  numberedOptions: NumberedOption[];
}

class UPDetector {
  /**
   * Extract /up: commands from text.
   * Matches patterns like /up:executar-fase 3, /up:progresso, etc.
   */
  extractUPCommands(text: string): UPCommand[] {
    const regex = /\/up:[\w-]+(?:\s+\S+)*/g;
    const commands: UPCommand[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const command = match[0];
      commands.push({
        command,
        label: this.commandToLabel(command),
      });
    }

    return commands;
  }

  /**
   * Extract numbered options (1. Option text) from text.
   * Returns up to 10 options.
   */
  extractNumberedOptions(text: string): NumberedOption[] {
    const regex = /^(\d+)\.\s+(.+)$/gm;
    const options: NumberedOption[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null && options.length < 10) {
      options.push({
        number: parseInt(match[1], 10),
        text: match[2].trim(),
      });
    }

    return options;
  }

  /**
   * Extract all actionable items from text.
   */
  extractAllActions(text: string): ExtractedActions {
    return {
      upCommands: this.extractUPCommands(text),
      numberedOptions: this.extractNumberedOptions(text),
    };
  }

  /**
   * Returns a fixed grid of commonly used UP commands.
   * Used when user clicks the [UP] button.
   */
  getUPCommandsGrid(): UPCommand[] {
    return [
      { command: '/up:progresso', label: 'Progresso' },
      { command: '/up:planejar-fase', label: 'Planejar Fase' },
      { command: '/up:executar-fase', label: 'Executar Fase' },
      { command: '/up:verificar-trabalho', label: 'Verificar Trabalho' },
      { command: '/up:rapido', label: 'Rapido' },
      { command: '/up:depurar', label: 'Depurar' },
      { command: '/up:retomar', label: 'Retomar' },
      { command: '/up:pausar', label: 'Pausar' },
      { command: '/up:ajuda', label: 'Ajuda' },
    ];
  }

  /**
   * Convert a /up:command-name arg to a human-readable label.
   * Example: "/up:executar-fase 3" -> "Executar Fase 3"
   */
  private commandToLabel(command: string): string {
    // Remove the /up: prefix
    const withoutPrefix = command.replace(/^\/up:/, '');
    // Split command name from arguments
    const parts = withoutPrefix.split(/\s+/);
    const name = parts[0];
    const args = parts.slice(1).join(' ');

    // Convert hyphens to spaces and capitalize each word
    const label = name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const full = args ? `${label} ${args}` : label;
    // Truncate to 30 chars for Telegram button limits
    return full.length > 30 ? full.slice(0, 27) + '...' : full;
  }
}

export const upDetector = new UPDetector();
