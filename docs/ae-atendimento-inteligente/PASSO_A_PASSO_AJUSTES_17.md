# AE Atendimento Inteligente — Ajustes 17

**Base exata:** `ae-atendimento-inteligente-ajustes-17-fontes-20261115-195548.zip` (HEAD `b919c6c147ff1ba6c5a9c7fb429f2888c312cd35`).

**Branch:** `feature/ae-atendimento-inteligente-multicliente-v1`.

## O que mudou

- Novo painel de entrada da **Reparos RMC**, separado do painel multiempresa da AE. A página `/rmc/atendimento` agora carrega o `RmcDashboard`.
- N1: cartões **Cadastrar cliente**, **Registrar pedido**, **Acompanhar pedidos**.
- N2: resumo inicial das solicitações em análise/orçamento, com atalhos para **Solicitações**, **Serviços e custos**, **Materiais**, **Ferramentas**, **Endereços RMC**, **Veículos**, **Fornecedores**, **Contratos** e **Revisão WhatsApp**.
- Cada área abre numa tela separada; **Fechar** retorna ao nível anterior, sem sair da conta. A autenticação e o botão Sair continuam gerenciados pelo `AiOperatorGuard`/`AiUserMenu`.
- Listas com páginas de cinco pedidos, seis itens de catálogo e quatro rascunhos; cadastro operacional dividido em etapas curtas. Detalhes longos podem rolar por acessibilidade, se necessário.
- Os rascunhos de WhatsApp não aparecem na página inicial nem criam pedidos automaticamente.
- Nova migration **somente de dados** cadastra de forma idempotente as 12 categorias de serviço já usadas no formulário, sem preços arbitrários.
- Nenhuma API de autorização foi alterada. Permissões continuam verificadas no servidor: N1 somente consulta/registra; cadastros N2 e decisão técnica restritos a `owner`/administrador autorizado.
- O script `01_AJUSTAR_DISPLAY_N1_AE.mjs` é separado e **não** faz parte do pacote de publicação.

## 1. Pré-requisitos e segurança

1. Usar **Node 24.x** e Git em `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`.
2. Certificar-se de que a branch ativa é `feature/ae-atendimento-inteligente-multicliente-v1`. Se a worktree estiver em outra branch, não force checkout com arquivos locais modificados.
3. Preservar arquivos não rastreados e os históricos dos clientes. **Nunca executar `git reset --hard`, `git clean -fd` ou `git add -A` neste procedimento.**
4. Manter separadas as bases Supabase de Preview/homologação e Production. Verificar o projeto Supabase antes de executar SQL.
5. `AE_AI_SEND_LIVE=false` na homologação. Não conectar o WhatsApp Cloud API só para testar a tela.

## 2. Conferir worktree

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
cd $repo
git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
git rev-parse HEAD
```

O HEAD local da coleta foi `b919c6c147ff1ba6c5a9c7fb429f2888c312cd35`; se sua base mudou desde então, compare as diferenças antes de sobrescrever.

## 3. Instalar com backup

Salve o ZIP e o instalador em:

- `C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-17-IMPLEMENTACAO.zip`
- `C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-17.ps1`

Depois:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File 'C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-17.ps1' `
  -RepoPath 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento' `
  -ZipPath 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-17-IMPLEMENTACAO.zip'
```

O instalador cria um backup com data/hora em `Documents\zips`. Se encontrar arquivo-alvo com mudanças locais, **interrompe**; confira `git diff -- caminho` e o backup. Use `-AllowModifiedFiles` somente depois de decidir conscientemente pela substituição.

## 4. Conferir código e validar

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
git status -sb
git diff --stat
git diff --check
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Todos devem passar antes de commit/push. Se o build reclamar de variáveis Supabase, configure as variáveis válidas do ambiente de **homologação** no `.env.local` (fora do Git).

## 5. Migration 17 (homologação primeiro)

Arquivo: `supabase/migrations/20261115203000_ae_atendimento_inteligente_ajustes_17.sql`.

1. Confirmar que a migration 16 (`ae_ai_rmc_catalog`) está aplicada no Supabase alvo.
2. Fazer snapshot/backup dos dados relevantes.
3. No SQL Editor com papel administrativo, executar o conteúdo completo da migration 17, **primeiro na homologação**.
4. Conferir:

```sql
select kind, name, details
from public.ae_ai_rmc_catalog
where organization_id = (select id from public.ae_ai_organizations where slug = 'reparos-rmc')
  and kind = 'service'
