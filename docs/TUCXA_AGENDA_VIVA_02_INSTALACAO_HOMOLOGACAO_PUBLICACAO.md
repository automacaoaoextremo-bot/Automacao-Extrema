# TUCXA · Agenda Viva — Evolução 02 (multianual)

**Fontes-base enviados:** `tucxa-agenda-viva-02-fontes-20261108-053645.zip`  
**Branch esperada:** `feature/tucxa-agenda-viva-2027-calendario-anual-v1`  
**Commit no inventário:** `4f9e2b8`  
**Worktree:** `C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027`

## 0. Escopo e limitações

- A Agenda Viva já existente em `/tucxa/agenda-viva` e seus módulos 2026 permanecem **sem alteração**.
- A rota **2027** continua válida, mas agora permite selecionar 2027 até 2100. A nova URL genérica é `/tucxa/agenda-viva/calendario` (e `/calendario/gestao`).
- A tela inicial foi compactada à semelhança da página de Agendamento; filtros, legenda, calendário de 12 meses, sugestões e gestão usam janelas sobrepostas com rolagem interna.
- A legenda mantém as **dez cores** existentes. O calendário mostra 12 meses em 4 colunas, com ampliação de mês e consulta do dia.
- O texto da tela prioriza benefícios práticos (clareza, previsibilidade, participação), conforme referência Deep Dive. Não promete ganhos ou resultados não verificáveis.
- Os eventos de 2027 **aprovados e públicos** continuam visíveis. Rascunhos e sugestões não são publicados automaticamente.
- A migration V2 amplia os CHECKs de datas da **tabela existente** `tucxa_annual_events_2027`, que preserva seu nome por compatibilidade. Não cria novas tabelas nem altera RLS. A ampliação permite novas atividades de 2028 em diante, sem semeá-las automaticamente.
- 2026 **continua acessível na Agenda Viva antiga**; este calendário multianual começa em 2027. Para anos posteriores, é preciso cadastrar e aprovar os eventos correspondentes.
- O calendário não valida automaticamente feriados de Campinas, recessos ou escalas. A Diretoria deve verificar antes de aprovar.

## 1. Preparação: PowerShell e Git

```powershell
$P = 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
$B = 'feature/tucxa-agenda-viva-2027-calendario-anual-v1'
git -C "$P" status -sb
git -C "$P" branch --show-current
git -C "$P" worktree list
git -C "$P" fetch origin --prune
git -C "$P" log --oneline HEAD..origin/main
git -C "$P" log --oneline origin/main..HEAD
```

**Interrompa se** a branch for diferente de `$B`, houver alterações locais não preservadas ou aparecerem commits da `main` ainda não revisados. **Não use** `reset --hard`, `pull` automático ou `merge` agora. A worktree `automacao-extrema-integracao-tucxa` pode ter atualizações ainda fora da `main`; inspecione antes do PR.

## 2. Instalar os arquivos completos localmente

Copie:

- ZIP: `C:\Users\lacos\Documents\zips\tucxa-agenda-viva-02-implementacao-20261108.zip`
- PS1: `C:\Users\lacos\Documents\scripts\instalar-tucxa-agenda-viva-02.ps1`

Execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\lacos\Documents\scripts\instalar-tucxa-agenda-viva-02.ps1"
```

O instalador verifica se a branch é a esperada, exige árvore de trabalho limpa e compara SHA-256 de **todos os arquivos existentes** com o ZIP analisado. Se algum arquivo tiver mudado, aborta sem sobrescrever. Antes de copiar, faz backup local em `C:\Users\lacos\Documents\zips\backup-agenda-viva-02-...`. Não roda Git commit, npm, SQL nem Vercel.

**O que o pacote adiciona/atualiza:**

1. `src/components/organizacao-em-harmonia/tucxa-agenda-2027-client.tsx` — interface compacta, pop-ups, 12 meses, gestão paginada e formulário.
2. `src/lib/organizacao-em-harmonia/tucxa-agenda-2027.ts` — anos 2027–2100 e validação de datas.
3. `src/app/api/organizacao-em-harmonia/tucxa/agenda-2027/route.ts` — API com filtro por ano, mantém regras de aprovação e dados privados.
4. `src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/page.tsx` — URL antiga compatível.
5. `src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027/gestao/page.tsx` — gestão antiga compatível.
6. `src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/calendario/page.tsx` — nova URL pública genérica.
7. `src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/calendario/gestao/page.tsx` — nova URL de gestão genérica.
8. `supabase/migrations/20261108090000_tucxa_agenda_viva_multianual_v2.sql` — migração aditiva.
9. Este manual e manifesto de integridade.

## 3. Node / dependências / verificação estática

O `package.json` recebido exige **Node.js 24.x**. Configure essa versão também no projeto Vercel. No PowerShell:

```powershell
cd 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
node -v
npm ci
npx tsc --noEmit
npx eslint src/components/organizacao-em-harmonia/tucxa-agenda-2027-client.tsx src/lib/organizacao-em-harmonia/tucxa-agenda-2027.ts src/app/api/organizacao-em-harmonia/tucxa/agenda-2027/route.ts
npm run build
git diff --check
git status -sb
```

**Se algum comando falhar, não avance.** O pacote teve validação sintática TypeScript/TSX, mas o build real de Next.js precisa ser executado no seu ambiente Node 24 com dependências e variáveis válidas.

## 4. Banco Supabase: homologar primeiro

O aplicativo continua usando as tabelas existentes:

- `public.tucxa_annual_events_2027`
- `public.tucxa_annual_events_2027_audit`

**Não execute novamente a migration V1 se ela já estiver aplicada.** Antes de SQL em produção, tenha uma estratégia de backup/restauração da base Supabase e confirme que selecionou o projeto correto.

### 4.1. Registrar o estado inicial (somente leitura)

```sql
select extract(year from event_date)::int as ano, status, is_public, count(*) as total
from public.tucxa_annual_events_2027
group by 1, 2, 3 order by 1, 2, 3;

