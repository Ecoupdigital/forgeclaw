/**
 * Shim de compatibilidade. A implementacao real vive em ./install/index.ts.
 * Mantemos este arquivo apenas para o `packages/cli/src/index.ts` nao precisar
 * mudar caminho de import. Pode ser deletado em uma fase futura apos atualizar
 * o index.ts.
 */
export { install } from './install/index';
export type { InstallOptions } from './install/types';