order by name;
```

Resultado esperado: os 12 tipos de serviço iniciais, junto a eventuais tipos que Anderson já tenha incluído, sem duplicar nomes. Valores de mão de obra ficam vazios até serem informados pelo N2.

**Não** executar em Production antes da homologação. Esta migration não altera o schema e não inclui dados pessoais.

## 6. Homologação funcional no localhost

```powershell
npm run dev
```

Acesse `http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`.

Testar:

- Conta **N1 Automação Extrema**: aparece cartão de boas-vindas, cadastrar cliente, registrar solicitação, acompanhar pedidos; NÃO aparecem cadastros exclusivos do N2. Validar retorno via Fechar.
- Conta **N2 Anderson**: aparece quadro inicial com solicitações técnicas, cartões independentes, lista paginada de pedidos e telas de cadastro. Validar que não aparece um longo painel de conversas WhatsApp na tela de entrada.
- Solicitações: filtrar e ordenar, avançar páginas, abrir detalhes, Fechar detalhes no celular, criar orçamento N2, salvar status. Cuidado para não criar dados fictícios em Production.
- Catálogo: verificar 12 serviços iniciais, cadastrar/editar um custo de teste, outros serviços, veículo, endereço padrão, fornecedor, contrato; confirmar páginas 1/2 e formulário passo a passo.
- Revisão WhatsApp: abrir cartão, paginar rascunhos e confirmar que aprovar não cria pedido automaticamente.
- Android: abrir N1/N2 em viewport estreito, conferir botões visíveis e teclado, orientação/zoom, foco e rolagem acessível. Não exigir que todo detalhe extenso caiba sem qualquer rolagem.
- Permissões: usar conta N1 para tentar as APIs N2 e confirmar 403; verificar que a Piloto Baterias não mostra os dados da RMC.
- Confirme que não foram enviados WhatsApps automáticos.

## 7. Commit seletivo

**Somente depois** das validações:

```powershell
git add -- src/app/solucoes/atendimento-inteligente/rmc/atendimento/page.tsx
git add -- src/components/atendimento-inteligente/rmc-dashboard.tsx
git add -- src/components/atendimento-inteligente/request-queue.tsx
git add -- src/components/atendimento-inteligente/rmc-operations.tsx
git add -- src/components/atendimento-inteligente/rmc-review-drafts.tsx
git add -- supabase/migrations/20261115203000_ae_atendimento_inteligente_ajustes_17.sql
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_17.md

git diff --cached --name-only
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Os únicos sete arquivos listados acima devem aparecer no estágio. Desfaça o estágio de qualquer arquivo indevido com `git restore --staged -- caminho`, que não apaga alterações locais.

```powershell
git commit -m 'feat(ae): navegação N1 N2 RMC e catálogo inicial ajustes 17'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

## 8. Vercel Preview

1. Aguarde o deployment Preview da branch e confirme que usa o **Supabase de homologação**, não Production.
2. Configure variáveis de ambiente necessárias em Preview e mantenha envios automáticos desativados.
3. Repita os testes N1/N2, fluxo de retorno Fechar, pedidos, orçamentos, custos, dados e responsividade Android.
4. Não faça merge se algum teste falhar. Preservar evidências e corrigir na mesma branch.

## 9. Publicação Production

1. Revisar TODO o diff do PR `feature/ae-atendimento-inteligente-multicliente-v1` → `main`, inclusive commits mais antigos.
2. Fazer backup do Supabase Production e confirmar migration 16.
3. Aplicar e verificar a migration 17 em Production **quando a alteração estiver aprovada e a publicação agendada**.
4. Fazer merge do PR, acompanhar o deployment Production e validar as páginas reais da RMC.
5. Testar com usuários reais N1/N2 e dados controlados. Verificar que nenhum fluxo TUCXA, Piloto ou StudyAgent sofreu alteração.
6. Não habilitar Cloud API ou WhatsApp automático por este ajuste.

## 10. Rollback

- **Interface:** voltar temporariamente ao deployment anterior no Vercel ou reverter o commit por PR. Não usar `git reset --hard` em worktree compartilhada.
- **Migration:** são inserções idempotentes, sem alteração de schema. Não apague tipos de serviços após começar a utilizá-los: podem conter custos reais adicionados pelo Anderson. Qualquer remoção deve ser específica, conferida e aprovada.
- **Cópia local:** o instalador criou um backup datado de cada arquivo substituído.

## Status de validação fora do ambiente do usuário

- ZIP de fontes recebido: 101 entradas.
- Arquivos TypeScript/TSX alterados: verificação sintática realizada.
- **Ainda pendentes:** `npm run lint`, `npx tsc --noEmit`, `npm run build`, aplicação da migration e homologação funcional em Supabase/Vercel reais.