select conname, pg_get_constraintdef(oid) as regra
from pg_constraint
where conrelid = 'public.tucxa_annual_events_2027'::regclass
  and contype = 'c'
order by conname;

select relname, relrowsecurity
from pg_class where relname in
 ('tucxa_annual_events_2027', 'tucxa_annual_events_2027_audit');
```

Salve os resultados e o total de eventos aprovados antes de prosseguir. Não compartilhe dados pessoais dos proponentes.

### 4.2. Aplicar a migration V2

No **Supabase de homologação** → SQL Editor → cole o conteúdo completo de:

`supabase/migrations/20261108090000_tucxa_agenda_viva_multianual_v2.sql`

Revise e execute. Ela ocorre dentro de uma transação e **não contém INSERT/UPDATE/DELETE** de eventos; amplia apenas as validações de datas.

Depois, execute novamente as três consultas de 4.1. Os totais por status/ano não podem mudar. As tabelas devem continuar com `relrowsecurity = true`.

### 4.3. Variáveis no `.env.local` da worktree

```text
NEXT_PUBLIC_SUPABASE_URL=<URL_DO_SUPABASE_DE_HOMOLOGACAO>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<CHAVE_PUBLICA_DE_HOMOLOGACAO>
SUPABASE_SERVICE_ROLE_KEY=<SEGREDO_APENAS_SERVIDOR>
OH_AGENDA_2027_APPROVER_EMAILS=tucxacentro@gmail.com
```

Nunca inclua `.env.local` no ZIP, GitHub ou mensagens. A conta com e-mail autorizado deve estar autenticada e verificada no mesmo Supabase. A chave `SUPABASE_SERVICE_ROLE_KEY` **não pode** ter prefixo `NEXT_PUBLIC_`.

## 5. Homologação local

```powershell
npm run dev
```

URLs:

- Nova pública: `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/calendario`
- Nova gestão: `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/calendario/gestao`
- Pública legado (continuará ativa): `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027`
- Agenda Viva original (não alterada): `http://localhost:3000/solucoes/organizacao-em-harmonia/tucxa/agenda-viva`

### Checklist de aprovação — anote OK / NOK

- [ ] Interface inicial mobile compacta com logotipos, cabeçalho e botões, sem exigir rolagem **para encontrar as ações principais**.
- [ ] Calendário anual abre em modal; 12 meses em 4 colunas; dias realçados com cores das categorias; mês ampliado e detalhes por dia funcionam.
- [ ] Legenda das dez categorias mantém nomes/cores da V1; filtros por categoria, mês, público, local e busca funcionam; gestão inclui filtro de situação.
- [ ] Seleção 2027 e 2028 altera a grade corretamente (inclusive ano bissexto 2028); URL antiga `/2027` continua abrindo.
- [ ] Os totais e a listagem pública de 2027 são consistentes com `status='aprovado' AND is_public=true` no banco de homologação.
- [ ] Rascunhos, pendentes e eventos privados **não** aparecem no endpoint público nem no calendário.
- [ ] O público pode sugerir evento; proposta permanece `pendente`, sem expor nome/celular/e-mail na API pública.
- [ ] Gestor autenticado pode listar, editar, aprovar e retirar da publicação; ação registrada na auditoria.
- [ ] Conta sem autorização recebe 403 em `GET /api/organizacao-em-harmonia/tucxa/agenda-2027?ano=2027&gestao=1`.
- [ ] Em 2028, evento de teste é criado e aprovado; ao voltar para 2027, a lista anterior está intacta.
- [ ] PDF/impressão do calendário anual fica legível (Chrome/Edge, paisagem).
- [ ] Testar em 360 px e 390 px, no desktop, com zoom 200%, por teclado e em janela anônima.
- [ ] Agenda Viva original 2026, Agendamentos e páginas públicas TUCXA permanecem intactos.
- [ ] Revisar feriados nacionais/estaduais/Campinas e recessos; não aprovar rascunhos projetados em lote.

