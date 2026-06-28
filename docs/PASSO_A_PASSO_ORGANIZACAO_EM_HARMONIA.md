# Organização em Harmonia — implantação inicial

## Objetivo

Criar uma suíte mais genérica que reaproveita os padrões do Corrente em Dia e prepara três módulos comerciais:

- **Corrente em Dia**: contribuições, Pix, comprovantes, aprovações e lembretes.
- **Atendimento em Harmonia**: recepção, agenda de atendimento, fila, retornos, check-in, encaixes, capacidade e cambonos.
- **Agenda Viva**: calendário único de atividades/eventos, responsáveis, recorrências, aprovações, conflitos e comunicação.

O nome guarda-chuva passa a ser **Organização em Harmonia**, mais genérico que Casa em Harmonia e aplicável a terreiros, associações, federações, ONGs, clubes, grupos voluntários e outras instituições.

## Arquivos novos principais

```txt
src/lib/organizacao-em-harmonia.ts
src/components/organizacao-em-harmonia-landing.tsx
src/app/solucoes/organizacao-em-harmonia/page.tsx
src/app/solucoes/organizacao-em-harmonia/quero-conhecer/page.tsx
src/app/solucoes/organizacao-em-harmonia/quero-conhecer/lead-form.tsx
src/app/solucoes/organizacao-em-harmonia/obrigado/page.tsx
src/app/solucoes/atendimento-em-harmonia/page.tsx
src/app/solucoes/agenda-viva/page.tsx
src/app/api/organizacao-em-harmonia/leads/route.ts
src/app/api/organizacao-em-harmonia/leads/lookup/route.ts
src/app/admin/ae/organizacao-em-harmonia/page.tsx
public/organizacao-em-harmonia-logo.svg
public/atendimento-em-harmonia-logo.svg
public/agenda-viva-logo.svg
supabase/sql/20260627_14_organizacao_em_harmonia_base.sql
```

## O que foi preservado do Corrente em Dia

- Cabeçalho `AeSolutionHeader`.
- Linha “Desenvolvido por Automação Extrema”.
- Formulário mínimo com nome, WhatsApp e e-mail.
- Estratégia de reduzir fricção no “Quero Conhecer”.
- Página de Obrigado com botão de WhatsApp pré-preenchido.
- BotConversa enriquecido via API com etiquetas/campos.
- E-mail automático e alerta interno para AE.
- Mobile-first.
- Copy orientada por Deep Dive: menos foco em sistema, mais foco em clareza, tempo, segurança, menos retrabalho e menos tensão.

## Passo a passo no projeto local

1. Extraia o ZIP atualizado por cima da pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

2. Rode validação:

```powershell
npm run lint
npm run build
```

3. Rode localmente:

```powershell
npm run dev
```

4. Teste as páginas:

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia
http://localhost:3000/solucoes/atendimento-em-harmonia
http://localhost:3000/solucoes/agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
```

## Passo a passo no Supabase

1. Acesse o Supabase.
2. Vá em **SQL Editor**.
3. Rode o arquivo:

```txt
supabase/sql/20260627_14_organizacao_em_harmonia_base.sql
```

4. Confirme se foram criadas as tabelas:

```txt
oh_organizations
oh_people
oh_roles
oh_permissions
oh_role_permissions
oh_memberships
oh_leads
agv_events
agv_event_approvals
aeh_service_days
aeh_attendance_requests
```

5. Confirme se foram cadastradas as soluções:

```sql
select name, slug, current_status, stage, priority
from public.ae_solutions
where slug in ('organizacao-em-harmonia', 'atendimento-em-harmonia', 'agenda-viva', 'corrente-em-dia')
order by priority;
```

## Passo a passo no GitHub

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
git add .
git commit -m "Cria suite Organizacao em Harmonia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Passo a passo na Vercel

1. Acesse o projeto na Vercel.
2. Vá em **Settings > Environment Variables**.
3. Confirme as variáveis já usadas pelo projeto:

```env
NEXT_PUBLIC_SITE_URL=https://www.automacaoextrema.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_NAME=Automação Extrema
EMAIL_FROM=
EMAIL_COPY_TO=automacao.ao.extremo@gmail.com
AE_INTERNAL_WHATSAPP=19992360856
```

4. Inclua/valide as variáveis BotConversa de Organização em Harmonia descritas em:

```txt
docs/PASSO_A_PASSO_BOTCONVERSA_ORGANIZACAO_EM_HARMONIA.md
```

5. Faça redeploy.

## Teste de cadastro

1. Acesse:

```txt
https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/quero-conhecer
```

2. Preencha:

```txt
Módulo: Atendimento em Harmonia ou Agenda Viva
Nome do contato
WhatsApp
E-mail
Organização opcional
```

3. Verifique:

- Registro em `oh_leads`.
- E-mail para o lead.
- E-mail interno para AE.
- Página de Obrigado.
- WhatsApp pré-preenchido para o número da AE.
- Campos e etiquetas no BotConversa, se configurado.

## Próximos incrementos recomendados

1. Criar área logada única da Organização em Harmonia.
2. Implementar tela Configurações com funções/permissões por módulo.
3. Implementar Agenda Viva: eventos, recorrência, aprovação e conflitos.
4. Implementar Atendimento em Harmonia: dias de atendimento, check-in, fila, retorno e cambonos.
5. Integrar Corrente em Dia à base `oh_people`/`oh_roles` futuramente, sem quebrar a base `ced_*` atual.
