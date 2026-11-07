# AE Atendimento Inteligente — Ajustes 08

**Escopo:** cadastro efetivo de clientes por operador N1, senha individual com mínimo de 8 caracteres, remoção do formulário público de teste durante a Fase 0 e caminho direto entre cadastro e pedido.

**Branch exclusiva:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`  
**Fonte recebida:** `ae-atendimento-inteligente-ajustes-08-fontes-20261107-070059.zip`  
**Commit-base informado no manifesto:** `7654197276d0376a802547008f024080523aac04`

## 1. O que muda

| Arquivo | Ajuste |
| --- | --- |
| `src/components/atendimento-inteligente/rmc-registration-gate.tsx` | Se o visitante não estiver autenticado, apresenta entrada da equipe, em vez do formulário de teste. Operador autorizado acessa o cadastro assistido; cliente autenticado não pode cadastrar terceiros. Autocadastro público fica reservado para ativação futura com OTP. |
| `src/components/atendimento-inteligente/rmc-login-form.tsx` | Reconhece o destino `registration` e mantém o mesmo login para N1, N2 e clientes, distinguindo papéis no servidor. |
| `src/components/atendimento-inteligente/customer-provisioner.tsx` | Cadastro real pelo N1, validação de senha individual, mensagem de sucesso e link para abrir o pedido do cliente recém-criado. |
| `src/app/api/atendimento-inteligente/customers/route.ts` | Ajusta a validação da senha para **mínimo 8 / máximo 72**, exigindo pelo menos três classes de caracteres. Mantém autorização por empresa e portal do cliente inicialmente bloqueado. |
| `src/components/atendimento-inteligente/request-form.tsx` | Reconhece o parâmetro `cliente` e pré-seleciona o cadastro recém-criado, apenas quando pertencer à lista autorizada retornada pela API. |
| `src/components/atendimento-inteligente/rmc-public-registration.tsx` | Elimina mensagens de “modo de teste” e harmoniza mínimo de senha. Esse fluxo só aparece quando o autocadastro público tiver sido habilitado separadamente. |

**Não muda:** migrations SQL, banco de dados, WhatsApp Business, Cloud API, orçamentos N2 e módulos TUCXA/StudyAgent. O código existente já inclui categoria de serviço, perguntas específicas, múltiplos serviços, fotos/vídeos opcionais, CEP, endereço salvo, filtros de status e regras de orçamento do proprietário; estes recursos devem ser testados para regressão.

**Segurança:** o N1 cadastra usando a própria sessão autorizada; nunca se autentica como cliente. A conta criada é verdadeira, mas `portal_enabled=false`, `phone_verified_at=NULL` e `must_change_password=true`. O operador não pode liberar o portal por esta tela. A confirmação do telefone e a liberação individual serão tratadas em etapa futura. Uma senha de 8 caracteres só funciona se a política global de senhas do Supabase permitir; não reduza a política global sem avaliar o impacto nas demais soluções.

## 2. Preparação do Windows / Git

Abra o **PowerShell**:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-08-IMPLEMENTACAO.zip'

cd $repo
$actual = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Git indisponivel nesta pasta.' }
if ($actual -cne $branch) { throw "Branch incorreta: $actual" }

git status -sb
git worktree list
git fetch origin --prune
```

**Não** execute `git reset --hard`, `git checkout main`, `git clean -fd` ou merge. Se houver alterações locais não relacionadas, pare e faça uma cópia/commit isolado antes de extrair.

## 3. Backup e instalação

Salve o ZIP fornecido em `C:\Users\lacos\Documents\zips` e execute:

```powershell
$backup = "C:\Users\lacos\Documents\zips\backup-ae-ai-08-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$paths = @(
  'src\components\atendimento-inteligente\rmc-registration-gate.tsx',
  'src\components\atendimento-inteligente\rmc-login-form.tsx',
  'src\components\atendimento-inteligente\customer-provisioner.tsx',
  'src\components\atendimento-inteligente\request-form.tsx',
  'src\components\atendimento-inteligente\rmc-public-registration.tsx',
  'src\app\api\atendimento-inteligente\customers\route.ts'
)
foreach ($p in $paths) {
  $source = Join-Path $repo $p
  if (!(Test-Path -LiteralPath $source)) { throw "Arquivo original ausente: $source" }
  $dest = Join-Path $backup $p
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Copy-Item -LiteralPath $source -Destination $dest -Force
}

if (!(Test-Path -LiteralPath $zip)) { throw "ZIP nao encontrado: $zip" }
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --stat
git diff --check
```

