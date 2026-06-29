# Passo a passo de atualização — Organização em Harmonia / Agenda Viva Tucxa

## 1. Atualizar arquivos locais

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-agenda-viva-tucxa.zip -Force
```

Extraia o ZIP recebido por cima do projeto.

## 2. Rodar validações

```powershell
npm run lint
npm run build
npm run dev
```

## 3. Testar páginas

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente/base-unica
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente/agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente/modulos
```

## 4. Supabase

Rode no SQL Editor:

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

## 5. Variáveis de ambiente

No `.env.local` e Vercel:

```env
OH_IMPLANTATION_DUE_DAYS=30
OH_FOUNDER_EVALUATION_DAYS=30
OH_REMINDER_HOURS_BEFORE_IMPLANTATION_DUE=48
OH_REMINDER_CRON_SECRET=
```

Se `OH_REMINDER_CRON_SECRET` ficar vazio, o endpoint de lembrete usa `CRON_SECRET`.

## 6. Cron de lembretes

Endpoint:

```txt
/api/cron/organizacao-em-harmonia-reminders?token=SEU_TOKEN
```

Teste:

```powershell
Invoke-RestMethod `
  -Uri "https://www.automacaoextrema.com/api/cron/organizacao-em-harmonia-reminders?token=SEU_TOKEN" `
  -Method Get
```

## 7. GitHub

```powershell
git checkout feature/organizacao-em-harmonia
git status
git add .
git commit -m "Evolui Organizacao em Harmonia com Agenda Viva Tucxa"
git push origin feature/organizacao-em-harmonia
```

## 8. Vercel

Após o push, valide o deploy preview da branch.

Depois de aprovado:

```powershell
npx vercel --prod
```

## 9. BotConversa

Seguir o arquivo:

```txt
docs/PASSO_A_PASSO_BOTCONVERSA_ORGANIZACAO_EM_HARMONIA.md
```
