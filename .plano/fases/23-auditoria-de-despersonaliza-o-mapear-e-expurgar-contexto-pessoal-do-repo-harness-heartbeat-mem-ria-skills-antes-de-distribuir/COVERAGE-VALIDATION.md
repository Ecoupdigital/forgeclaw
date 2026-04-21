# Coverage Validation — Scanner 23-01

Validacao determinista da task 5 do plano 23-01. Confirma que o scanner
`scripts/audit-personal-context.ts` detecta todos os arquivos-alvo
conhecidos com as categorias esperadas.

## Comando de validacao

```bash
cd /home/projects/ForgeClaw
bun run audit:personal:json --out=/tmp/audit.json
jq -r '.[] | "\(.file):\(.line):\(.category)"' /tmp/audit.json | sort -u > /tmp/covered.txt
for f in \
  packages/core/src/memory/prompts/janitor.md \
  packages/core/src/memory/prompts/writer.md \
  packages/core/src/memory-manager.ts \
  packages/dashboard/src/lib/mock-data.ts \
  .continue-aqui.md \
  README.md \
  .plano/STATE.md \
  packages/cli/src/commands/install.ts \
  ops/forgeclaw.service \
  ops/forgeclaw-dashboard.service; do
  grep -q "^$f:" /tmp/covered.txt || { echo "MISS: $f"; exit 1; }
done
echo "ALL COVERED"
```

## Resultado: ALL COVERED (zero MISS)

Validado em 2026-04-21 contra o HEAD do plano 23-01.

## Mapeamento expected -> actual

| Arquivo                                                        | Esperado              | Encontrado no scanner                                                  |
|----------------------------------------------------------------|-----------------------|------------------------------------------------------------------------|
| `packages/core/src/memory/prompts/janitor.md`                  | personal_name L3      | personal_name L3 / personal_client L41 / hardcoded_path L9             |
| `packages/core/src/memory/prompts/writer.md`                   | personal_name L3      | personal_name L3,L80 / personal_client L55,L61,L62,L80,L81,L89         |
| `packages/core/src/memory-manager.ts`                          | personal_name L34     | personal_name L34                                                      |
| `packages/dashboard/src/lib/mock-data.ts`                      | hardcoded_path L304   | hardcoded_path L304 (+ 7 outros)                                        |
| `.continue-aqui.md`                                            | varios                | personal_company+private_repo_url L4 / personal_handle L11,L59 /       |
|                                                                |                       | bot_token_fragment L59 / personal_userid L35,L60 / hardcoded_path L62,L67 |
| `README.md`                                                    | private_repo_url      | private_repo_url L48, L102                                             |
| `.plano/STATE.md`                                              | private_repo_url      | presente em STATE.md                                                    |
| `packages/cli/src/commands/install.ts`                         | hardcoded_path L178/L199 | hardcoded_path L178, L199                                           |
| `ops/forgeclaw.service`                                        | hardcoded_path L8     | hardcoded_path L8                                                      |
| `ops/forgeclaw-dashboard.service`                              | hardcoded_path L8     | hardcoded_path L8                                                      |

Todos os patterns esperados pelo plano estao cobertos. Scanner nao precisa
de regras novas; aprovado para consumo pelo plano 23-02.

## Dados adicionais

- Arquivos varridos: 333
- Findings totais: 1280 (428 critical / 762 high / 90 medium)
- `.playwright-mcp/` registrado como 1 finding `playwright_snapshot` critical (36 snapshots internos).
- Nenhum finding em `node_modules/`, `bun.lock`, `.git/` (confirmado: `grep -c node_modules AUDIT-REPORT.md` so retorna mencoes em comentarios de `.plano/`, nao paths reais varridos).
