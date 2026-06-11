# Correção lint — Corrente em Dia

Correção para o erro `@typescript-eslint/no-explicit-any` nos arquivos da área do cliente Corrente em Dia.

Arquivos ajustados:

- `src/app/admin/ae/corrente-em-dia/page.tsx`
- `src/app/api/corrente-em-dia/cliente/dashboard/route.ts`
- `src/app/solucoes/corrente-em-dia/cliente/page.tsx`
- `src/lib/corrente-em-dia.ts`

O que foi feito:

- Removidos tipos `any`.
- Criados tipos compartilhados no arquivo `src/lib/corrente-em-dia.ts`.
- Normalizadas relações retornadas pelo Supabase que podem vir como objeto ou array.
- Mantida a lógica de login, painel do cliente, condições comerciais editáveis e dados fictícios de teste.

Validação feita no pacote:

- `npx tsc --noEmit` executado com sucesso.
- `npm run lint` deve ser executado no projeto local completo, pois o ZIP parcial não contém `eslint.config.*`.
