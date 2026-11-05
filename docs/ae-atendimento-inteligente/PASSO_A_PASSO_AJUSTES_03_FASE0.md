# AE Atendimento Inteligente — Ajustes 03 | Instalação, homologação e produção

**Base recebida:** `ae-atendimento-inteligente-ajustes-03-fontes-20261104-231744.zip` (commit informado no manifesto: `cb114f8d933d9d205f094d3002f75939990fb845`).  
**Branch obrigatória:** `feature/ae-atendimento-inteligente-multicliente-v1`.  
**Worktree Windows:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`.  
**Entrega:** interface RMC, login N1/N2, registro assistido paginado, orçamento com validade, 2–3 opções de datas, lembrete manual e logotipo original.

## 0. Delimitação / o que NÃO está ativo

- O número atual do WhatsApp Business do Anderson **não é integrado nem migrado** neste pacote. Nenhuma mensagem é enviada por Meta Cloud API na Fase 0.
- O botão "Abrir mensagem no WhatsApp" abre `wa.me` com texto pré-preenchido. **A pessoa deve conferir destinatário, conteúdo e clicar em Enviar no WhatsApp.** Depois, confirma manualmente no painel.
- O lembrete de 24 h **não é um cron nem envio automático**: aparece como ação no painel quando o orçamento está na janela de 24 horas antes do vencimento. O Anderson abre e confirma o envio manual.
- Cadastro de cliente com **senha padrão 12345678 não foi implementado** por segurança. Durante a Fase 0, N1 cria o contato por telefone normalizado e autorização; clientes só ganharão login próprio após validação de identidade, convite exclusivo/OTP e recuperação de acesso.
- O formulário anônimo permanece bloqueado. A área N2 depende de login Supabase e membership na empresa. Os operadores N1 sem papel proprietário podem registrar pedidos, mas **não criar ou aprovar orçamentos**.
- Chatwoot, n8n, agendamento na Google Agenda, NFS-e e aceite direto pelo portal são evoluções futuras.
- O Centro Automotivo Piloto permanece cadastrado na arquitetura, mas as novas páginas RMC não concedem acesso ao seu conteúdo.

## 1. Verificar worktree e salvar as alterações locais

No PowerShell:

```powershell
$repo   = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip    = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-03-IMPLEMENTACAO.zip'
cd $repo
if ((git branch --show-current) -ne $branch) { throw "Branch incorreta. Esperado: $branch" }
git status -sb
git worktree list
git fetch origin --prune
```

**Se existir qualquer arquivo modificado**, examine `git diff` e faça backup ou commit isolado antes de descompactar. Não execute `git reset --hard`, `git clean -fd` ou `git checkout main` nesta worktree.

Opcional para preservar arquivos que serão substituídos:

```powershell
$backup = 'C:\Users\lacos\Documents\zips\backup-ae-ai-ajustes-03-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Force -Path $backup | Out-Null
$files = @(
  'src\app\solucoes\atendimento-inteligente\page.tsx',
  'src\components\atendimento-inteligente\panel.tsx',
  'src\components\atendimento-inteligente\request-form.tsx',
  'src\components\atendimento-inteligente\request-queue.tsx',
  'src\components\atendimento-inteligente\brand-header.tsx'
)
foreach ($file in $files) {
  $source = Join-Path $repo $file
  if (Test-Path $source) {
    $dest = Join-Path $backup $file
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath $source -Destination $dest
  }
}
```

## 2. Instalar os arquivos completos

Baixe o ZIP e salve em `C:\Users\lacos\Documents\zips` com o nome usado no comando `$zip`. O ZIP tem os novos caminhos já organizados. Extraia na **raiz** do worktree:

```powershell
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --stat
git diff --check
```

Confira estes arquivos:

```powershell
Test-Path 'public\atendimento-inteligente\logo-rmc.png'
Test-Path 'src\app\solucoes\atendimento-inteligente\rmc\page.tsx'
Test-Path 'src\components\atendimento-inteligente\quote-editor.tsx'
Test-Path 'src\app\api\atendimento-inteligente\requests\[id]\quote\route.ts'
Test-Path 'supabase\migrations\20261105090000_ae_atendimento_inteligente_ajustes_03.sql'
```

Em PowerShell, `Test-Path` com colchetes pode interpretar curingas. Para o caminho `[id]`, confirme usando `Test-Path -LiteralPath`.

## 3. Banco de dados Supabase (homologação antes de produção)

1. Confira o **Project ID** do Supabase de homologação e faça backup/snapshot. Não cole credenciais no chat.
2. Confirme que as migrations V1 e Ajustes 02 já foram executadas:
   - `20261103180000_ae_atendimento_inteligente_v1.sql`
   - `20261104173000_ae_atendimento_inteligente_ajustes_02.sql`
3. Abra o SQL Editor do projeto de **homologação** e execute uma única vez o novo arquivo:
   `supabase/migrations/20261105090000_ae_atendimento_inteligente_ajustes_03.sql`.
4. Essa migration cria `ae_ai_quote_settings`, `ae_ai_quotes` e duas RPCs de uso exclusivo do servidor, sem modificar tabelas TUCXA nem habilitar canais.
5. Verifique as estruturas:

```sql
select o.slug, o.name, o.automation_enabled, o.public_intake_enabled,
       s.default_validity_days, s.reminder_hours