**Limitações:** não há importação automática de eventos de 2026; o novo cadastro de anos futuros é manual. O número máximo atual do GET é de 2.000 eventos por ano. A proteção anti-spam do formulário da V1 continua básica (limite por telefone e honeypot), sujeita a spam distribuído: antes de ampla divulgação, considere verificação adicional como Turnstile com validação no servidor.

## 6. GitHub — somente após todos os testes locais

```powershell
$P = 'C:\Users\lacos\Documents\Github\automacao-extrema-agenda-2027'
$B = 'feature/tucxa-agenda-viva-2027-calendario-anual-v1'
git -C "$P" status -sb
git -C "$P" diff --check
git -C "$P" diff --stat

git -C "$P" add -- 'src/components/organizacao-em-harmonia/tucxa-agenda-2027-client.tsx' 'src/lib/organizacao-em-harmonia/tucxa-agenda-2027.ts' 'src/app/api/organizacao-em-harmonia/tucxa/agenda-2027/route.ts' 'src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027' 'src/app/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/calendario' 'supabase/migrations/20261108090000_tucxa_agenda_viva_multianual_v2.sql' 'docs/TUCXA_AGENDA_VIVA_02_INSTALACAO_HOMOLOGACAO_PUBLICACAO.md'
git -C "$P" diff --cached --stat
git -C "$P" diff --cached --check
git -C "$P" commit -m "feat(tucxa): agenda viva multianual com experiencia mobile e modais"
git -C "$P" push -u origin "$B"
```

Abra PR de `feature/tucxa-agenda-viva-2027-calendario-anual-v1` para `main`. Revise se a `main` já contém os ajustes recentes da worktree `automacao-extrema-integracao-tucxa` antes do merge. Não mexa nas branches de outros projetos.

## 7. Vercel Preview → Produção

1. No Vercel, confirme a **Production Branch = `main`**, a versão Node 24 e a integração GitHub.
2. Configure **Preview** com credenciais do **Supabase de homologação**, incluindo `OH_AGENDA_2027_APPROVER_EMAILS` (Server/Preview). Não use chave de produção em Preview se for testar escrita.
3. Aguarde a implantação automática da branch do PR, abra o Preview e repita o checklist acima, inclusive acesso não autorizado 403 e regressões.
4. Antes de produção, confirme que os eventos aprovados de 2027 na base **real** foram contabilizados e que há backup/restauração da base.
5. No **Supabase de produção**, execute a migration V2 e repita as consultas de 4.1. Isso é compatível com a versão antiga do código (ela continua aceitando só 2027), desde que a migration V1 exista.
6. Configure `OH_AGENDA_2027_APPROVER_EMAILS` em **Vercel Production**; outras chaves Supabase existentes devem permanecer em segredo.
7. Faça merge do PR no GitHub somente após aprovação. A Vercel implantará a `main` automaticamente. Não crie deployment manual em Production Branch de outra worktree.
8. Verifique as URLs de produção `/calendario`, `/calendario/gestao`, `/2027`, `/agenda-viva` e o fluxo de agendamento existente.
9. Confira logs de API no Vercel e faça um teste de sugestão controlado; não publique evento sem confirmação da Diretoria.

## 8. Intercorrências e rollback

- **Instalador recusou arquivo:** houve divergência em relação aos fontes enviados; não force. Faça novo ZIP para revisar o conflito.
- **Erro 500 / tabela ausente:** conferir projeto Supabase, migration V1, V2, nomes de variáveis e logs da API.
- **403 na gestão:** conferir sessão Supabase, e-mail verificado e `OH_AGENDA_2027_APPROVER_EMAILS` do ambiente.
- **Eventos aprovados sumiram:** conferir `?ano=2027`, acesso ao Supabase correto e `status='aprovado' and is_public=true` antes de alterar dados.
- **Erro após publicação:** reverta **apenas o PR/commit** no GitHub e deixe a ampliação dos CHECKs instalada até análise; não restaure o banco de produção sem avaliar os registros novos de outros anos. Nenhum evento é apagado pela migration V2.

## 9. Observações de segurança e qualidade

- Este pacote foi analisado estaticamente e seus TS/TSX passam no parser TypeScript. O build completo Next.js, a conexão real ao Supabase e a visualização no Vercel **não foram executados aqui**; eles fazem parte das etapas de homologação.
- O limite de 4 colunas na miniatura anual torna os números pequenos no celular: a tela oferece uma **visão mensal ampliada ao tocar no mês**.
- Ao revisar algum evento, preserve a chave canônica de identidade (celular normalizado) para proponentes: o nome não pode ser usado como identificador exclusivo.
