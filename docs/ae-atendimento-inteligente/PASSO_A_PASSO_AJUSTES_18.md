# AE — Atendimento Inteligente | Ajustes 18

**Base recebida:** `ae-atendimento-inteligente-ajustes-18-fontes-20261117-212732.zip`, coleta de **17/11/2026, 21:27:32**.  
**Branch informada pelo manifesto:** `feature/ae-atendimento-inteligente-multicliente-v1`.  
**HEAD na coleta:** `ec943806e48374bcdbeaf654de8d1cc91656b305`.  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`.

> O pacote recebido era uma coleta de fontes. Este arquivo documenta o **pacote de implementação dos Ajustes 18** produzido a partir dessas fontes. Não confundir os dois ZIPs.

## A. O que foi implementado

1. **Tela inicial N1/N2:** removido o painel de prévia N2 marcado para exclusão; mantidos os cards de navegação. Alterado o texto da apresentação para “Acompanhe as solicitações, prepare orçamentos e organize a operação da Reparos RMC.” Aplicadas cores inspiradas no logotipo RMC (laranja, carvão e branco), no lugar do verde TUCXA.
2. **Cabeçalho da área operacional:** o botão “Solicitar” deixou de ser exibido no cabeçalho do operador. Os cards N1 para registro permanecem disponíveis, assim como o menu de usuário/Sair.
3. **Solicitações:** retirada a barra de título separada; botão **Fechar** aparece no topo do quadro “Pedidos e atendimentos”, onde ficava “Atualizar”. Alterações nos filtros de status/ordenação são aplicadas imediatamente aos dados carregados; não há botão redundante “Atualizar” nessa área RMC. Removido o botão móvel “Detalhes”, substituído pelo toque em uma solicitação; novo botão **Listar Pedidos** com subtítulo “TOQUE PARA ABRIR”. Lista de cinco pedidos por página, com “Anterior/Próxima”; detalhes somente após selecionar um pedido. Em ambiente multiempresa não-RMC, os controles anteriores permanecem.
4. **Serviços e Custos:** título e **Fechar** no topo do segundo quadro. No editor, o mesmo botão fecha o editor, retornando à listagem, sem botões “Fechar” duplicados. Mantidos **Anterior/Próxima/Salvar** nas etapas. Botões **Editar/Excluir** compactos e botão **Inativar/Ativar** para tipos de serviço, com confirmação ao inativar e indicação “Inativo”. Cadastros continuam paginados.
5. **Backend:** a rota RMC `GET` inclui `is_active`, e a nova operação `PATCH` permite atualizar **somente** serviços do catálogo vinculados à organização RMC. A autenticação e autorização N2/owner permanecem obrigatórias.
6. **Supabase:** nova migration aditiva `20261117220000_ae_atendimento_inteligente_ajustes_18.sql` adiciona `is_active boolean not null default true` e índice. Não remove nem altera dados históricos.

**Limite de escopo:** a inativação nesta versão controla o estado do **catálogo operacional N2**. O formulário de abertura de pedidos ainda utiliza `RMC_CATEGORIES` de `src/lib/atendimento-inteligente/intake.ts`, uma lista estática. Portanto, **inativar um serviço ainda não o remove das opções do formulário de solicitação do cliente/N1**. Isso deve ser tratado como requisito e integração próprios, caso essa seja a regra desejada. Nenhuma função de envio Meta/WhatsApp foi modificada.

## B. O que foi verificado e o que falta validar

- ZIP recebido: estrutura e componentes examinados.
- Sintaxe TS/TSX: os seis arquivos alterados passaram no parser TypeScript.
- **Não executados nesta infraestrutura:** build Next.js completo, ESLint, `tsc --noEmit` com todas as dependências, SQL no Supabase, testes N1/N2 com sessões reais, Vercel Preview e deploy Production. A infraestrutura local disponível usa Node 22; o projeto exige Node 24. `npm ci --offline` não concluiu por ausência de dependências no cache.
- Estes testes **são obrigatórios** antes do merge para `main`.

## 1. Preparar pastas e confirmar a branch

No PowerShell do Windows:

```powershell
$Repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$Scripts = 'C:\Users\lacos\Documents\scripts'
$Zips = 'C:\Users\lacos\Documents\zips'
New-Item -ItemType Directory -Force -Path $Scripts,$Zips | Out-Null
cd $Repo