O ZIP preserva os caminhos relativos. Deve alterar apenas os seis fontes acima e adicionar este guia.

## 4. Variáveis de ambiente e banco

No `.env.local` do **worktree** (não envie este arquivo):

```dotenv
AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_CUSTOMER_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
AE_AI_SELF_REGISTRATION_ENABLED=false
NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false
```

Mantenha as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente de **homologação**, sem exposição da chave privada. Execute:

```powershell
git check-ignore .env.local
```

`git check-ignore` deve listar `.env.local`. Não há migration nova. **Confirme que as migrations V1, 02, 03 e 04 já foram aplicadas em homologação.**

### Verificar as permissões N1 e N2

No SQL Editor do Supabase do ambiente usado no teste:

```sql
select o.slug, m.role, u.email, u.phone
from public.ae_ai_memberships m
join public.ae_ai_organizations o on o.id=m.organization_id
join auth.users u on u.id=m.user_id
where o.slug='reparos-rmc'
order by m.role, u.email;
```

N1 deve possuir vínculo `operator` para RMC (ou ser administrador da plataforma). Anderson/N2 deve possuir vínculo `owner` para poder criar e alterar orçamentos. Se não houver vínculo, valide o usuário correto e use um cadastro administrativo autorizado; **não conceda `owner` ao N1**.

Exemplo de vínculo (substitua o e-mail pela conta do operador efetivamente criada, em ambiente de homologação):

```sql
insert into public.ae_ai_memberships(organization_id,user_id,role)
select o.id, u.id, 'operator'
from public.ae_ai_organizations o
join auth.users u on lower(u.email)=lower('EMAIL_REAL_DO_N1')
where o.slug='reparos-rmc'
on conflict(organization_id,user_id) do nothing;
```

Para o N2, após validar sua identidade e concordância, use `owner` com a mesma estrutura, substituindo o e-mail e o papel. Revise os vínculos antes de autorizar. Evite inserir usuários não verificados.

## 5. Validações técnicas — obrigatórias

O projeto declara Node 24.x. Execute:

```powershell
cd $repo
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Se o Next.js falhar na coleta de dados por ausência de `NEXT_PUBLIC_SUPABASE_URL`, configure o `.env.local` neste worktree antes de tentar novamente. Não use credenciais de produção em Preview por conveniência.

### Checklist funcional local / Preview

- [ ] **Anon:** abrir `/solucoes/atendimento-inteligente/rmc/cadastro`; deve pedir login de equipe e **não** mostrar o modo de teste antigo.
- [ ] **N1 autorizado:** entrar pelo login da RMC, ser direcionado ao cadastro assistido e ver nome e “Sair” no cabeçalho.
- [ ] **Senha:** aceitar 8 caracteres fortes, rejeitar `12345678`, senhas fracas, senhas diferentes e duplicidade de celular; conferir se a política Supabase também permite a senha criada.
- [ ] **Persistência:** ao cadastrar cliente de teste autorizado, retornar sucesso; confirmar no Supabase Auth e em `ae_ai_customers`/`ae_ai_contacts`.
- [ ] **Portal bloqueado:** checar que `portal_enabled=false`, `phone_verified_at` nulo e `must_change_password=true`; testar que o cliente não acessa o portal.
- [ ] **Novo pedido:** clicar em “Registrar pedido deste cliente”; a página `/rmc/solicitar?cliente=...` deve trazer o cliente selecionado (sem usar sessão do cliente).
- [ ] **Serviços:** preencher categoria, perguntas específicas e descrição; adicionar um segundo serviço.
- [ ] **Arquivos:** anexar fotos/vídeo opcional; verificar limites e armazenamento privado.
- [ ] **Endereços:** buscar CEP, preencher número e complementar; num segundo pedido, selecionar endereço já cadastrado.
- [ ] **N2:** entrar como Anderson pelo mesmo login; verificar fila, orçamentos e restrição de criação de orçamento ao `owner`.
- [ ] **Isolamento:** usuário RMC não visualiza dados da Piloto; cliente não cadastra outro cliente nem acessa pedidos de terceiros.
- [ ] **Mobile:** testar login, cabeçalho, formulário e fila de status no navegador do celular.
- [ ] **Segurança:** confirmar que nenhuma mensagem é disparada pela Cloud API, nem há cadastro público automático.
- [ ] **Regressão:** conferir rotas essenciais do TUCXA, StudyAgent e demais soluções AE.

Consulta SQL para conferir apenas o cadastro de teste:

```sql
select o.slug, c.id, c.full_name, c.portal_enabled,
       c.phone_verified_at, c.must_change_password, c.created_at
