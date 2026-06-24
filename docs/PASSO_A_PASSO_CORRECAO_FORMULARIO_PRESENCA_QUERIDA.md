# Correção — Formulário Quero Conhecer do Presença Querida

## Problema corrigido

O formulário em `/solucoes/presenca-querida/quero-conhecer` chamava:

```txt
/api/presenca-querida/leads
```

mas a rota respondia `500`. O front tentava ler JSON mesmo quando a resposta vinha vazia ou quebrada, gerando a mensagem:

```txt
Unexpected end of JSON input
```

A correção trata três pontos:

1. `ae_clients.client_type` agora usa `pessoa_fisica`, compatível com o `check constraint` existente da base AE/Corrente em Dia.
2. A API `/api/presenca-querida/leads` agora devolve JSON mesmo em erro interno.
3. O front do formulário agora lê a resposta de forma segura, mesmo se a API retornar texto ou corpo vazio.
4. A integração ativa AE → BotConversa foi adicionada para Presença Querida usando variáveis `BOTCONVERSA_PQ_*`.

## Arquivos atualizados

Copie/substitua estes arquivos no projeto:

```txt
src/app/api/presenca-querida/leads/route.ts
src/app/solucoes/presenca-querida/quero-conhecer/page.tsx
src/lib/botconversa.ts
.env.example
```

## Passo 1 — Aplicar os arquivos

Descompacte o zip na raiz do projeto:

```txt
C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Permita sobrescrever os arquivos existentes.

## Passo 2 — Conferir variáveis do BotConversa na Vercel

No painel da Vercel:

```txt
Project > Settings > Environment Variables
```

Confirme as variáveis gerais:

```env
BOTCONVERSA_ENABLED=true
BOTCONVERSA_API_KEY=
BOTCONVERSA_API_BASE_URL=https://backend.botconversa.com.br
BOTCONVERSA_API_HEADER_NAME=API-KEY
BOTCONVERSA_AUTH_SCHEME=
BOTCONVERSA_CREATE_CONTACT_PATH=/api/v1/webhook/subscriber/
BOTCONVERSA_TAG_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/
BOTCONVERSA_FIELD_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/
BOTCONVERSA_FLOW_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/send_flow/{flowId}/
BOTCONVERSA_FIELD_METHOD=POST
BOTCONVERSA_FIELD_BODY_MODE=value
BOTCONVERSA_DEBUG=false
```

Confirme as variáveis específicas do Presença Querida com os IDs reais:

```env
BOTCONVERSA_PQ_SEND_FLOW=true
BOTCONVERSA_PQ_FLOW_ID=

BOTCONVERSA_PQ_TAG_LEAD_SITE_ID=
BOTCONVERSA_PQ_TAG_EMAIL_SENT_ID=
BOTCONVERSA_PQ_TAG_FOUNDER_ID=
BOTCONVERSA_PQ_TAG_WAITING_ACCESS_ID=

BOTCONVERSA_PQ_FIELD_NAME_ID=
BOTCONVERSA_PQ_FIELD_EMAIL_ID=
BOTCONVERSA_PQ_FIELD_WHATSAPP_ID=
BOTCONVERSA_PQ_FIELD_LEAD_ID_ID=
BOTCONVERSA_PQ_FIELD_EVENT_NAME_ID=
BOTCONVERSA_PQ_FIELD_EVENT_TYPE_ID=
BOTCONVERSA_PQ_FIELD_EVENT_DATE_ID=
BOTCONVERSA_PQ_FIELD_GUESTS_ESTIMATE_ID=
BOTCONVERSA_PQ_FIELD_ORIGIN_ID=
BOTCONVERSA_PQ_FIELD_STATUS_ID=
BOTCONVERSA_PQ_FIELD_LOGIN_URL_ID=
BOTCONVERSA_PQ_FIELD_FOUNDER_ID=
BOTCONVERSA_PQ_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_PQ_FIELD_FIRST_ACCESS_ID=
BOTCONVERSA_PQ_FIELD_RESPONSE_ID=
```

Na primeira validação, se quiser evitar que o fluxo seja disparado automaticamente, deixe:

```env
BOTCONVERSA_PQ_SEND_FLOW=false
```

Depois que contato, etiquetas e campos estiverem gravando corretamente, altere para:

```env
BOTCONVERSA_PQ_SEND_FLOW=true
```

## Passo 3 — Rodar validação local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npm run build
```

## Passo 4 — Testar localmente

```powershell
npm run dev
```

Abra:

```txt
http://localhost:3000/solucoes/presenca-querida/quero-conhecer
```

Envie um lead de teste.

## Passo 5 — Conferir Supabase

No Supabase SQL Editor:

```sql
select id, responsible_name, email, whatsapp, event_name, status, access_sent_at, created_at
from pq_leads
order by created_at desc
limit 10;
```

Confira também o cliente AE criado:

```sql
select id, client_type, display_name, slug, email, whatsapp, status, created_at
from ae_clients
order by created_at desc
limit 10;
```

O campo `client_type` dos novos leads do Presença Querida deve aparecer como:

```txt
pessoa_fisica
```

## Passo 6 — Publicar na Vercel

```powershell
git status
git add .
git commit -m "fix: corrige formulario Presença Querida e integra BotConversa"
git push origin main
```

Aguarde o deploy automático na Vercel.

## Passo 7 — Testar em produção

Abra:

```txt
https://www.automacaoextrema.com/solucoes/presenca-querida/quero-conhecer
```

Envie um novo lead.

Depois confira:

1. Supabase: tabela `pq_leads`.
2. Supabase: tabela `pq_events`.
3. Supabase: tabela `ae_clients`.
4. BotConversa: contato criado/atualizado.
5. BotConversa: etiquetas `PQ_*` aplicadas.
6. BotConversa: campos personalizados `pq_*` preenchidos.
7. Vercel: `Functions/Logs` se algo falhar.

## Observação

A API foi ajustada para que falhas de e-mail ou BotConversa não impeçam o cadastro do lead no Supabase. Se o Supabase salvar o lead, o formulário deve seguir para a tela de obrigado. As falhas secundárias aparecem no JSON de retorno e nos logs da Vercel.