git worktree list
git branch --show-current
git status -sb
git rev-parse HEAD
git fetch origin --prune
```

**Esperado:** `feature/ae-atendimento-inteligente-multicliente-v1`. Se for outra branch, pare e use o worktree correto; não faça checkout forçado. A coleta registrava **20 entradas no `git status --porcelain`**, inclusive uma alteração local em `src/app/api/atendimento-inteligente/my/requests/route.ts`. Não descarte esse trabalho.

**Nunca execute neste procedimento:** `git reset --hard`, `git clean -fd`, `git add -A`, `git push --force`.

## 2. Instalação com checagem de base e backup

Salve:

- ZIP: `C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-18-IMPLEMENTACAO.zip`
- Instalador: `C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-18.ps1`

**Simular** sem copiar arquivos:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-18.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Ajustes-18-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips" `
  -DryRun
```

Se o script confirmar que os hashes dos arquivos locais coincidem com os da base coletada, **instalar**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-18.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Ajustes-18-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips"
```

O instalador verifica a branch, checa o hash SHA256 de cada versão anterior, faz **backup de cada arquivo substituído** antes de copiar e valida os hashes após a instalação. Se a versão local mudou, o instalador **interrompe sem copiar**. Examine os diffs e reconcilie as mudanças antes de qualquer sobreposição. Existe uma opção `-AllowModifiedFiles`, mas **não é recomendada** sem revisão manual; ela faz backup e substitui a versão local.

Arquivos instalados:

```text
src/components/atendimento-inteligente/rmc-dashboard.tsx
src/components/atendimento-inteligente/request-queue.tsx
src/components/atendimento-inteligente/rmc-operations.tsx
src/components/atendimento-inteligente/operator-guard.tsx
src/app/api/atendimento-inteligente/rmc/operations/route.ts
src/app/solucoes/atendimento-inteligente/rmc/atendimento/page.tsx
supabase/migrations/20261117220000_ae_atendimento_inteligente_ajustes_18.sql
docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_18.md
```

## 3. Conferir as alterações no Git

```powershell
cd $Repo
git status -sb
git diff --check
git diff --stat
git diff -- 'src/components/atendimento-inteligente/rmc-dashboard.tsx'
git diff -- 'src/components/atendimento-inteligente/request-queue.tsx'
git diff -- 'src/components/atendimento-inteligente/rmc-operations.tsx'
git diff -- 'src/app/api/atendimento-inteligente/rmc/operations/route.ts'
```

Confirme que a alteração antiga em `my/requests/route.ts` não foi sobrescrita. Confirme que nenhum `.env`, chave, telefone pessoal ou dump privado entrou no pacote.

## 4. Testar a compilação local

```powershell
node --version     # DEVE ser v24.x
npm --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Se algum comando falhar, não prossiga com o merge. Verifique se o erro veio do módulo RMC ou de outra área do repositório e corrija sem apagar arquivos. O arquivo `vercel.json` usa Yarn no Vercel; portanto, valide também o build do próprio Vercel Preview.

Para abrir no navegador local:

```powershell
npm run dev
```

`http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`

## 5. Aplicar migration em ambiente de homologação (Supabase Preview)

**Antes do SQL**, confirme que o SQL Editor está conectado **ao Supabase de homologação**, separado de Production. Exija que as migrations 16 e 17 já estejam aplicadas. Faça backup/snapshot de homologação quando disponível.

Execute o conteúdo integral de:

`supabase/migrations/20261117220000_ae_atendimento_inteligente_ajustes_18.sql`

Valide a coluna:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='ae_ai_rmc_catalog'
  and column_name='is_active';
```

