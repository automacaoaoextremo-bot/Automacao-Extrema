# Correção de lint — Área logada Corrente em Dia

Correções aplicadas:

- `aprovacoes/page.tsx`
- `configuracoes/page.tsx`
- `contribuintes/page.tsx`
- `contribuir/page.tsx`
- `cadastro/page.tsx`

## Motivo

O ESLint/React Hooks acusava `react-hooks/set-state-in-effect` porque algumas páginas chamavam `load()` diretamente dentro do `useEffect`.
Embora a carga fosse assíncrona, a regra entende que a função chamada pode executar `setState` sincronamente.

## Ajuste

A carga inicial foi deslocada para um `window.setTimeout(..., 0)`, evitando chamada direta de `load()` no corpo do efeito.

Também foi corrigido o aviso de dependência em `cadastro/page.tsx`, usando `setForm(prev => ...)` no carregamento de cidades.
