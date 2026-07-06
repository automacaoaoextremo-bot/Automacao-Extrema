# Correção do lint `react-hooks/set-state-in-effect`

## Arquivos corrigidos

- `src/app/admin/ae/catalogo/page.tsx`
- `src/app/admin/ae/parceiros/page.tsx`
- `src/app/admin/ae/sites-clientes/page.tsx`
- `src/app/admin/ae/solucoes/[id]/page.tsx`

## O que foi ajustado

O erro acontecia porque o `useEffect` chamava diretamente a função `load()`, e essa função executava `setLoading(true)` e `setError("")` de forma síncrona antes do `await`.

Com React 19 / Next 16 / ESLint mais recente, a regra `react-hooks/set-state-in-effect` acusa esse padrão como risco de renderizações em cascata.

A correção aplicada foi manter a função `load()` para recarregamentos acionados por eventos do usuário, como salvar, arquivar ou atualizar, mas trocar a carga inicial feita dentro do `useEffect` para um fluxo baseado em `adminFetch(...).then(...).catch(...).finally(...)`, sem `setState` síncrono no corpo do efeito.

Também foi incluído controle `isMounted` para evitar atualização de estado após desmontagem do componente.

## Comandos para validar

```powershell
npm run lint
npm run build
```
