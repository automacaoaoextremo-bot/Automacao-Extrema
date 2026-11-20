# AE Atendimento Inteligente — Ajustes 06

**Solução:** Reparos RMC / arquitetura multiempresa AE  
**Branch obrigatória:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`  
**Data:** 06/11/2026

## 1. Escopo desta entrega

O pacote é um **patch de instalação**, não um ZIP de coleta. Inclui os arquivos completos abaixo, mantendo o restante do projeto inalterado:

- `src/components/atendimento-inteligente/rmc-login-form.tsx`: remove “Acesso único”, diminui espaços e elimina o aviso inferior, preservando autenticação por telefone/e-mail e separação de permissões.
- `src/components/atendimento-inteligente/rmc-public-registration.tsx`: formulário de primeiro acesso inspirado na referência do StudyAgent, com nome, celular obrigatório, e-mail opcional e senha individual. O cadastro público permanece desativado até a configuração e homologação de SMS/OTP.
- `src/components/atendimento-inteligente/user-menu.tsx`: atualiza a identificação do usuário e o botão **Sair** também em mudanças de sessão sem recarregar completamente a página.
- `src/app/solucoes/atendimento-inteligente/rmc/entrar/page.tsx`: reduz espaço superior da página mobile.
- `src/app/solucoes/atendimento-inteligente/rmc/cadastro/page.tsx`: reduz espaço superior da página mobile.
- `src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx`: reduz espaço superior e preserva login na própria rota.
- `docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_06.md`: este roteiro.

**Sem nova migration SQL.** Não são modificados bancos, regras de preço, integração Meta Cloud API, TUCXA ou StudyAgent. O formulário de serviços existente já contempla categorias, perguntas específicas, anexos opcionais, múltiplos serviços, CEP e endereços reutilizáveis. O painel atual já contempla filtros e lista/detalhes no celular.

## 2. Decisões de segurança da Fase 0

Na Fase 0 o N1 continuará cadastrando clientes por sua própria conta autorizada. A tela pública de cadastro agora mostra os campos solicitados, **mas o envio fica bloqueado** enquanto o autocadastro estiver desligado. Evita-se criar contas apenas por nome/telefone sem comprovar a posse do número.

Mantenha os controles assim nos ambientes local, Preview e Production:

```dotenv
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_CUSTOMER_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
AE_AI_SELF_REGISTRATION_ENABLED=false
NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false
```

Quando houver autorização para habilitar o autocadastro, será necessário configurar e validar o provedor SMS do Supabase Auth, verificar o fluxo de OTP, fazer testes contra acessos cruzados e **ativar conscientemente ambas as flags de cadastro**. Apenas exibir o formulário não cria contas nem garante acesso ao portal. A ativação do autoatendimento de pedidos é uma decisão separada.

Não copie senhas, tokens ou `.env.local` para o ZIP/GitHub. Para cada cliente use credencial individual, não senha compartilhada.

## 3. Instalar no worktree Windows

**3.1 — Verificar branch e alterações antes de extrair**

```powershell
$repo   = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip    = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-06-IMPLEMENTACAO.zip'

