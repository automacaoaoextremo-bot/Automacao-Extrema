# AE Atendimento Inteligente — Reparos RMC — Ajustes 07

**Data:** 06/11/2026  
**Branch:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Pacote:** correção de cadastro público da RMC, mantendo a Fase 0 (atendimento assistido).

## 1. Arquivos modificados

- `src/components/atendimento-inteligente/rmc-public-registration.tsx` — **substituição completa**.
- `docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_07.md` — guia novo.

**Sem migration SQL, sem novos pacotes npm e sem alteração de segredos.**

## 2. O que foi corrigido

A causa da impossibilidade de digitar era `<fieldset disabled={!enabled || busy}>`.

Agora os campos **Nome completo**, **WhatsApp**, **E-mail** e **Senha** podem ser editados mesmo com a flag `NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false`. O quadro informativo laranja indicado no documento 07 foi removido.

Durante a Fase 0, o botão apresenta **Conferir preenchimento**. Ao clicar, o sistema informa que os dados são apenas de teste e que nenhuma conta foi criada. A senha digitada é descartada do estado desse componente. **Nenhum dado é enviado ao Supabase nesse modo.**

Quando futuramente o autocadastro for ativado por decisão consciente e estiver homologado com verificação do celular, o fluxo original `signUp` + OTP continua disponível, sujeito também ao bloqueio no servidor (`AE_AI_SELF_REGISTRATION_ENABLED`). **Não ativar somente para testar a interface.**

O cabeçalho com nome/Sair, as solicitações multi-serviço, anexos opcionais, endereços por CEP, orçamento e o painel N2 não foram reescritos neste pacote; devem ser verificados nos testes de regressão, pois já constam dos fontes enviados.

## 3. Instalação no Windows — PowerShell

Primeiro, salve o ZIP de implementação em `C:\Users\lacos\Documents\zips`.

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-07-IMPLEMENTACAO.zip'

if ((git -C $repo branch --show-current).Trim() -cne $branch) { throw 'Branch incorreta; pare aqui.' }
git -C $repo status -sb
git -C $repo worktree list
if (!(Test-Path -LiteralPath $zip)) { throw 'ZIP nao encontrado' }

# Copia de seguranca do arquivo que sera substituido
$backup = 'C:\Users\lacos\Documents\zips\backup-ae-ai-07-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item -LiteralPath (Join-Path $repo 'src\components\atendimento-inteligente\rmc-public-registration.tsx') -Destination (Join-Path $backup 'rmc-public-registration.tsx')

# Instalar
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
Set-Location $repo
git status -sb
git diff --check
git diff -- src/components/atendimento-inteligente/rmc-public-registration.tsx
```

Se houver alterações locais no arquivo antes da extração, compare e preserve-as antes de sobrescrever; o comando acima cria cópia de segurança, mas não resolve conflitos automaticamente.

## 4. Variáveis de ambiente (Fase 0)

No `.env.local` da worktree e em Vercel Preview/Production, conferir:

```dotenv
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_CUSTOMER_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
AE_AI_SELF_REGISTRATION_ENABLED=false
NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false
```

Manter também as credenciais Supabase corretas para cada ambiente; **não copiar `.env.local` para o ZIP/GitHub**. A variável `NEXT_PUBLIC_...` é incorporada no build do Next.js: alterações no Vercel exigem novo deployment. A variável do servidor deve permanecer false, inclusive na produção.

## 5. Verificações locais

Usar Node.js **24.x** e as variáveis Supabase do ambiente de homologação.

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Interromper a publicação se houver qualquer erro.

**Neste ambiente de preparação:** o arquivo passou na verificação sintática TypeScript/TSX, e o pacote ZIP foi verificado. Não foi possível realizar `npm ci` e o build completo por falta de pacotes no cache offline e por estar disponível Node 22 em vez de Node 24. Portanto, não está homologado em produção.

## 6. Homologação — Preview do Vercel

Usar a URL do Preview da branch, com Supabase de homologação e flags desativadas:

1. Sem login, entrar em `/solucoes/atendimento-inteligente/rmc/cadastro` no celular.
2. Confirmar **ausência do quadro laranja** que bloqueava o formulário.
3. Digitar e modificar Nome, WhatsApp, E-mail, Senha; alternar Mostrar/Ocultar.
4. Testar campos obrigatórios e o mínimo de 12 caracteres para senha; não usar senha real nem telefone de terceiros no teste.
5. Clicar em **Conferir preenchimento**: exibir aviso de modo teste e **não criar conta, não enviar SMS nem registrar dados**. Conferir no painel Network do navegador e no Supabase de teste.
6. Confirmar que o cadastro assistido com login de operador autorizado continua utilizável.
7. Logar como operador RMC: cabeçalho com nome e Sair; painel N2 de acordo com permissões; teste com usuário não autorizado deve ser bloqueado.
8. Criar uma solicitação de teste (usando operador), incluir 2 serviços com perguntas e descrição, anexar uma foto (se desejar), cadastrar endereço via CEP e conferir no painel.
9. Testar endereço salvo no pedido seguinte, estados Solicitado / Em orçamento / Aguardando cliente / Em execução / Aguardando pagamento / Finalizado, além de Agendado, Recusado e Cancelado; testar orçamento sem envio automático.
10. Conferir isolamento entre RMC e Piloto, em desktop e mobile. Checar que rotas de outros produtos (TUCXA, StudyAgent) não foram alteradas.

**Importante:** o modo de teste não cadastra clientes. A criação real de clientes durante a Fase 0 continua sob o login de operador autorizado, não na tela pública.

## 7. Commit e push da branch

Somente após `lint`, TypeScript, build e testes locais:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
if ((git branch --show-current).Trim() -cne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch incorreta' }
git add -- src/components/atendimento-inteligente/rmc-public-registration.tsx
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_07.md
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
# Se a lista estiver correta:
git commit -m 'fix(ae): permite preencher cadastro RMC em modo teste ajustes 07'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Não usar `git add .` para evitar introduzir mudanças de outras soluções, segredos ou arquivos temporários.

## 8. Preview → Pull Request → Produção

1. Esperar o deployment **Preview** dessa branch no Vercel terminar com sucesso.
2. Executar o checklist acima no Preview. Validar ambiente Supabase e flags; não usar o número comercial da RMC para testes automáticos.
3. Verificar **todo o diff da branch contra `main`**, pois ela pode conter mais ajustes pendentes, não somente o Ajuste 07. Só aprovar o PR depois de validar o conjunto.
4. Abrir PR da branch `feature/ae-atendimento-inteligente-multicliente-v1` → `main`; revisar, aprovar e fazer merge.
5. No Vercel Production, confirmar as mesmas flags `false` antes do deploy e confirmar as credenciais Supabase de produção corretas.
6. Após deploy, testar `/rmc/cadastro`, `/rmc/entrar`, `/rmc/solicitar` e `/rmc/atendimento` com operadores autorizados. Cadastro público deve aceitar digitação para pré-visualização, mas não criar contas.
7. Manter Cloud API e WhatsApp comercial sem disparos automáticos, até uma fase própria de homologação.

### Rollback

Se for somente problema de interface, usar o rollback de deployment no Vercel ou fazer um `git revert` do commit específico e publicar novamente. **Não usar `git reset --hard` nem reverter SQL**, porque o Ajuste 07 não cria migrations. Confirmar que o rollback não desativa correções independentes já publicadas.
