# Atualização: Funil por prioridade, modal do lead, voltar e agendamento externo

## O que foi alterado

1. O Funil agora mostra uma lista de leads em ordem de prioridade:
   - primeiro os leads com follow-up atrasado;
   - depois os que vencem em breve;
   - depois os demais, pelo próximo prazo.
2. Ao clicar no lead, abre um modal com as ações do funil e mensagens prontas.
3. A ficha completa do lead recebeu botões de voltar para Funil e Gestão.
4. A rota `/api/cron/followup-alerts` agora aceita:
   - `Authorization: Bearer CRON_SECRET`; ou
   - `?token=CRON_SECRET` na URL.
5. Não foi criado `vercel.json`, para evitar bloqueio no plano Hobby.
6. Incluído SQL para limpar a base de testes preservando as soluções.

## Arquivos alterados

```text
src/app/admin/ae/funil/page.tsx
src/app/admin/ae/leads/[id]/page.tsx
src/app/api/cron/followup-alerts/route.ts
```

## Arquivos novos

```text
PASSO_A_PASSO_AGENDAMENTO_EXTERNO.md
PASSO_A_PASSO_FUNIL_PRIORIDADE_CRON.md
supabase/sql/20260529_limpar_base_testes_ae.sql
```

## Atualização local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "backup antes do funil por prioridade"
```

Descompacte o zip desta entrega por cima do projeto.

Depois rode:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Teste:

```text
http://localhost:3000/login
http://localhost:3000/admin/ae/funil
```

## Publicação

```powershell
git status
git add .
git commit -m "feat: organiza funil por prioridade e prepara cron externo"
git push
```

Se o deploy automático não disparar, use o Deploy Hook da Vercel.

## Limpeza da base para novos testes

No Supabase:

```text
SQL Editor > New query
```

Execute:

```text
supabase/sql/20260529_limpar_base_testes_ae.sql
```

Esse script apaga apenas dados de leads/testes e preserva as soluções.
