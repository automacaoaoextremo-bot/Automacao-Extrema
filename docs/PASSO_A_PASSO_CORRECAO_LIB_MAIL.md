# Correção do erro de TypeScript em `src/lib/mail.ts`

## Problema corrigido

A atualização anterior substituiu `src/lib/mail.ts` por uma versão incompleta, deixando de exportar funções já usadas por outras rotas do projeto:

- `sendCorrenteLeadAccessEmail`
- `sendCorrenteLeadInternalEmail`
- `sendDiagnosticEmail`
- `sendInternalDiagnosticEmail`
- `InternalFollowupInfo`
- `sendPresencaLeadAccessEmail`
- `sendPresencaLeadInternalEmail`

Por isso o `npx tsc --noEmit` e o `npm run build` falharam.

## Solução aplicada

O arquivo `src/lib/mail.ts` foi recomposto com os exports antigos e, ao final, foram mantidas as novas funções do Presença Querida:

- `sendPresencaGuestResponseEmail`
- `sendPresencaReminderDigestEmail`

Assim, as rotas antigas do Diagnóstico, Corrente em Dia e Presença Querida voltam a compilar, e os novos recursos de e-mail de resposta dos convidados e lembretes continuam disponíveis.

## Como aplicar

1. Descompacte o ZIP na raiz do projeto.
2. Permita sobrescrever o arquivo existente:

```text
src/lib/mail.ts
```

3. Rode novamente:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Observação

Não há SQL obrigatório nesta correção.