from public.ae_ai_customers c
join public.ae_ai_organizations o on o.id = c.organization_id
where o.slug='reparos-rmc'
order by c.created_at desc
limit 10;
```

Não use dados pessoais reais antes de validar as permissões e o propósito de tratamento; nunca envie senhas ou a chave `service_role` no chat, GitHub ou ZIP.

## 6. Commit e push na branch correta

**Só faça commit após as verificações passarem.** O ZIP gerador de fontes não executa Git automaticamente. Execute:

```powershell
cd $repo
if ((git branch --show-current).Trim() -cne $branch) { throw 'Branch incorreta.' }

git add -- src/components/atendimento-inteligente/rmc-registration-gate.tsx
git add -- src/components/atendimento-inteligente/rmc-login-form.tsx
git add -- src/components/atendimento-inteligente/customer-provisioner.tsx
git add -- src/components/atendimento-inteligente/request-form.tsx
git add -- src/components/atendimento-inteligente/rmc-public-registration.tsx
git add -- src/app/api/atendimento-inteligente/customers/route.ts
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_08.md

git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
```

Confira os arquivos staged (somente os sete acima) e então:

```powershell
git commit -m "feat(ae): cadastro N1 efetivo e encaminhamento de pedidos ajustes 08"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

## 7. Preview → Produção (somente após homologação)

1. Abra o deployment **Preview** criado para `feature/ae-atendimento-inteligente-multicliente-v1` no Vercel. Verifique as cinco flags `false`, e que o ambiente é de **homologação**.
2. Execute o checklist no Preview, incluindo cadastro de teste, acesso negado ao cliente, isolamento RMC/Piloto e orçamento N2.
3. **Antes de integrar na `main`, revise o diff integral `origin/main...feature/ae-atendimento-inteligente-multicliente-v1`.** A branch pode conter outras mudanças ainda não publicadas.
4. No Vercel Production, confira as cinco flags `false`, URLs e credenciais corretas; confirme existência das quatro migrations anteriores no Supabase Production. Não execute novas migrations neste ajuste.
5. Faça um Pull Request da branch para `main`; revise e, após aprovação, faça o merge. Acompanhe o deployment Production.
6. Repita o cadastro assistido com **dados de teste** e os testes essenciais no domínio oficial. Só então comece os atendimentos reais autorizados.
7. O WhatsApp Business do Anderson permanece manual nesta fase. Não ative Cloud API, envios ou autocadastro sem projeto e testes específicos.

### Rollback

Se ainda não houve push, restaure os arquivos do backup com os mesmos caminhos e execute as validações. Se já publicou o commit, use `git revert <SHA_DO_COMMIT>` na branch/PR e redeploy. Se já fez merge, aplique o rollback de deployment Vercel para resposta imediata e faça revert do commit em `main` para manter o Git sincronizado. **Não há migration nova a reverter.** Cadastros de teste feitos no Supabase exigem exclusão controlada, nunca remoção indiscriminada de usuários reais.

## 8. Limitações de validação desta entrega

O pacote foi conferido estruturalmente e os arquivos TypeScript/TSX alterados passaram na análise sintática do compilador. **Não foram executados ESLint, build Next.js completo, Supabase Auth real, SQL real ou Vercel Preview/Production neste ambiente.** A publicação depende de todos os testes acima.