from public.ae_ai_organizations o
left join public.ae_ai_quote_settings s on s.organization_id=o.id
where o.slug in ('reparos-rmc','piloto-automotivo');

select tablename, rowsecurity
from pg_tables
where schemaname='public' and tablename in ('ae_ai_quotes','ae_ai_quote_settings');

select routine_name
from information_schema.routines
where routine_schema='public' and routine_name in
 ('ae_ai_create_quote_v3','ae_ai_transition_quote_v3');
```

**Esperado:** RMC e Piloto com automações desligadas; validade inicial 7 dias e aviso manual 24h; novas tabelas protegidas por RLS. Não altere `public_intake_enabled` nesta fase.

### Permissões N1 / N2

O N1 pode ser operador RMC (`operator`) ou administrador AE. Anderson deve ter membership `owner` na RMC. Os usuários devem existir em `Supabase Authentication > Users`, com senha individual forte. Exemplo **após substituir pelo e-mail real**:

```sql
insert into public.ae_ai_memberships(organization_id,user_id,role)
select o.id,u.id,'owner'
from public.ae_ai_organizations o cross join auth.users u
where o.slug='reparos-rmc' and lower(u.email)=lower('EMAIL_REAL_DO_ANDERSON')
on conflict (organization_id,user_id) do update set role=excluded.role;
```

Associe o N1 com `role='operator'` se ele não for administrador da AE. Não conceda `owner` a atendentes apenas para liberar o orçamento.

## 4. Ambiente e testes locais

No arquivo `.env.local` **desta worktree**, mantenha as credenciais Supabase do ambiente de homologação e bloqueie os envios:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO-HOMOLOGACAO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=CHAVE_PRIVILEGIADA_SERVER_ONLY
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
```

Não inclua `.env.local` em commit/ZIP nem exponha a service role no navegador. Verifique:

```powershell
cd $repo
node --version      # projeto exige Node 24.x
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

**Se qualquer validação falhar, não faça merge nem publique**; preserve a saída do comando sem dados secretos. Não foi possível executar build completo no ambiente de preparação da entrega, portanto os testes no Windows são essenciais.

## 5. Rotas para homologação

- Entrada genérica multiempresa: `http://localhost:3000/solucoes/atendimento-inteligente`
- Landing RMC: `http://localhost:3000/solucoes/atendimento-inteligente/rmc`
- Solicitação assistida RMC: `http://localhost:3000/solucoes/atendimento-inteligente/rmc/solicitar`
- Login de operadores: `http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`
- Painel N2: `http://localhost:3000/solucoes/atendimento-inteligente/rmc/atendimento`
- Cadastro informativo do cliente: `http://localhost:3000/solucoes/atendimento-inteligente/rmc/cadastro`
- Painel geral AE: `http://localhost:3000/admin/ae/atendimento-inteligente`

Os caminhos antigos `/solicitar`, `/entrar` e `/painel` redirecionam para os correspondentes RMC. A página genérica não exibe RMC como se fosse a única empresa.

## 6. Roteiro mínimo de homologação, em ordem

**A — Visual / mobile:** testar em 360 px, 390 px, 430 px e desktop. Cabeçalho com logo RMC original e selo AE; cards da landing abrem pop-up. O conteúdo principal é compacto, mas aparelhos pequenos ainda podem requerer rolagem; a interface não deve cortar elementos nem ocultar botões.

**B — Segurança de acesso:** cliente anônimo não consegue registrar pedido, criar orçamento ou visualizar solicitações. O operador N1 pode registrar pedidos RMC, mas ao tentar `POST/PATCH` na API de orçamentos recebe `403`. Anderson `owner` vê RMC, não vê Piloto. Um UUID de outra empresa não pode ser usado para ler ou alterar pedidos, anexos ou orçamentos.

**C — Registro N1:** solicitar consentimento, coletar nome, telefone com DDD, categoria, bairro, descrição e 1 foto válida. Enviar pedido. Conferir que o contato foi vinculado à empresa RMC e a origem está como `assisted_n1`. Confirmar que não foi criada senha nem enviada mensagem Cloud API.

