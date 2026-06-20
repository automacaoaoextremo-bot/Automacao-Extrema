# Passo a passo — atualização Corrente em Dia: funil, WhatsApp e acesso automático

## 1. Atualizar arquivos

Na pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-corrente-funil-whatsapp.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

## 2. Rodar SQL novo

No Supabase SQL Editor, execute:

```txt
supabase/sql/20260612_05_funil_whatsapp_corrente_em_dia.sql
```

Esse SQL cria a tabela `ced_leads`, índices, políticas de leitura para usuários autenticados e três leads de simulação.

## 3. Variáveis de ambiente recomendadas

No `.env.local` e no Vercel, confirme:

```txt
NEXT_PUBLIC_SITE_URL=https://www.automacaoextrema.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
EMAIL_FROM_NAME=Automação Extrema
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
AE_INTERNAL_WHATSAPP=19992360856
CRON_SECRET=crie-um-token-secreto
```

Sem SMTP, o cadastro e o usuário podem ser criados, mas o e-mail de acesso não será enviado automaticamente.

## 4. Validar localmente

```powershell
npm run lint
npm run build
npm run dev
```

Páginas e APIs para validar:

```txt
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/admin/ae/corrente-em-dia/funil
http://localhost:3000/api/cron/corrente-em-dia-lead-alerts?token=SEU_CRON_SECRET
```

## 5. Testar o endpoint do lead

Exemplo PowerShell:

```powershell
$body = @{
  source = "teste_local"
  organizationType = "terreiro"
  organizationName = "Terreiro Teste"
  responsibleName = "Marcio Alexandre Silva"
  state = "SP"
  city = "Campinas"
  whatsapp = "19992360856"
  email = "marcioalex.silva@gmail.com"
  contributorsEstimate = 100
  observations = "Presidente envia mensagem mensal no grupo e o financeiro confere Pix e comprovantes."
  founderTermsAccepted = $true
  testimonialPermission = $true
  lgpdContactConsent = $true
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/corrente-em-dia/leads" -ContentType "application/json" -Body $body
```

## 6. Atualizar GitHub

```powershell
git status
git add .
git commit -m "Adiciona funil WhatsApp e acesso automatico Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## 7. Vercel

Se o projeto está conectado ao GitHub, o deploy inicia automaticamente após o push.

Validar em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
https://www.automacaoextrema.com/admin/ae/corrente-em-dia/funil
https://www.automacaoextrema.com/api/cron/corrente-em-dia-lead-alerts?token=SEU_CRON_SECRET
```

Para forçar deploy:

```powershell
npx vercel --prod
```

## 8. Cron no Vercel

Inclua uma rotina para chamar:

```txt
/api/cron/corrente-em-dia-lead-alerts
```

Sugestão de frequência:

```txt
A cada 1 hora
```

Com header:

```txt
Authorization: Bearer SEU_CRON_SECRET
```

Ou com query string para teste:

```txt
?token=SEU_CRON_SECRET
```
