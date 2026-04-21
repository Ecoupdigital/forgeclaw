import { describe, test, expect } from 'bun:test';
import { openUrl } from '../../src/utils/open-url';

describe('openUrl', () => {
  test('returns OpenUrlResult shape', async () => {
    // Usa uma URL bogus — nao importa; o teste valida o shape do retorno.
    // Em CI sem DISPLAY, xdg-open costuma sair != 0; em maquina com DISPLAY, sai 0.
    // Ambos sao aceitaveis desde que o retorno seja { ok, command, reason? }.
    const r = await openUrl('http://localhost:65530/__test__', 3000);
    expect(typeof r.ok).toBe('boolean');
    if (r.command) expect(typeof r.command).toBe('string');
    if (!r.ok && r.reason) expect(typeof r.reason).toBe('string');
  }, 10000);

  test('timeout nao quebra a funcao', async () => {
    // Mesmo URL valido, forcamos timeout curto: retorno e ok:true (timeout e tratado como success optimista).
    const r = await openUrl('http://localhost:65530/__test__', 50);
    expect(typeof r.ok).toBe('boolean');
  });
});
