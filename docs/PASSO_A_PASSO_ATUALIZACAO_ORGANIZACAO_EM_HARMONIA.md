# Passo a passo de atualização — Organização em Harmonia

## 1. Arquivos do projeto local

1. Feche o servidor local, se estiver rodando.
2. Faça backup:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-organizacao-em-harmonia.zip -Force
```

3. Extraia o ZIP atualizado por cima da pasta do projeto.
4. Rode:

```powershell
npm run lint
npm run build
npm run dev
```

5. Teste localmente:

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia
http://localhost:3000/solucoes/atendimento-em-harmonia
http://localhost:3000/solucoes/agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
```

## 2. Supabase

No Supabase SQL Editor, rode:

```txt
supabase/sql/20260627_14_organizacao_em_harmonia_base.sql
```

Depois valide:

```sql
select name, slug, current_status, stage, priority
from public.ae_solutions
where slug in ('organizacao-em-harmonia', 'atendimento-em-harmonia', 'agenda-viva')
order by priority;

select * from public.oh_permissions_matrix;
```

## 3. Variáveis de ambiente local

Atualize `.env.local` com os campos BotConversa da Organização em Harmonia, quando os IDs reais forem criados:

```env
BOTCONVERSA_OH_SEND_FLOW=false
BOTCONVERSA_OH_FLOW_ID=
BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
BOTCONVERSA_OH_FIELD_NAME_ID=
BOTCONVERSA_OH_FIELD_EMAIL_ID=
BOTCONVERSA_OH_FIELD_WHATSAPP_ID=
BOTCONVERSA_OH_FIELD_LEAD_ID_ID=
BOTCONVERSA_OH_FIELD_MODULE_ID=
BOTCONVERSA_OH_FIELD_MODULE_SLUG_ID=
BOTCONVERSA_OH_FIELD_ORGANIZATION_ID=
BOTCONVERSA_OH_FIELD_ORIGIN_ID=
BOTCONVERSA_OH_FIELD_STATUS_ID=
BOTCONVERSA_OH_FIELD_LOGIN_URL_ID=
BOTCONVERSA_OH_FIELD_FOUNDER_ID=
BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_OH_FIELD_RESPONSE_ID=
```

## 4. GitHub

```powershell
git status
git add .
git commit -m "Cria Organizacao em Harmonia com Atendimento e Agenda Viva"
git push origin main
```

Se usar `master`:

```powershell
git push origin master
```

## 5. Vercel

1. Vá em **Project Settings > Environment Variables**.
2. Copie as variáveis `BOTCONVERSA_OH_*` do `.env.example`.
3. Deixe `BOTCONVERSA_OH_SEND_FLOW=false` até validar campos e etiquetas.
4. Faça redeploy.
5. Teste em produção:

```txt
https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia
https://www.automacaoextrema.com/solucoes/atendimento-em-harmonia
https://www.automacaoextrema.com/solucoes/agenda-viva
```

## 6. BotConversa

Siga o documento:

```txt
docs/PASSO_A_PASSO_BOTCONVERSA_ORGANIZACAO_EM_HARMONIA.md
```

Resumo:

1. Criar campos personalizados `oh_*`.
2. Criar etiquetas `oh_*`.
3. Descobrir os IDs reais.
4. Preencher `.env.local` e Vercel.
5. Criar fluxo `OH - Lead vindo do site`.
6. Usar mensagem fixa primeiro.
7. Depois, se `oh_resp_botconversa` estiver preenchendo corretamente, trocar para `{oh_resp_botconversa}`.

## 7. Validação final

1. Preencher Quero Conhecer.
2. Conferir `oh_leads`.
3. Conferir e-mail do lead e e-mail interno.
4. Conferir contato BotConversa.
5. Clicar no botão da página Obrigado.
6. Confirmar que o WhatsApp abre para a AE.
7. Confirmar que o fluxo responde.
