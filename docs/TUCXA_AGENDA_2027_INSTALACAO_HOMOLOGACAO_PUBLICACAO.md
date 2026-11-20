# Calendário Anual TUCXA 2027 — Implementação V1

**Data dos fontes analisados:** 06/11/2026 · **base do ZIP recebido:** commit `e28c948` · **branch:** `feature/tucxa-agenda-viva-2027-calendario-anual-v1`.

## O que entrega

Nova rota `/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027`, com 12 meses, cores para 10 categorias, filtros por mês/categoria/público/local/busca, visão anual/mensal/lista, impressão em PDF e sugestão de eventos. Nova rota de gestão `/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/gestao`, com criação/edição, aprovação, rejeição e solicitação de ajustes. API privada de gestão com JWT Supabase + lista explícita de e-mails autorizados. Os endpoints e tabelas de 2026 permanecem intocados.

## Regras dos dados

- Os calendários do TUCXA e Sementinha de 2026 foram convertidos em **rascunhos a confirmar** para 2027; mantém-se o dia da semana, não o dia do mês.
- Rotina projetada: segundas/terças (atendimento), quartas (tratamento), 1ª/3ª quinta (Grupo 1) e 2ª/4ª quinta (Grupo 2), até quatro ocorrências mensais, fora dos recessos projetados.
- Eventos específicos (pizza, feijoada, festa junina, confraternização, bazar e ações Sementinha) entram como rascunhos. **Não são datas confirmadas de 2027**.
- Recessos de janeiro, julho e dezembro também são provisórios. Verificar feriados nacionais, estaduais e municipais (Campinas) antes de qualquer aprovação; a V1 não bloqueia feriados automaticamente.
- Apenas eventos com `status='aprovado'` **e** `is_public=true` são divulgados. Dados de proponentes não são retornados no endpoint público.

## 1. Preparação local

No PowerShell, utilizando a worktree existente:

```powershell
$P = 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
git -C "$P" status -sb
git -C "$P" fetch origin --prune
git -C "$P" log --oneline --max-count=5 origin/main..HEAD
git -C "$P" log --oneline --max-count=5 HEAD..origin/main
```

**Se a branch estiver defasada da main** e estiver tudo commitado, avaliar primeiro os commits de diferença e então, se apropriado, executar `git -C "$P" merge origin/main` na branch 2027. Não usar `reset --hard`. A branch de integração TUCXA pode ter ajustes ainda fora da main; conferir antes do PR final.

Instale o Node.js 24.x. Execute `node -v`. O `package.json` exige `24.x`.

Copie o ZIP de implementação para `C:\Users\lacos\Documents\zips` e o script `.ps1` para `C:\Users\lacos\Documents\scripts`.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\lacos\Documents\scripts\instalar-tucxa-agenda-2027.ps1'
cd 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
npm ci
npx tsc --noEmit
npx eslint src/lib/organizacao-em-harmonia/tucxa-agenda-2027.ts src/components/organizacao-em-harmonia/tucxa-agenda-2027-client.tsx src/app/api/organizacao-em-harmonia/tucxa/agenda-2027/route.ts src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/page.tsx src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/gestao/page.tsx
npm run build
```

Caso qualquer verificação falhe, não publique e compartilhe a saída completa do erro.

## 2. Supabase

1. Preferir projeto Supabase de **homologação** com cópia sanitizada dos registros necessários. Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` no navegador ou em variável `NEXT_PUBLIC_*`.
2. No SQL Editor do projeto correto, **revise e execute uma única vez** `supabase/migrations/20261106220000_tucxa_calendario_anual_2027_v1.sql`.
3. Essa migration cria duas tabelas novas: `tucxa_annual_events_2027` e `tucxa_annual_events_2027_audit`. Não modifica tabelas da Agenda Viva existente.
4. Execute:

```sql
select status, count(*) as quantidade
from public.tucxa_annual_events_2027
group by status order by status;

select source_date_2026, event_date, title, category, status
from public.tucxa_annual_events_2027
where source_date_2026 is not null
order by event_date, title;

select relname, relrowsecurity
from pg_class
where relname in ('tucxa_annual_events_2027','tucxa_annual_events_2027_audit');
```

Todos os seeds devem começar em `rascunho` e `relrowsecurity=true` nas duas tabelas. **Não aprovar em lote.**

## 3. Ambiente local

Se `.env.local` ainda não existir nessa worktree, configure os mesmos nomes de variáveis utilizados pelo projeto, usando credenciais do ambiente de homologação (não copiar segredos para Git):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (servidor apenas)
- `OH_AGENDA_2027_APPROVER_EMAILS=tucxacentro@gmail.com` (ou vários e-mails institucionais separados por vírgula, com contas autenticadas e verificadas no Supabase)

