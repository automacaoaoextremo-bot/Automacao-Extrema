# Correção TypeScript - Caixa do Bazar no Controle

## Arquivo alterado

- `src/app/bazar-sementinha/caixa/caixa-client.tsx`

## Correção realizada

O erro ocorria porque o TypeScript inferia o retorno de `getSessionHeaders()` como uma união com propriedade opcional `x-bazar-session?: undefined`, o que não era aceito pelo tipo `HeadersInit` do `fetch`.

A função agora retorna explicitamente:

```ts
Record<string, string>
```

Assim, os headers montados com:

```ts
{ "Content-Type": "application/json", ...getSessionHeaders() }
```

ficam compatíveis com `RequestInit`.

## Passo a passo

1. Extraia o zip na raiz do projeto, substituindo o arquivo existente.
2. Rode:

```powershell
npm run lint
npx --no-install tsc --noEmit
npm run build
```

3. Se passar, faça commit e push:

```powershell
git add src/app/bazar-sementinha/caixa/caixa-client.tsx docs/PASSO_A_PASSO_CORRECAO_TSC_CAIXA_BAZAR.md
git commit -m "Corrige tipos dos headers no caixa do Bazar"
git push
```