**D — N2 orçamento:** acessar painel RMC; abrir pedido. Testar criação de minuta com materiais, mão de obra, outros valores e 2 ou 3 datas distintas. Testar validações: descrição curta, data duplicada, valor negativo, validade acima de 30 dias. O total deve ser calculado pelo banco. Verificar que só aparece como `draft` ao salvar.

**E — WhatsApp manual:** clicar em `Abrir mensagem no WhatsApp`, conferir destinatário e texto; enviar pelo WhatsApp Business atual, então voltar ao painel e clicar `Confirmar que enviei`. Conferir mudança para `sent` e histórico. Apenas abrir o link **não** marca como enviado.

**F — Lembrete e validade:** em homologação, use um orçamento com validade de 1 dia para ensaiar o comportamento da janela de 24h, sem alterar a hora do servidor. Confirme que há apenas orientação e botão manual; nenhum cron ou API Meta é disparado. Verificar bloqueio de aceite após vencimento. Não fazer envio de teste a clientes reais sem autorização.

**G — Aceite e agenda:** registrar a data que o cliente confirmou pelo WhatsApp; testar data inválida, uma das datas propostas e recusa. Verificar registro do histórico, status `scheduled` e que o horário segue pendente de confirmação.

**H — Regressão:** testar TUCXA, Memórias que Encantam, Bazar e acesso AE. Nenhuma migração ou arquivo desses módulos foi modificado no pacote.

## 7. Commit, push e Preview Vercel

Quando todas as verificações locais passarem:

```powershell
cd $repo
if ((git branch --show-current) -ne $branch) { throw 'Branch incorreta' }
git add -A src/app/solucoes/atendimento-inteligente
git add -A -- ':(literal)src/app/api/atendimento-inteligente/requests/[id]'
git add -A src/app/api/atendimento-inteligente/organizations
git add -A src/components/atendimento-inteligente
git add -A public/atendimento-inteligente/logo-rmc.png
git add -A supabase/migrations/20261105090000_ae_atendimento_inteligente_ajustes_03.sql
git add -A docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_03_FASE0.md
git diff --cached --stat
git diff --cached --check
git status -sb
git commit -m 'feat(ae): landing RMC e orcamentos assistidos ajustes 03'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Não use `git add .` nem `git push origin main`. Confirme Preview Vercel da branch, suas variáveis e **separação do banco de homologação**. Repita testes A–H no Preview sem habilitar canal Meta/WhatsApp real.

## 8. Publicação controlada em produção (Fase 0)

1. Com Preview e CI aprovados, backup do Supabase **de produção**.
2. Executar a migration 03 em produção, depois das V1/02, com `automation_enabled=false` e `public_intake_enabled=false`.
3. Garantir variáveis Production: `AE_AI_PUBLIC_REQUESTS_ENABLED=false` e `AE_AI_SEND_LIVE=false`; valores Supabase do projeto de produção apenas.
4. Criar contas individuais de N1 e Anderson e associar as permissões RMC; testar autenticação em Preview/produção conforme isolamento.
5. Abrir PR da branch para `main`; revisar arquivos modificados, segurança, build e logs antes do merge.
6. Fazer merge aprovado; aguardar o deployment Production concluir; não usar o domínio público como sinônimo de que tudo já esteja validado.
7. Executar uma solicitação fictícia controlada com contas autorizadas; conferir orçamento, histórico e links manuais. Somente depois usar 5–10 casos reais autorizados.
8. Manter o WhatsApp Business comercial atual sem migração e preservar o contato humano. Documentar tempo de resposta, perguntas faltantes e retrabalho.

### Se for necessário voltar atrás

- Use o Rollback no Vercel para versão estável ou reverta o PR em Git. **Não remova as tabelas por padrão**, pois podem conter dados reais.
- Mantenha `AE_AI_PUBLIC_REQUESTS_ENABLED=false` e `AE_AI_SEND_LIVE=false` enquanto houver incidente.
- Revise o controle de acesso e preserve logs necessários conforme a política de proteção de dados. A migração só poderá ser revertida em banco mediante plano específico de restauração sem perda de registros.

## 9. Mensagem ao Anderson e critérios do piloto

Explique a fase como **atendimento assistido**, sem prometer que o WhatsApp será automatizado agora. O N1 organiza dados, fotos e bairro; o Anderson N2 analisa, define preço, abre a mensagem pronta no WhatsApp Business e registra o aceite/agenda. Cliente continua no número conhecido. O propósito é acertar o fluxo antes de automatizá-lo. Meça principalmente o número de idas e vindas, tempo de orçamento, solicitações incompletas e clareza de aprovação.