Deve aparecer `boolean`, `NO`, com valor padrão `true`.

Confira os cadastros RMC e sua situação:

```sql
select o.slug, c.kind, c.name, c.is_active, c.updated_at
from public.ae_ai_rmc_catalog c
join public.ae_ai_organizations o on o.id=c.organization_id
where o.slug='reparos-rmc' and c.kind='service'
order by c.name;
```

**Não altere manualmente os cadastros existentes apenas para testar**: use a tela N2 de homologação com dados de teste, e valide reativação.

## 6. Homologação N1/N2 — checklist

Use credenciais **de homologação** N1, N2 e, se possível, um usuário sem vínculo com a RMC. Em celular (largura ~360–390 px) e desktop, teste:

| Caso | O que fazer | Esperado |
|---|---|---|
| H01 | Entrar como N2 | Menu em cards com laranja/cinza RMC, sem painel “Para acompanhar como N2” |
| H02 | Ler o texto do cartão de boas-vindas | “...operação da **Reparos RMC**.” |
| H03 | Conferir cabeçalho N2 | Não exibe botão “Solicitar”; nome/Sair permanece |
| H04 | Abrir Solicitações | Um quadro “Pedidos e atendimentos”; “Fechar” no canto superior direito |
| H05 | Alterar status/ordenação | Resultados carregados atualizam sem clicar “Atualizar” |
| H06 | No celular, tocar “Listar Pedidos” | Abre lista; mostra “TOQUE PARA ABRIR”; sem botão inútil “Detalhes” |
| H07 | Escolher pedido existente | Mostra detalhes, formulário de tratativa e histórico; “Voltar aos pedidos” funciona |
| H08 | Paginar | Cinco pedidos por página, sem perdas ao navegar |
| H09 | Clicar “Fechar” em Solicitações | Volta ao menu N2; não sai da conta |
| H10 | Abrir Serviços e Custos | Título correto; sem botão “Atualizar”; “Fechar” no topo |
| H11 | Editar categoria “Elétrica” | Etapas de edição; apenas um “Fechar” no alto, “Anterior/Próxima/Salvar” |
| H12 | Inativar serviço de teste | Pede confirmação, informa “Inativo” e mantém cadastro |
| H13 | Ativar o mesmo serviço | Muda para “Ativo”; dados e preços conservados |
| H14 | Testar exclusão com registro de teste | Mantém confirmação de exclusão; não confundir exclusão com inativação |
| H15 | Entrar como N1 | N1 continua podendo cadastrar, registrar e acompanhar; sem edição N2 |
| H16 | Tentar PATCH autenticado como N1 ou pessoa de outra empresa | API deve responder 403, sem alterar o registro |
| H17 | Inspecionar área de outra empresa na administração AE | Painéis e catálogo não-RMC sem alteração de comportamento |
| H18 | Verificar integração WhatsApp | Nada deve ser enviado durante a homologação |

**Teste de isolamento importante:** a rota da API de N2 deve rejeitar ações não autorizadas. Não basta ocultar botões; verifique o retorno do servidor. Tenha um pedido de teste existente para H07, porque uma base vazia não prova a navegação.

## 7. Preparar commit APENAS da implementação 18

Após todos os testes locais e de homologação passarem:

```powershell
cd $Repo

git add -- 'src/components/atendimento-inteligente/rmc-dashboard.tsx'
git add -- 'src/components/atendimento-inteligente/request-queue.tsx'
git add -- 'src/components/atendimento-inteligente/rmc-operations.tsx'
git add -- 'src/components/atendimento-inteligente/operator-guard.tsx'
git add -- 'src/app/api/atendimento-inteligente/rmc/operations/route.ts'
git add -- 'src/app/solucoes/atendimento-inteligente/rmc/atendimento/page.tsx'
git add -- 'supabase/migrations/20261117220000_ae_atendimento_inteligente_ajustes_18.sql'
git add -- 'docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_18.md'

git diff --cached --name-only
git diff --cached --check
git diff --cached --stat
```

