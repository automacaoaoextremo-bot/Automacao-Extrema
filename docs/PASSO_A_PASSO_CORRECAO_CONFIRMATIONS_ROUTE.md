# Correção TypeScript — Presença Querida / Confirmações

## Arquivo corrigido

Substitua este arquivo no projeto:

```txt
src/app/api/presenca-querida/cliente/confirmations/route.ts
```

## Problema corrigido

O erro ocorria porque o TypeScript inferia `targetStatus` como `string` dentro do array retornado por `allReminderPlans()`, mas o tipo esperado era o union type:

```ts
type ReminderTarget = "todos" | "confirmado" | "talvez" | "pendente";
```

## Ajuste aplicado

A função `allReminderPlans()` agora cria explicitamente:

```ts
const plans: ReminderPlan[] = [...]
```

E cada `.map()` retorna `ReminderPlan`, evitando que `targetStatus` seja inferido como `string`.

## Validação

Depois de substituir o arquivo, rode:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
