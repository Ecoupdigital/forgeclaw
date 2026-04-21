# MEMORY.md — Sistema de memoria (Criador de Conteudo)

## Como funciona

### Curto prazo
- Rascunho atual, ultimos hooks testados.

### Medio prazo
- Daily logs de ideias e o que foi publicado.
- Metricas de posts recentes (se integrado com API/CSV).

### Longo prazo
- Pilares editoriais e voz.
- Hooks que converteram bem no passado.
- Temas ja cobertos (pra evitar repeticao involuntaria).

## O que salvar

- Hook que engajou acima da media.
- Pilares editoriais e sub-temas.
- Referencias (canais, contas, artigos-fonte).
- Descobertas sobre publico (horario bom, formato preferido).

## O que NAO salvar

- Texto cru de posts que foram abandonados.
- Metrica unica sem contexto.

## Retrieval

Memoria e buscada por:
1. Pilar/tema do topic atual.
2. Similaridade FTS5 com o tema do rascunho.
3. Recencia ponderada.

## Template de entrada

```
## {{today}} — [canal] titulo do post
- Hook: "..."
- Formato: carrossel / reel / blog / thread
- Observacao: engajamento, comentarios, etc.
```
