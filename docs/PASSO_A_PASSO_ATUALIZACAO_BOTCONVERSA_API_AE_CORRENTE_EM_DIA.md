# Atualização — AE → BotConversa API no Corrente em Dia

## Arquivos novos/alterados

- `src/lib/botconversa.ts`
- `src/app/api/corrente-em-dia/leads/route.ts`
- `.env.example`
- `docs/PASSO_A_PASSO_BOTCONVERSA_API_AE_CORRENTE_EM_DIA.md`
- `docs/PASSO_A_PASSO_BOTCONVERSA_CORRENTE_EM_DIA_AUTOAJUDA.md`
- `docs/PASSO_A_PASSO_ATUALIZACAO_BOTCONVERSA_API_AE_CORRENTE_EM_DIA.md`

## Objetivo

Ao receber um lead pelo formulário **Quero Conhecer**, a AE passa a tentar enriquecer o contato no BotConversa automaticamente, sem bloquear o cadastro caso a integração falhe.

A integração tenta:

1. criar/atualizar contato no BotConversa;
2. aplicar etiquetas;
3. preencher campos personalizados;
4. opcionalmente disparar o fluxo `CED - Lead vindo do site`.

## Passo 1 — substituir arquivos

Extraia o ZIP atualizado por cima do projeto local.

## Passo 2 — configurar `.env.local`

Adicione as variáveis abaixo com os valores reais:

```env
BOTCONVERSA_ENABLED=true
BOTCONVERSA_API_KEY=SUA_CHAVE_WEBHOOK_INTEGRATION
BOTCONVERSA_API_BASE_URL=https://backend.botconversa.com.br
BOTCONVERSA_API_HEADER_NAME=API-KEY
BOTCONVERSA_AUTH_SCHEME=

BOTCONVERSA_CREATE_CONTACT_PATH=/api/v1/webhook/subscriber/
BOTCONVERSA_TAG_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/
BOTCONVERSA_FIELD_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/
BOTCONVERSA_FLOW_PATH_TEMPLATE=/api/v1/webhook/subscriber/{subscriberId}/send_flow/{flowId}/

BOTCONVERSA_CED_SEND_FLOW=false
BOTCONVERSA_CED_FLOW_ID=

BOTCONVERSA_CED_TAG_LEAD_SITE_ID=
BOTCONVERSA_CED_TAG_EMAIL_SENT_ID=
BOTCONVERSA_CED_TAG_FOUNDER_ID=
BOTCONVERSA_CED_TAG_WAITING_ACCESS_ID=

BOTCONVERSA_CED_FIELD_NAME_ID=
BOTCONVERSA_CED_FIELD_EMAIL_ID=
BOTCONVERSA_CED_FIELD_WHATSAPP_ID=
BOTCONVERSA_CED_FIELD_LEAD_ID_ID=
BOTCONVERSA_CED_FIELD_ORIGIN_ID=
BOTCONVERSA_CED_FIELD_STATUS_ID=
BOTCONVERSA_CED_FIELD_LOGIN_URL_ID=
BOTCONVERSA_CED_FIELD_FOUNDER_ID=
BOTCONVERSA_CED_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_CED_FIELD_FIRST_ACCESS_ID=
BOTCONVERSA_CED_FIELD_MESSAGE_ID=
```

Comece com `BOTCONVERSA_ENABLED=false` para validar que o formulário segue normal. Depois ligue `true`.

## Passo 3 — confirmar endpoints na documentação autenticada

Acesse a documentação API do BotConversa, clique em **Authorize**, informe a chave **Webhook Integration** e confirme os caminhos de:

- adicionar contato;
- adicionar etiqueta ao contato;
- adicionar campo personalizado ao contato;
- enviar fluxo ao contato.

Se os caminhos forem diferentes dos padrões, altere as variáveis `BOTCONVERSA_*_PATH*`.

## Passo 4 — testar localmente

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npm run build
npm run dev
```

Preencha o formulário:

```text
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
```

No retorno da API `/api/corrente-em-dia/leads`, confira:

- `botconversaEnabled`
- `botconversaSynced`
- `botconversaReason`
- `botconversaSubscriberId`
- `botconversaSteps`

## Passo 5 — configurar Vercel

Em **Vercel > Project Settings > Environment Variables**, adicione as mesmas variáveis `BOTCONVERSA_*`.

Depois faça deploy.

## Passo 6 — GitHub

```powershell
git status
git add .
git commit -m "Integra Corrente em Dia com API do BotConversa"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Passo 7 — validar produção

1. Preencha o formulário em produção.
2. Confirme se o e-mail chegou.
3. Abra o contato no BotConversa.
4. Confirme etiquetas e campos personalizados.
5. Clique no botão da página Obrigado.
6. Confirme se o fluxo usa `ced_resp_botconversa` ou campos já preenchidos.

## Observação importante

A integração BotConversa nunca deve impedir o cadastro do lead. Se ela falhar, o sistema ainda deve criar o lead, enviar e-mail e permitir continuidade por WhatsApp.
