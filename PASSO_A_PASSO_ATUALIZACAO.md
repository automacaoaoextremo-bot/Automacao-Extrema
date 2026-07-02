# Passo a passo — Presença Querida: recados da Daniela com aprovação e LP

## 1. Substituir/adicionar arquivos

Na raiz do repositório `automacao-extrema`, copie os arquivos deste pacote mantendo exatamente a mesma estrutura de pastas.

Arquivos atualizados:

- `.env.example`
- `src/components/presenca-public-confirmation.tsx`
- `src/app/api/presenca-querida/confirmar/[token]/route.ts`
- `src/app/api/presenca-querida/cliente/messages/route.ts`
- `src/app/solucoes/presenca-querida/evento/[slug]/page.tsx`
- `src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx`
- `src/lib/mail.ts`
- `src/lib/presenca-daniela50.ts`

Arquivo novo:

- `supabase/sql/20260702_17_presenca_querida_recados_daniela_aprovacao_lp.sql`

## 2. Configurar e-mail de aprovação dos recados

No `.env.local` e na Vercel, adicione opcionalmente:

```env
PRESENCA_QUERIDA_RECADO_APPROVER_EMAIL=email-da-daniela-ou-cliente@dominio.com
```

Se essa variável ficar vazia, o sistema tenta usar o e-mail do evento (`pq_events.email`). Se também estiver vazio, usa `EMAIL_COPY_TO`.

## 3. Rodar o SQL no Supabase

No Supabase SQL Editor, execute:

```sql
supabase/sql/20260702_17_presenca_querida_recados_daniela_aprovacao_lp.sql
```

Esse SQL faz três coisas:

1. garante os campos de aprovação em `pq_guest_messages`;
2. transforma recados já existentes em `pq_guests.notes` em mensagens pendentes de aprovação, incluindo casos como Mariana;
3. atualiza os modelos de lembrete para citar a novidade dos recados na LP.

Nenhum recado antigo é publicado automaticamente. Todos entram como `pendente`.

## 4. Instalar, validar e testar localmente

```powershell
npm install
npm run lint
npm run dev
```

Teste recomendado:

1. abrir um convite individual da Daniela;
2. preencher ou alterar “Curiosidade ou recado para a Daniela”;
3. registrar a resposta;
4. conferir se o recado apareceu em `Cliente > Mensagens > Recados para aprovação na LP`;
5. aprovar o recado;
6. abrir a LP pública do evento e conferir a seção “Recados para a Dani”.

## 5. Publicar

Depois dos testes:

```powershell
git status
git add .
git commit -m "Presenca Querida: aprovar recados da Daniela e publicar na LP"
git push
```

A Vercel deve fazer o deploy automaticamente após o push.

## 6. Script para gerar novo zip

Depois de aplicar os arquivos no repositório, se quiser gerar outro pacote só com estes arquivos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\gerar-zip-presenca-recados-daniela.ps1
```
