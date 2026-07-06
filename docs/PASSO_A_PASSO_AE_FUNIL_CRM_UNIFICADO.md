# Passo a passo — Funil / CRM unificado da Automação Extrema

## Objetivo

Centralizar em uma única tela os leads das soluções da Automação Extrema, evitando páginas e menus duplicados por produto.

A nova tela fica em:

```txt
/admin/ae/funil
```

Ela consolida, quando as tabelas existem no Supabase:

```txt
ced_leads  -> Corrente em Dia
oh_leads   -> Organização em Harmonia / Agenda Viva / Atendimento em Harmonia
ae_leads   -> Diagnóstico AE geral
```

## O que foi ajustado

1. A página `/admin/ae/funil` passou a usar o mesmo `AdminPageShell` da gestão AE, mantendo o menu lateral no desktop.
2. A opção separada “Funil Corrente em Dia” foi removida do menu lateral.
3. A rota antiga `/admin/ae/corrente-em-dia/funil` agora redireciona para:

```txt
/admin/ae/funil?solution=corrente-em-dia
```

4. O CRM unificado permite filtrar por solução/módulo e etapa.
5. A API nova `/api/admin/funil-crm` busca leads do Corrente em Dia, Organização em Harmonia e Diagnóstico AE.
6. O lead do Tucxa, criado em `oh_leads`, passa a aparecer no filtro “Organização em Harmonia” ou “Agenda Viva”.
7. As etapas foram padronizadas:

```txt
Lead recebido
Acesso enviado
Em configuração
Configuração concluída
Treinamento concluído
Avaliação 30 dias
Follow-up morno
Lead esfriando
Cliente ativo
Não convertido
```

## Atualização local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

npm run lint
npm run build
npm run dev
```

Teste local:

```txt
http://localhost:3000/admin/ae/funil
http://localhost:3000/admin/ae/funil?solution=organizacao-em-harmonia
http://localhost:3000/admin/ae/funil?solution=agenda-viva
http://localhost:3000/admin/ae/funil?solution=corrente-em-dia
```

## Supabase

Não há SQL obrigatório nesta etapa, porque a API unificada lê diretamente as tabelas já existentes.

Para confirmar se o lead do Tucxa existe:

```sql
select id, contact_name, email, whatsapp, interest_module, priority_module, status, implantation_due_at, next_reminder_at, created_at
from public.oh_leads
where lower(email) = lower('tucxacentro@gmail.com')
order by created_at desc;
```

Para confirmar leads do Corrente em Dia:

```sql
select id, responsible_name, email, whatsapp, organization_name, status, access_due_at, created_at
from public.ced_leads
order by created_at desc
limit 20;
```

## GitHub

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Unifica Funil CRM da Automacao Extrema"
git push origin feature/organizacao-em-harmonia
```

## Vercel

Depois do push, valide o Preview da branch. Quando estiver pronto para produção:

```powershell
npx vercel --prod
```

## Roteiro de validação

1. Acessar `/admin/ae/funil`.
2. Confirmar que o menu lateral aparece no desktop.
3. Confirmar que não há cabeçalho duplicado.
4. Filtrar por “Organização em Harmonia”.
5. Confirmar se o lead do Tucxa aparece.
6. Filtrar por “Agenda Viva”.
7. Confirmar se o mesmo lead aparece quando o módulo prioritário é Agenda Viva.
8. Filtrar por “Corrente em Dia”.
9. Confirmar se os leads antigos do Corrente em Dia aparecem.
10. Testar ações de etapa:
    - Acesso enviado
    - Em configuração
    - Configuração concluída
    - Treinamento concluído
    - Avaliação 30 dias
11. Confirmar no Supabase se o status foi atualizado.

## Observação sobre BotConversa

As palavras-chave dos fluxos devem continuar separadas por solução/módulo para evitar conflito:

```txt
CED: Corrente em Dia, Quero conhecer o Corrente em Dia, CED
OH: Organização em Harmonia, Quero conhecer a Organização em Harmonia, OH
AGV: Agenda Viva, Quero conhecer o Agenda Viva, AGV
AEH: Atendimento em Harmonia, Quero conhecer o Atendimento em Harmonia, AEH
```

Evite palavras genéricas repetidas, como “Quero conhecer” ou “Cliente Fundador” sozinhas em vários fluxos.