if (-not (Test-Path -LiteralPath $repo)) { throw "Worktree inexistente: $repo" }
if (-not (Test-Path -LiteralPath $zip)) { throw "ZIP nao encontrado: $zip" }
if ((git -C $repo branch --show-current).Trim() -ne $branch) {
    throw 'BRANCH INCORRETA - nao extrair.'
}
git -C $repo status -sb
git -C $repo worktree list
git -C $repo fetch origin --prune
```

Se algum dos seis arquivos estiver editado localmente, revise/preserve as modificações antes da extração. Não use `git reset --hard` nem altere as outras worktrees.

**3.2 — Backup dos arquivos que serão sobrescritos**

```powershell
$backup = 'C:\Users\lacos\Documents\zips\backup-ae-ai06-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$files = @(
  'src\components\atendimento-inteligente\rmc-login-form.tsx',
  'src\components\atendimento-inteligente\rmc-public-registration.tsx',
  'src\components\atendimento-inteligente\user-menu.tsx',
  'src\app\solucoes\atendimento-inteligente\rmc\entrar\page.tsx',
  'src\app\solucoes\atendimento-inteligente\rmc\cadastro\page.tsx',
  'src\app\solucoes\atendimento-inteligente\rmc\solicitar\page.tsx'
)
foreach ($file in $files) {
  $source = Join-Path $repo $file
  if (Test-Path -LiteralPath $source) {
    $target = Join-Path $backup $file
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
  }
}
Write-Host "Backup criado em: $backup"
```

**3.3 — Aplicar a implementação**

```powershell
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --check
git diff --stat
```

O ZIP preserva a estrutura de pastas do Next.js. Não extraia dentro da pasta `src`.

## 4. Validações locais obrigatórias

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

**Requisito:** Node.js 24.x e `.env.local` válido **nesta worktree** (com o Supabase de homologação). Se algum comando falhar, **interrompa** antes do commit ou deploy. O pacote passou na verificação de sintaxe TypeScript/TSX, mas não foi validado com `npm run lint`, `tsc --noEmit` nem `next build` completo nesta execução.

## 5. Homologação funcional

Use uma conta de N1 autorizada e um cliente de teste, sem divulgar a solução para clientes reais neste momento.

- [ ] Em 360–390 px de largura, abrir `/solucoes/atendimento-inteligente/rmc/entrar`; confirmar que não aparece “Acesso único”.
- [ ] Verificar redução de espaçamentos; **sem prometer ausência total de rolagem em todos os aparelhos**, especialmente com teclado virtual.
- [ ] Confirmar que não aparece o aviso inferior antigo sobre liberação da conta.
- [ ] Testar alternância Mostrar/Ocultar senha, login por e-mail e (para contas configuradas) celular com DDD.
- [ ] Confirmar botão “Esqueci minha senha” e acesso à página `/esqueci-senha`.
- [ ] Em `/cadastro` sem autenticação, verificar campos nome, WhatsApp obrigatório, e-mail opcional e senha; com a flag desligada, o envio deve permanecer bloqueado e apresentar aviso conciso.
- [ ] Em `/cadastro` com N1 autorizado, confirmar que o cadastro assistido continua disponível.
- [ ] Após login, confirmar nome do usuário e opção “Sair” no cabeçalho, inclusive entrando pela rota `/solicitar`.
- [ ] Sair, conferir a retirada do nome e verificar que um cliente não acessa o painel N2.
- [ ] Registrar pedido autorizado: tipo de serviço, descrição detalhada, eventual outro serviço, foto/vídeo opcional e endereço por CEP.
- [ ] Confirmar endereços reutilizáveis em pedidos seguintes e isolamento de informações de outros clientes/empresas.
- [ ] No painel N2, confirmar status, filtros, orçamento, anexos privados e navegação no celular.
- [ ] Confirmar que não houve envio automático por WhatsApp e que TUCXA/StudyAgent permanecem inalterados.

Se for decidido liberar autocadastro em outro momento, fazer **homologação separada** de OTP SMS, rate limits, fluxos de recuperação, autorização do portal e exclusão de acesso cruzado. Não basta alterar o botão.

## 6. Git: commit/push isolado na branch correta

Só depois de `lint`, TypeScript, build e testes funcionais aprovados:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
if ((git branch --show-current).Trim() -ne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch incorreta' }
git add -- src/components/atendimento-inteligente/rmc-login-form.tsx
git add -- src/components/atendimento-inteligente/rmc-public-registration.tsx
git add -- src/components/atendimento-inteligente/user-menu.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/entrar/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/cadastro/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_06.md
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
```

Revise a lista, garantindo que não há alteração do TUCXA, StudyAgent ou `.env.local`. Então:

```powershell
git commit -m "feat(ae): compacta login e prepara cadastro RMC ajustes 06"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

## 7. Vercel Preview → Production

1. Abra o **Preview** gerado pelo push da branch. Não teste em produção primeiro.
2. Confirme que as variáveis de ambiente do Preview apontam para o Supabase de **homologação**. Variáveis `NEXT_PUBLIC_*` são incorporadas ao build; redeploy se alteradas.
3. Confirme que `AE_AI_SELF_REGISTRATION_ENABLED`, `NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED`, `AE_AI_SEND_LIVE` e `AE_AI_CUSTOMER_REQUESTS_ENABLED` estão `false`.
4. Repita os testes mobile em dispositivo real e os testes de login/permite-acesso. Teste especialmente a alternância da sessão enquanto o cabeçalho permanece montado.
5. Revise o Pull Request da branch para `main`, verifique que não inclui arquivos/migrations de outras soluções, e obtenha aprovação.
6. Confirme as mesmas flags em Vercel **Production**, realize o merge e aguarde o deployment final ficar `Ready`.
7. Repita o teste de abertura, login, cadastro inativo, nome/Sair e painel em `https://www.automacaoextrema.com/solucoes/atendimento-inteligente/rmc/entrar`.
8. Caso haja falha, utilize rollback do deployment no painel Vercel ou revert do commit via PR; **não** resete todas as worktrees nem altere o Supabase, pois este pacote não exige migration.

**Não há SQL novo nesta versão.** Não mexer no número do WhatsApp Business do Anderson nem liberar Cloud API/automação durante a Fase 0.
