# Configuração de SMS — Agendamento do Tucxa

O helper atual está em `src/lib/organizacao-em-harmonia/tucxa-sms.ts`.

## Opção 1 — Twilio

No Vercel, em **Settings > Environment Variables**, configure no ambiente Preview:

```text
TUCXA_SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_FROM=+55...
```

Depois faça um Redeploy do Preview.

`TWILIO_SMS_FROM` precisa ser um remetente habilitado para SMS no provedor. O simples fato de um número ser usado no WhatsApp não o torna automaticamente um remetente SMS.

## Opção 2 — Webhook

Para outro provedor, configure:

```text
TUCXA_SMS_PROVIDER=webhook
TUCXA_SMS_WEBHOOK_URL=https://...
TUCXA_SMS_WEBHOOK_TOKEN=...
```

O sistema envia JSON semelhante a:

```json
{
  "to": "+5519...",
  "message": "...",
  "source": "tucxa-agendamento-piloto"
}
```

## Opção 3 — homologar sem SMS

```text
TUCXA_SMS_PROVIDER=disabled
```

O agendamento continua sendo criado e a Recepção pode copiar o link de confirmação.

## Número do WhatsApp do Tucxa

Para usar o mesmo número do WhatsApp como `From` de SMS, o provedor precisa aceitar/provisionar esse número como remetente SMS. WhatsApp e SMS são canais diferentes. Verifique isso com o provedor antes de configurar `TWILIO_SMS_FROM` ou o equivalente do webhook.
