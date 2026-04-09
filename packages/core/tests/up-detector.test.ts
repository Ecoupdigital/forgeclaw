import { describe, it, expect } from 'vitest';
import { upDetector } from '../src/up-detector';

describe('UPDetector', () => {
  describe('extractUPCommands', () => {
    it('deve extrair comando simples', () => {
      // The regex /\/up:[\w-]+(?:\s+\S+)*/g greedily matches trailing non-space words
      const commands = upDetector.extractUPCommands('/up:progresso');

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('/up:progresso');
      expect(commands[0].label).toBe('Progresso');
    });

    it('deve extrair comando em contexto de frase (inclui trailing words)', () => {
      // The regex captures trailing words as arguments
      const commands = upDetector.extractUPCommands('Use /up:progresso para ver');

      expect(commands).toHaveLength(1);
      // Regex captures: /up:progresso para ver
      expect(commands[0].command).toMatch(/^\/up:progresso/);
    });

    it('deve extrair comando com argumento', () => {
      const commands = upDetector.extractUPCommands('Execute /up:executar-fase 3');

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('/up:executar-fase 3');
      expect(commands[0].label).toBe('Executar Fase 3');
    });

    it('deve extrair multiplos comandos', () => {
      // Comma after command stops the greedy \S+ match
      const text = 'Opcoes: /up:progresso, /up:ajuda, /up:pausar';
      const commands = upDetector.extractUPCommands(text);

      expect(commands).toHaveLength(3);
      expect(commands.map(c => c.command)).toEqual([
        '/up:progresso',
        '/up:ajuda',
        '/up:pausar',
      ]);
    });

    it('deve retornar array vazio para texto sem comandos', () => {
      const commands = upDetector.extractUPCommands('Texto normal sem comandos UP');
      expect(commands).toHaveLength(0);
    });

    it('deve extrair comando com hifens no nome', () => {
      const commands = upDetector.extractUPCommands('/up:planejar-fase');

      expect(commands).toHaveLength(1);
      expect(commands[0].label).toBe('Planejar Fase');
    });

    it('deve truncar labels longas em 30 caracteres', () => {
      const commands = upDetector.extractUPCommands('/up:comando-muito-longo-que-excede-o-limite arg1 arg2 arg3');

      expect(commands).toHaveLength(1);
      expect(commands[0].label.length).toBeLessThanOrEqual(30);
      expect(commands[0].label).toMatch(/\.\.\.$/);
    });
  });

  describe('extractNumberedOptions', () => {
    it('deve extrair opcoes numeradas', () => {
      const text = `Escolha:
1. Primeira opcao
2. Segunda opcao
3. Terceira opcao`;

      const options = upDetector.extractNumberedOptions(text);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({ number: 1, text: 'Primeira opcao' });
      expect(options[1]).toEqual({ number: 2, text: 'Segunda opcao' });
      expect(options[2]).toEqual({ number: 3, text: 'Terceira opcao' });
    });

    it('deve limitar a 10 opcoes', () => {
      const lines = Array.from({ length: 15 }, (_, i) => `${i + 1}. Option ${i + 1}`);
      const options = upDetector.extractNumberedOptions(lines.join('\n'));

      expect(options).toHaveLength(10);
    });

    it('deve retornar array vazio quando nao ha opcoes', () => {
      const options = upDetector.extractNumberedOptions('Texto sem opcoes numeradas');
      expect(options).toHaveLength(0);
    });
  });

  describe('extractAllActions', () => {
    it('deve extrair comandos UP e opcoes numeradas juntos', () => {
      const text = `Usar /up:progresso, ou /up:ajuda.

Opcoes:
1. Continuar
2. Parar`;

      const actions = upDetector.extractAllActions(text);

      expect(actions.upCommands).toHaveLength(2);
      expect(actions.numberedOptions).toHaveLength(2);
    });

    it('deve retornar listas vazias para texto simples', () => {
      const actions = upDetector.extractAllActions('Apenas texto normal.');

      expect(actions.upCommands).toHaveLength(0);
      expect(actions.numberedOptions).toHaveLength(0);
    });
  });

  describe('getUPCommandsGrid', () => {
    it('deve retornar 9 comandos padrao', () => {
      const grid = upDetector.getUPCommandsGrid();

      expect(grid).toHaveLength(9);
      expect(grid[0].command).toBe('/up:progresso');
      expect(grid[8].command).toBe('/up:ajuda');
    });

    it('deve ter labels para todos os comandos', () => {
      const grid = upDetector.getUPCommandsGrid();
      grid.forEach(cmd => {
        expect(cmd.label).toBeTruthy();
        expect(cmd.command).toMatch(/^\/up:/);
      });
    });
  });
});
