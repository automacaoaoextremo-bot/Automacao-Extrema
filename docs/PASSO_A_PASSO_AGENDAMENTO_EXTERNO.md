# Agendamento externo dos alertas de follow-up

Como o plano Hobby da Vercel não permite Cron Job a cada 5 minutos, a rota de alerta fica no sistema, mas o agendamento será feito por um serviço externo.

## 1. Configurar a chave secreta

No Vercel, acesse:

```text
Project > Settings > Environment Variables
```

Crie a variável:

```text
CRON_SECRET=crie-uma-chave-grande-e-dificil
```

Exemplo de valor:

```text
CRON_SECRET=ae-followup-2026-chave-super-segura-trocar
```

Depois faça um novo deploy.

## 2. Testar manualmente a rota

No PowerShell:

```powershell
$token = "COLE_AQUI_O_VALOR_DO_CRON_SECRET"
$url = "https://automacao-extrema.vercel.app/api/cron/followup-alerts?token=$token"
Invoke-RestMethod -Uri $url -Method GET
```

Resposta esperada:

```json
{
  "ok": true,
  "checked": 0,
  "alerted": 0
}
```

Se retornar `401`, o token está diferente do `CRON_SECRET` configurado na Vercel.

## 3. Configurar no cron-job.org

1. Acesse `cron-job.org`.
2. Crie uma conta gratuita ou faça login.
3. Clique em **Create cronjob**.
4. Preencha:

```text
Title: AE - Alertas de follow-up
URL: https://automacao-extrema.vercel.app/api/cron/followup-alerts?token=SUA_CHAVE_SECRETA
Schedule: Every 5 minutes
Request method: GET
Timeout: 30 seconds
```

5. Salve.
6. Use a opção **Run now** para testar.

## 4. Como funciona

A rota procura follow-ups de WhatsApp pendentes com vencimento entre 14 e 16 minutos a partir do momento da execução.

Quando encontra um follow-up elegível, envia e-mail para:

```text
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
```

Depois marca o follow-up com a nota:

```text
[alerta_15min_enviado]
```

Assim evita enviar o mesmo alerta várias vezes.

## 5. Alternativas

Também é possível chamar a mesma URL por:

- GitHub Actions com cron.
- UptimeRobot.
- EasyCron.
- Make/Zapier.

O importante é chamar a rota via HTTP em intervalo curto, sem usar o Cron Job interno da Vercel no plano Hobby.
