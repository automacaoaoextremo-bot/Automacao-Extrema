# Reparos RMC — cadastro público sem N1/N2 (correção 2026-11-19)

## Causa diagnosticada

A página `/solucoes/atendimento-inteligente/rmc/cadastro` rendia `RmcRegistrationGate`. Para usuários sem vínculo de operador, o componente exibia exclusivamente uma exigência de login N1 e **nunca renderizava** o formulário `RmcPublicRegistration`. Além disso, `self-register/route.ts` exigia uma flag de cadastro desligada e o formulário era restrito à verificação SMS. A implementação anterior tratou um bloqueio de portal/login, mas não a rota pública de cadastro.

## Comportamento desta correção

- Qualquer visitante pode abrir a tela de cadastro, sem convite ou aprovação N1/N2.
- E-mail informado: conta criada com e-mail/senha, seguida de confirmação do e-mail do Supabase; após entrar, o vínculo RMC é criado automaticamente.
- Sem e-mail: conta criada por telefone/senha com verificação SMS, **desde que o provedor Phone/SMS esteja configurado** no Supabase.
- Conta Auth já existente e confirmada: pode concluir cadastro na própria tela, sem perfil administrativo.
- Cliente antigo com `auth_user_id` já associado e `portal_enabled=false`: pode reativar o portal por sua própria conta Auth verificada, exceto se houver suspensão administrativa (`portal_suspended_at`). A obrigação de troca de senha, quando presente, é preservada.
- Cliente pode abrir pedido quando o Auth e o portal estiverem ativos e não houver troca obrigatória de senha. Não exige lista de pilotos.
- Usuário N1/N2 mantém o formulário de cadastro *assistido* e as permissões anteriores.
- **Isolamento obrigatório:** uma conta não pode assumir histórico de um WhatsApp já cadastrado só por digitar o número. Quando houver contato anterior e o número **não** estiver confirmado no Auth, a API exige comprovação de titularidade antes de associar o histórico. Isso não é aprovação arbitrária de novos clientes, é proteção contra apropriação de dados.
- Cadastro disponível para a empresa `reparos-rmc`. Não altera dados de outras empresas.

## Arquivos modificados

1. `src/components/atendimento-inteligente/rmc-registration-gate.tsx`
2. `src/components/atendimento-inteligente/rmc-public-registration.tsx`
3. `src/app/api/atendimento-inteligente/customers/self-register/route.ts`
4. `src/components/atendimento-inteligente/rmc-login-form.tsx`
5. `src/lib/atendimento-inteligente/customer-auth.ts`
6. `src/app/solucoes/atendimento-inteligente/rmc/cadastro/page.tsx`
7. `supabase/migrations/20261119233000_ae_atendimento_inteligente_cadastro_publico_rmc.sql` (NOVO)

### Pré-requisito especial

Este pacote foi preparado considerando instalados os quatro arquivos da correção anterior de acesso RMC, incluindo `actor/route.ts` e `requests/route.ts` que usam `customerCanSubmitRequest`. O instalador compara os hashes e PARA se encontrar outra versão. Não force alterações no Git.

## Sequência segura de instalação

1. Salvar ZIP em `C:\Users\lacos\Documents\zips` e PS1 em `C:\Users\lacos\Documents\scripts`.
2. No PowerShell, confirmar a branch, o worktree e o estado atual do Git.
3. Rodar o instalador com `-DryRun`.
4. Rodar sem `-DryRun`; um backup dos arquivos anteriores será criado.
5. **Antes de testar a nova API**, executar a migration no Supabase **de homologação**, somente após backup. Ela adiciona a coluna `portal_suspended_at`. Não atualiza automaticamente clientes, nem modifica Auth.
6. Usar Node 24.x: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
7. Testar a página `/solucoes/atendimento-inteligente/rmc/cadastro` localmente e no Preview.
8. Configuração Supabase Auth: permitir cadastro de usuários; configurar confirmação de e-mail e SMTP, ou provedor SMS para cadastro por telefone. Conferir os URLs permitidos de redirecionamento do ambiente Preview. A implementação **não envia SMS via WhatsApp** por conta própria.
9. A flag antiga `NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED` e a flag de servidor `AE_AI_SELF_REGISTRATION_ENABLED` deixam de controlar a inscrição da RMC. Os pilotos `AE_AI_RMC_CUSTOMER_PILOT_USER_IDS` deixam de ser usados neste fluxo. Não apagar flags de outros módulos sem mapear sua utilização.
10. Aprovar no Preview e só então fazer PR para `main`, com revisão de todos os commits pendentes da branch.