O e-mail cadastrado na variável deve estar habilitado para autenticação da área cliente/gestão do TUCXA.

```powershell
npm run dev
```

Abra:
- Público: `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027`
- Gestão: `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/gestao`
- Agenda Viva atual (regressão): `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva`

## 4. Checklist de homologação (usar projeto Supabase de testes)

1. Abrir o público sem login: inicialmente nenhum rascunho deve aparecer.
2. No banco, verificar quantidade e datas de rascunhos de segunda, terça, quarta e quinta. Conferir as datas pontuais com Diretoria, Sementinha, feriados e funcionamento.
3. Efetuar login pela área cliente/gestão e abrir Gestão 2027. Um e-mail não autorizado deve receber 403 mesmo tendo sessão válida.
4. Criar um evento de teste **rascunho**. Confirmar que não aparece no calendário público.
5. Aprovar esse evento. Confirmar que aparece com cor/legenda corretas, mês e lista.
6. Retirar da publicação (voltar a rascunho) e confirmar que desaparece do público.
7. Enviar sugestão usando um celular **de teste controlado** (com DDD), conferir normalização e que a proposta permanece `pendente`.
8. Rejeitar ou solicitar ajustes com motivo. Confirmar que não aparece no público.
9. Testar filtros de mês, categoria, público, local, busca e impressão em PDF; validar celular, desktop e acessibilidade pelo teclado.
10. Testar eventos com duração de mais de um dia e diferentes localidades.
11. Em guia anônima, consultar `GET /api/organizacao-em-harmonia/tucxa/agenda-2027?gestao=1`: deve retornar **403**.
12. Verificar no navegador que nenhum e-mail ou celular do proponente surge no JSON do GET público.
13. Verificar que as rotas da Agenda Viva 2026, agendamentos, Memórias e Bazar continuam funcionando.
14. Na base, verificar rastreamento das decisões em `tucxa_annual_events_2027_audit`.

**Nota de segurança:** limite de 3 sugestões por celular em 24 h, honeypot e verificação de origem são barreiras básicas, não substituem WAF/CAPTCHA em exposição pública de grande volume. Considere Cloudflare Turnstile (plano gratuito) antes de divulgar amplamente o formulário. Não utilizar celular de terceiros sem autorização.

## 5. GitHub e Vercel — SEM publicar antes da homologação

```powershell
$P = 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
git -C "$P" status -sb
git -C "$P" diff --check
git -C "$P" add 'src/lib/organizacao-em-harmonia/tucxa-agenda-2027.ts' 'src/components/organizacao-em-harmonia/tucxa-agenda-2027-client.tsx' 'src/app/api/organizacao-em-harmonia/tucxa/agenda-2027/route.ts' 'src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027' 'supabase/migrations/20261106220000_tucxa_calendario_anual_2027_v1.sql' 'docs/TUCXA_AGENDA_2027_INSTALACAO_HOMOLOGACAO_PUBLICACAO.md'
git -C "$P" diff --cached --stat
git -C "$P" commit -m 'feat(tucxa): calendario anual 2027 isolado com filtros e aprovacao'
git -C "$P" push -u origin feature/tucxa-agenda-viva-2027-calendario-anual-v1
```

Abra um Pull Request da feature para `main` no GitHub. O Vercel pode criar Preview por branch/PR: confirme o ambiente e as variáveis para Preview (preferência: Supabase de homologação). Homologue pelo URL Preview. A **migration do banco de produção** deve ser executada de modo controlado **antes** de promover a aplicação para produção; não aplique migrações antigas indiscriminadamente com `supabase db push`.

Depois de todos os testes e aprovação formal, faça o merge do PR para `main` pela interface do GitHub, confirme o deployment de Production no Vercel e realize smoke tests das 3 rotas. Se as alterações atuais da Agenda Viva ou agendamentos ainda não estiverem integradas à main, resolva essa divergência antes de fazer o merge.

## 6. Rollback

Se houver problema após publicar, reverta o commit/PR desta funcionalidade (novo commit de revert, sem `reset --hard` e sem forçar a main) e aguarde o redeploy. As novas tabelas podem permanecer sem uso, evitando perda de sugestões e trilha de auditoria; não execute `DROP TABLE` durante um rollback emergencial.

## 7. Limites da V1

- Não faz sincronização bidirecional automática com a Agenda Viva antiga nem Google Agenda; evita a duplicação inadvertida de compromissos de produção.
- Não confirma automaticamente feriados, horário de atendimento ou datas da Diretoria.
- Não envia WhatsApp/e-mail automaticamente a proponentes.
- Integração na navegação antiga fica para uma etapa posterior, depois da aprovação. A rota 2027 já pode ser acessada diretamente.