Se houver outros arquivos previamente preparados no index, retire **apenas os não pertencentes aos Ajustes 18** com `git restore --staged -- 'caminho/do/arquivo'` (não apaga mudanças do disco). Após conferir o index:

```powershell
git commit -m "feat(ae): ajusta interface RMC e ativacao de servicos v18"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Se a branch foi atualizada remotamente, faça `git fetch origin` e reconcilie com cuidado antes do push. **Não use `--force`**.

## 8. Vercel Preview

1. Abra o deployment **Preview** do commit acima, da branch esperada.
2. Confirme a vinculação do Preview ao **Supabase de homologação** e mantenha `AE_AI_SEND_LIVE=false`; não use credenciais de produção no Preview.
3. Confira Node 24, build verde, variáveis de ambiente necessárias e logs de erros do módulo RMC.
4. Execute novamente **H01–H18** na URL Preview; registre capturas de tela de celular e desktop.
5. Faça o aceite com N1 e Anderson/N2. Uma página carregando sem pedidos não constitui homologação da tratativa.

## 9. Publicação em produção — sequência obrigatória

1. Antes de fazer merge, rode:
   ```powershell
   git fetch origin --prune
   git log --oneline origin/main..HEAD
   git diff --stat origin/main...HEAD
   ```
   Esta branch pode conter **várias evoluções anteriores**; verifique todos os commits do PR, e não apenas o Ajuste 18.
2. Faça backup/snapshot recuperável do **Supabase de produção**.
3. Aplique a mesma migration 18 em Supabase Production, somente após homologação. A migration é aditiva e segura para a versão antiga da interface; faça isso **antes** de liberar a nova API que seleciona `is_active`.
4. Valide em Production o `information_schema.columns` e a consulta de serviços (SQL acima), **sem editar dados reais**.
5. Crie o PR no GitHub com base `main` e compare `feature/ae-atendimento-inteligente-multicliente-v1`. Revise arquivos, conflitos, CI e conjunto completo de commits. Faça merge somente após aprovação.
6. No Vercel, confirme deployment **Production**, commit correspondente e domínio `https://www.automacaoextrema.com` conectado à `main`. Não presuma que cada push na feature publica produção.
7. Faça smoke test em `https://www.automacaoextrema.com/solucoes/atendimento-inteligente/rmc/entrar` com N1 e N2; teste leitura, navegação e estado do catálogo. Evite enviar WhatsApp ou editar pedidos reais como teste.
8. Monitore logs e mantenha o envio real desativado até a validação própria da integração Meta.

## 10. Reversão

- **Antes do commit:** recuperar arquivos do backup gerado pelo instalador. Preserve o log e compare hashes.
- **Depois do merge:** preferir rollback do deployment de código para uma versão anterior no Vercel, seguido de `git revert` por PR quando aplicável.
- **Banco:** a coluna `is_active` é aditiva e **não precisa ser excluída** no rollback de código. Não execute `DROP COLUMN` automaticamente: isso destruiria as situações registradas.
- Se houver falha no Preview porque a coluna não existe, aplique a migration **na base correta**; não replique variáveis de produção.

## 11. Critério de pronto

Ajustes 18 ficam prontos para publicar quando: (i) instalador conclui sem sobrescrever mudanças locais não analisadas; (ii) Node 24 + lint + typecheck + build aprovados; (iii) migration aplicada e conferida em homologação; (iv) testes H01–H18 documentados; (v) Vercel Preview validado; (vi) revisão do PR e backup da produção concluídos. **Nenhum deploy ou comando Git/Supabase remoto foi executado ao preparar este pacote.**
