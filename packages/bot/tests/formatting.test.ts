import { describe, it, expect } from 'vitest';
import { convertToHtml, buildContextBar, truncateForTelegram } from '../src/utils/formatting';

describe('Formatting Utils', () => {
  describe('convertToHtml', () => {
    it('deve converter bold markdown para HTML', () => {
      expect(convertToHtml('**bold text**')).toBe('<b>bold text</b>');
      expect(convertToHtml('__also bold__')).toBe('<b>also bold</b>');
    });

    it('deve converter italic markdown para HTML', () => {
      expect(convertToHtml('*italic*')).toBe('<i>italic</i>');
    });

    it('deve converter inline code', () => {
      const result = convertToHtml('Use `console.log` here');
      expect(result).toContain('<code>console.log</code>');
    });

    it('deve converter code blocks', () => {
      const result = convertToHtml('```js\nconst x = 1;\n```');
      expect(result).toContain('<pre>const x = 1;</pre>');
    });

    it('deve escapar HTML entities no texto', () => {
      const result = convertToHtml('Use <div> & "quotes"');
      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('deve escapar HTML dentro de code blocks', () => {
      const result = convertToHtml('```\n<script>alert("xss")</script>\n```');
      expect(result).toContain('&lt;script&gt;');
    });

    it('deve preservar texto sem markdown', () => {
      expect(convertToHtml('Plain text')).toBe('Plain text');
    });
  });

  describe('buildContextBar', () => {
    it('deve construir barra com 0%', () => {
      const bar = buildContextBar(0);
      expect(bar).toContain('0%');
      expect(bar).toContain('\u2591'.repeat(10));
    });

    it('deve construir barra com 100%', () => {
      const bar = buildContextBar(100);
      expect(bar).toContain('100%');
      expect(bar).toContain('\u2588'.repeat(10));
    });

    it('deve construir barra com 50%', () => {
      const bar = buildContextBar(50);
      expect(bar).toContain('50%');
      expect(bar).toContain('\u2588'.repeat(5));
    });

    it('deve clampar valores acima de 100', () => {
      const bar = buildContextBar(150);
      expect(bar).toContain('100%');
    });

    it('deve clampar valores negativos', () => {
      const bar = buildContextBar(-10);
      expect(bar).toContain('0%');
    });
  });

  describe('truncateForTelegram', () => {
    it('deve retornar texto curto sem modificacao', () => {
      const text = 'Short message';
      expect(truncateForTelegram(text)).toBe(text);
    });

    it('deve truncar texto longo', () => {
      const text = 'A'.repeat(5000);
      const result = truncateForTelegram(text);
      expect(result.length).toBeLessThanOrEqual(4096 + 50); // some overhead for suffix
      expect(result).toContain('... (truncated)');
    });

    it('deve fechar tag code aberta ao truncar', () => {
      const text = '<code>start' + 'x'.repeat(5000);
      const result = truncateForTelegram(text);
      expect(result).toContain('</code>');
    });

    it('deve cortar antes de pre block incompleto', () => {
      const text = 'Some text <pre>opened block</pre> more text <pre>' + 'x'.repeat(5000);
      const result = truncateForTelegram(text);
      // Should cut at last complete </pre>
      expect(result).toContain('</pre>');
      expect(result).toContain('... (truncated)');
    });

    it('deve respeitar limite customizado', () => {
      const text = 'A'.repeat(200);
      const result = truncateForTelegram(text, 100);
      expect(result.length).toBeLessThan(200);
    });
  });
});