## PowerShell

```powershell
$Repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$Scripts = 'C:\Users\lacos\Documents\scripts'
$Zips = 'C:\Users\lacos\Documents\zips'
cd $Repo
git worktree list
git branch --show-current
git status -sb

powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File "$Scripts\Instalar-AE-RMC-Cadastro-Publico-20261119.ps1" `
 -RepoRoot "$Repo" `
 -ZipPath "$Zips\AE-RMC-Cadastro-Publico-Correcao-20261119.zip" `
 -BackupRoot "$Zips" -DryRun

# Somente se a simulacao nao indicar conflito:
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File "$Scripts\Instalar-AE-RMC-Cadastro-Publico-20261119.ps1" `
 -RepoRoot "$Repo" `
 -ZipPath "$Zips\AE-RMC-Cadastro-Publico-Correcao-20261119.zip" `
 -BackupRoot "$Zips"

npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

## Homologação obrigatória

- Sem login: cadastro renderiza sem pedir N1/N2; fazer inscrição com e-mail novo, conferir confirmação, login e pedido.
- Sem login: cadastro com celular novo somente se SMS configurado.
- Login de cliente antigo com e-mail confirmado, cadastro pendente e sem suspensão: conclui o vínculo sem N1, respeitando troca de senha.
- Conta marcada com `portal_suspended_at`: permanece bloqueada (teste com conta de homologação dedicada).
- Número de outro cliente/contato existente sem verificação: não dá acesso aos pedidos ou endereços desse cliente.
- A pessoa cadastrada vê apenas seus próprios pedidos e endereços.
- N1 mantém cadastro assistido; N2 mantém operações; demais empresas não são afetadas.
- Criar uma solicitação com foto de teste, conferir protocolo e visibilidade N2, sem envio automático real.
- Validar o comportamento em celular e desktop, inclusive após refresh e logout.

## Publicação

```powershell
cd $Repo
git status -sb
git diff --check
git diff --cached --name-only
# Confirmar staging sem arquivos de outras tarefas.
git add -- 'src/components/atendimento-inteligente/rmc-registration-gate.tsx'
git add -- 'src/components/atendimento-inteligente/rmc-public-registration.tsx'
git add -- 'src/app/api/atendimento-inteligente/customers/self-register/route.ts'
git add -- 'src/components/atendimento-inteligente/rmc-login-form.tsx'
git add -- 'src/lib/atendimento-inteligente/customer-auth.ts'
git add -- 'src/app/solucoes/atendimento-inteligente/rmc/cadastro/page.tsx'
git add -- 'supabase/migrations/20261119233000_ae_atendimento_inteligente_cadastro_publico_rmc.sql'
git add -- 'docs/ae-atendimento-inteligente/CADASTRO_PUBLICO_RMC_20261119.md'
git diff --cached --check
git diff --cached --name-only
git commit -m 'fix(ae): libera cadastro publico RMC com verificacao de identidade'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Após o Preview homologado, backup do banco de produção e execução da migration, abrir PR da branch para `main`. Confirmar deploy Vercel e testar no ambiente real. Como a migration apenas adiciona uma coluna, não executar `DROP COLUMN` automaticamente em caso de reversão.

## Segurança, limites e rollback

- Não cadastrar senhas em SQL e não enviar `.env` para o Git.
- A autenticação depende dos provedores Supabase Auth; esta implementação não configura provedor de e-mail/SMS.
- Se o número de WhatsApp já possui histórico, a identidade por telefone precisa ser comprovada para vinculação; não vincular dados de terceiros por número autodeclarado.
- Suspensão administrativa deve preencher `portal_suspended_at` e desabilitar `portal_enabled`, por processo autorizado. O SQL antigo que somente desmarca `portal_enabled` não representa suspensão definitiva.
- Para desfazer a interface, reverter o commit/realizar rollback de deploy; a coluna SQL aditiva pode permanecer.

## Estado de verificação

Seis arquivos TypeScript/TSX verificados sintaticamente via TypeScript 5; instalação do pacote e build Next.js completo ainda não realizados no ambiente do cliente. Node local disponível na preparação: 22.x, enquanto o projeto requer 24.x.
