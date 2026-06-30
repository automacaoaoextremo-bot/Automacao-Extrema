# Passo a passo de atualização — Organização em Harmonia / BotConversa

## 1. Backup local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-botconversa-validacao.zip -Force
```

## 2. Aplicar arquivos

Extraia o ZIP atualizado por cima da pasta do projeto.

## 3. Variáveis locais

Confirme no `.env.local`:

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
BOTCONVERSA_TEST_SECRET=

BOTCONVERSA_OH_SEND_FLOW=true
BOTCONVERSA_OH_FLOW_ID=ID_REAL_DO_FLUXO_OH_LEAD_VINDO_DO_SITE

BOTCONVERSA_OH_TAG_LEAD_SITE_ID=
BOTCONVERSA_OH_TAG_EMAIL_SENT_ID=
BOTCONVERSA_OH_TAG_FOUNDER_ID=
BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID=
BOTCONVERSA_OH_TAG_AGENDA_VIVA_ID=
BOTCONVERSA_OH_TAG_TUCXA_ID=

BOTCONVERSA_OH_FIELD_NAME_ID=
BOTCONVERSA_OH_FIELD_EMAIL_ID=
BOTCONVERSA_OH_FIELD_WHATSAPP_ID=
BOTCONVERSA_OH_FIELD_LEAD_ID_ID=
BOTCONVERSA_OH_FIELD_MODULE_ID=
BOTCONVERSA_OH_FIELD_MODULE_SLUG_ID=
BOTCONVERSA_OH_FIELD_PRIORITY_MODULE_ID=
BOTCONVERSA_OH_FIELD_ORGANIZATION_ID=
BOTCONVERSA_OH_FIELD_ORIGIN_ID=
BOTCONVERSA_OH_FIELD_STATUS_ID=
BOTCONVERSA_OH_FIELD_LOGIN_URL_ID=
BOTCONVERSA_OH_FIELD_FOUNDER_ID=
BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID=
BOTCONVERSA_OH_FIELD_IMPLANTATION_DUE_AT_ID=
BOTCONVERSA_OH_FIELD_RESPONSE_ID=
```

## 4. Validação local

```powershell
npm run lint
npm run build
npm run dev
```

Teste no navegador:

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva
```

## 5. Supabase

Rode novamente o SQL completo:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Valide:

```sql
select name, slug, enabled_modules, status
from public.oh_organizations
where slug = 'tucxa';

select module, module_slug, permission_key, slug, name
from public.oh_permissions
order by module_slug, permission_key;

select name, slug, requires_approval
from public.agv_event_types
order by sort_order;
```

## 6. Vercel

Atualize as mesmas variáveis no painel da Vercel:

```txt
Project Settings → Environment Variables
```

Depois faça redeploy da branch.

## 7. Teste do endpoint BotConversa em produção

Se `BOTCONVERSA_TEST_SECRET` estiver vazio, use o valor de `CRON_SECRET` como token.

### GET

```powershell
Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/organizacao-em-harmonia/botconversa-test?token=SEU_TOKEN" `
  -Method Get
```

O retorno deve indicar:

```txt
config.enabled = true
config.ohSendFlowEnabled = true
config.ohFlowConfigured = true
config.ohResponseFieldConfigured = true
```

### POST

```powershell
$body = @{
  contactName = "Márcio Alexandre da Silva"
  email = "marcioalex.silva@gmail.com"
  whatsapp = "19992360856"
  leadId = "debug-oh-tucxa"
  moduleSlug = "organizacao-em-harmonia"
  priorityModuleSlug = "agenda-viva"
  organizationName = "Tucxa"
  founderTermsAccepted = $true
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/admin/organizacao-em-harmonia/botconversa-test?token=SEU_TOKEN" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

No retorno, verificar:

```txt
botconversa.ok = true
botconversa.subscriberId preenchido
set_field_oh_resp_botconversa ok=true
send_oh_flow ok=true
```

## 8. Teste completo pelo site

1. Acesse `/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva`.
2. Preencha nome, WhatsApp e e-mail.
3. Verifique se o e-mail foi enviado.
4. Abra o contato no BotConversa.
5. Verifique se `oh_resp_botconversa` foi preenchido.
6. Confirme se o WhatsApp recebeu a mensagem do fluxo **OH - Lead vindo do site**.

## 9. GitHub

```powershell
git checkout feature/organizacao-em-harmonia
git status
git add .
git commit -m "Ajusta validacao BotConversa Organizacao em Harmonia"
git push origin feature/organizacao-em-harmonia
```

## 10. Depois dos testes

Quando tudo estiver validado:

```env
BOTCONVERSA_DEBUG=false
```

Faça novo deploy para reduzir logs em produção.
