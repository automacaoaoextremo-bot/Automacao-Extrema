# Corrente em Dia — Correção/Debug AE → BotConversa API

## Objetivo

Garantir que, ao preencher o **Quero Conhecer** no site, a Automação Extrema consiga enriquecer automaticamente o contato no BotConversa com:

- etiquetas;
- campos personalizados;
- `ced_resp_botconversa` com a mensagem pronta para o WhatsApp;
- opcionalmente o envio do fluxo **CED - Lead vindo do site**.

A integração não deve bloquear o cadastro do lead. Mesmo que o BotConversa falhe, o lead deve ser criado e o e-mail de acesso deve ser enviado.

---

## 1. Variáveis necessárias

Configure no `.env.local` e na Vercel.

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
BOTCONVERSA_FIELD_METHOD=POST
BOTCONVERSA_FIELD_BODY_MODE=value

BOTCONVERSA_DEBUG=true
BOTCONVERSA_TEST_SECRET=use-um-token-ou-deixe-vazio-para-usar-CRON_SECRET
```

### Campo de resposta do BotConversa

Use o **ID real** do campo personalizado `ced_resp_botconversa`:

```env
BOTCONVERSA_CED_FIELD_RESPONSE_ID=ID_REAL_DO_CAMPO
```

Não use o nome do campo se o endpoint da API exigir ID numérico.

---

## 2. IDs de campos personalizados

Preencha os IDs reais:

```env
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
BOTCONVERSA_CED_FIELD_RESPONSE_ID=
```

O campo mais importante para o fluxo simples é:

```env
BOTCONVERSA_CED_FIELD_RESPONSE_ID=
```

Ele é quem preenche `ced_resp_botconversa`.

---

## 3. IDs de etiquetas

Preencha os IDs reais:

```env
BOTCONVERSA_CED_TAG_LEAD_SITE_ID=
BOTCONVERSA_CED_TAG_EMAIL_SENT_ID=
BOTCONVERSA_CED_TAG_FOUNDER_ID=
BOTCONVERSA_CED_TAG_WAITING_ACCESS_ID=
```

---

## 4. Como testar a integração sem criar lead real

Foi criado o endpoint:

```text
/api/admin/corrente-em-dia/botconversa-test
```

Ele exige token por segurança. Usa `BOTCONVERSA_TEST_SECRET`; se não existir, usa `CRON_SECRET`.

### Ver configuração sem mostrar a chave

```powershell
Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/corrente-em-dia/botconversa-test?token=SEU_TOKEN" `
  -Method Get
```

### Testar criação/enriquecimento de contato

```powershell
$body = @{
  responsibleName = "Márcio Alexandre da Silva"
  email = "marcioalex.silva@gmail.com"
  whatsapp = "19992360856"
  leadId = "debug-teste-botconversa"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/corrente-em-dia/botconversa-test?token=SEU_TOKEN" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

A resposta deve trazer:

```json
{
  "ok": true,
  "botconversa": {
    "ok": true,
    "subscriberId": "...",
    "steps": []
  }
}
```

Se `ok=false`, veja `steps` para identificar se falhou em:

- criar/atualizar contato;
- aplicar etiqueta;
- atualizar campo;
- enviar fluxo.

---

## 5. Onde ver logs na Vercel

Ative temporariamente:

```env
BOTCONVERSA_DEBUG=true
```

Depois acesse:

```text
Vercel → Project → Deployments → Último deploy → Functions/Logs
```

Procure por:

```text
[BotConversa]
```

Não deixe `BOTCONVERSA_DEBUG=true` permanentemente em produção.

---

## 6. Fluxo no BotConversa

Durante a validação, o fluxo pode ter apenas:

```text
{ced_resp_botconversa}
```

Mas isso só funciona se a AE preencher o campo `ced_resp_botconversa` antes do fluxo rodar.

Para não deixar lead sem resposta durante debug, use temporariamente uma mensagem fixa:

```text
Olá, {primeiro-nome}! Recebi seu cadastro do Corrente em Dia.

Seu acesso inicial já foi preparado e as orientações também foram enviadas para o e-mail informado no formulário.

Link de acesso:
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login

Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.

Use o e-mail informado no cadastro para entrar. Se já tiver senha, use sua senha atual. Se não lembrar, clique em “Esqueci minha senha” na tela de login.

Próximo passo:
entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Depois que `ced_resp_botconversa` estiver preenchendo corretamente, volte o bloco para:

```text
{ced_resp_botconversa}
```

---

## 7. Se o campo não atualizar

Verifique nesta ordem:

1. `BOTCONVERSA_ENABLED=true` na Vercel.
2. `BOTCONVERSA_API_KEY` é a chave **Webhook Integration**.
3. `BOTCONVERSA_CED_FIELD_RESPONSE_ID` é o ID real do campo, não o nome.
4. `BOTCONVERSA_FIELD_PATH_TEMPLATE` está correto.
5. `BOTCONVERSA_FIELD_BODY_MODE=value`.
6. Logs da Vercel mostram qual step falhou.
7. O endpoint de teste retorna o erro exato em `botconversa.steps`.

---

## 8. Modos alternativos para campo personalizado

Se o Swagger da conta mostrar que o corpo do campo não é `{ "value": "..." }`, altere:

```env
BOTCONVERSA_FIELD_BODY_MODE=value
```

Opções aceitas pelo código:

```env
BOTCONVERSA_FIELD_BODY_MODE=value
BOTCONVERSA_FIELD_BODY_MODE=custom_field_value
BOTCONVERSA_FIELD_BODY_MODE=value_and_field
BOTCONVERSA_FIELD_BODY_MODE=value_only
```

Teste uma opção por vez usando o endpoint `/botconversa-test`.
