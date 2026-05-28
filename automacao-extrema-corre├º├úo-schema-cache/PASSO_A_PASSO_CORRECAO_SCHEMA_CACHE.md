# Correção — erro `funnel_stage` / schema cache Supabase

Esta atualização remove a dependência obrigatória das colunas `funnel_stage` e `next_action_at` no código da aplicação.

Mesmo que essas colunas existam no banco, a aplicação atualizada passa a usar:

- `ae_leads.status` para o status geral do lead;
- `ae_lead_followups` para controlar os próximos contatos do funil;
- views de relatório sem dependência direta de `funnel_stage`.

## 1. Fazer backup local

Na raiz do projeto:

```powershell
git status
git add .
git commit -m "backup antes da correcao do schema cache"
```

## 2. Descompactar o zip

Descompacte o conteúdo deste zip por cima da pasta do projeto:

```text
C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Substitua os arquivos existentes quando solicitado.

## 3. Rodar o SQL de correção no Supabase

No Supabase do projeto publicado:

```text
Supabase > SQL Editor > New query
```

Cole e rode o arquivo:

```text
supabase/sql/20260528_ae_fix_schema_cache_funil_sem_colunas_extras.sql
```

Este SQL:

- garante `ae_lead_followups`;
- recria views sem depender de `funnel_stage`;
- mantém colunas extras como opcionais;
- executa `notify pgrst, 'reload schema';` para recarregar o cache de schema.

## 4. Rodar validações locais

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Acesse:

```text
http://localhost:3000/diagnostico
http://localhost:3000/login
http://localhost:3000/admin/ae
```

## 5. Publicar no GitHub/Vercel

```powershell
git status
git add .
git commit -m "fix: remove dependencia de funnel_stage no funil ae"
git push
```

A Vercel deve iniciar o deploy automaticamente.

## 6. Variáveis no Vercel

Confira em:

```text
Vercel > Project > Settings > Environment Variables
```

Devem existir:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
EMAIL_NOTIFICATIONS_ENABLED=true
```

## 7. Teste final em produção

Depois do deploy:

1. Abra `/diagnostico` no celular.
2. Preencha todos os campos.
3. Envie o diagnóstico.
4. Abra `/login`.
5. Entre na Gestão.
6. Confirme se o lead apareceu em `/admin/ae`.
7. Abra o detalhe do lead e confira respostas completas e follow-ups.

## Observação importante

Se o erro persistir depois desta versão, verifique se o Vercel está apontando para o mesmo projeto Supabase onde o SQL foi rodado. O erro pode continuar quando:

- o SQL foi rodado em outro projeto Supabase;
- a Vercel usa `NEXT_PUBLIC_SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` de outro ambiente;
- existem variáveis diferentes para Production, Preview e Development.
