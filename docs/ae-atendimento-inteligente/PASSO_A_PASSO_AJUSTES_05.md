# AE Atendimento Inteligente — Ajustes 05

**Data de preparação:** 05/11/2026  
**Branch obrigatória:** `feature/ae-atendimento-inteligente-multicliente-v1`  
**Worktree:** `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`  
**Escopo:** Reparos RMC / Fase 0 assistida. Não modifica BotConversa ou módulos do TUCXA e StudyAgent.

## 1. Resultado esperado

- `/solucoes/atendimento-inteligente/rmc/solicitar`: exibe **a própria tela de login** se não houver sessão; após login de operador autorizado, exibe o formulário existente. Elimina a tela intermediária.
- `/solucoes/atendimento-inteligente/rmc/entrar`: login compartilhado por WhatsApp/celular ou e-mail, senha visível/oculta, botão de recuperação e **somente um botão Cadastrar** abaixo de "Ainda não tem acesso?".
- `/solucoes/atendimento-inteligente/rmc/cadastro`: interface no padrão RMC; formulário de cadastro assistido para a equipe. Autocadastro futuro com código SMS, desativado nesta fase.
- `/solucoes/atendimento-inteligente/rmc/esqueci-senha` e `/redefinir-senha`: recuperação por e-mail **confirmado** no Supabase. Contas somente com celular continuam exigindo atendimento humano, até disponibilizar a recuperação por SMS.
- `rmc-landing.tsx`: textos com benefícios claros; pop-ups com botão **Fechar** no canto superior direito e ação Solicitar serviço; comunicação pública não menciona níveis internos nem o nome do operador.
- `request-form.tsx`: mantém escolhas de serviços, detalhes, fotos/vídeos opcionais, múltiplos serviços e CEP; carrega endereços vinculados ao próprio cliente quando o portal estiver habilitado. Se o envio direto estiver desativado, não apresenta um formulário que falhará ao finalizar.
- `request-queue.tsx`: mantém filtros por status e ordenação; lista paginada em grupos de 8; visualização Lista/Detalhes no mobile.
- `user-menu.tsx` não foi alterado: já apresenta nome e Sair no cabeçalho autenticado.
- **Nenhum envio automático pelo WhatsApp foi ativado.**

## 2. Segurança: critérios obrigatórios

- Um número de telefone **não é senha**. Sem verificação de posse, não autorizar acesso a pedidos.
- A Fase 0 continua com cadastro e solicitações assistidos por operador autenticado. Cada cliente provisionado tem senha individual; nenhuma senha fixa comum.
- Os dados de operadores e clientes são segregados no Supabase por empresa e por papel, com verificação das rotas da API no servidor.
- O portal de pedidos direto para clientes permanece fechado: `AE_AI_CUSTOMER_REQUESTS_ENABLED=false`.
- O autocadastro via telefone foi preparado como recurso **opt-in**, mas **desativado em dois pontos**: `NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false` (interface) e `AE_AI_SELF_REGISTRATION_ENABLED=false` (API). Não habilite antes de configurar e homologar SMS OTP e proteções de abuso/limites de cadastro.
- Contas já provisionadas pelo operador com `phone_confirm=false` podem não conseguir login com telefone até a confirmação. Não alterar esse campo diretamente no banco sem verificar identidade.
- O reset por e-mail depende de um e-mail efetivamente cadastrado/confirmado no **Supabase Auth**, não apenas do campo de contato da RMC.
- Não colocar `SUPABASE_SERVICE_ROLE_KEY`, credenciais da Meta ou dados reais no GitHub, ZIPs de suporte ou logs.

## 3. Instalação local — PowerShell

### 3.1 Confirmar a worktree

```powershell
$repo = "C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento"
$branch = "feature/ae-atendimento-inteligente-multicliente-v1"
cd $repo

git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
git rev-list --left-right --count "HEAD...origin/$branch"
```

Prossiga somente se a branch estiver correta. Verifique mudanças locais e commits remotos antes de extrair. **Não faça reset hard, checkout main, merge ou pull automático.** Guarde um backup das modificações não commitadas.

### 3.2 Extração

Salve `AE-Atendimento-Inteligente-Ajustes-05-IMPLEMENTACAO.zip` em `C:\Users\lacos\Documents\zips` e execute:

```powershell
$zip = "C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-05-IMPLEMENTACAO.zip"
$repo = "C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento"

if ((git -C $repo branch --show-current).Trim() -ne "feature/ae-atendimento-inteligente-multicliente-v1") {
  throw "Branch incorreta. Interrompendo instalacao."
}
if (-not (Test-Path $zip)) { throw "ZIP nao localizado: $zip" }

Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
git status -sb
git diff --check
git diff --stat
```

O ZIP contém apenas os arquivos alterados/novos e a documentação. Não substitui o projeto completo.

### 3.3 Ambiente

No `.env.local` da worktree, confirme as variáveis Supabase **existentes** e as flags abaixo:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_PRIVADA

AE_AI_PUBLIC_REQUESTS_ENABLED=false
AE_AI_CUSTOMER_REQUESTS_ENABLED=false
AE_AI_SEND_LIVE=false
NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false
AE_AI_SELF_REGISTRATION_ENABLED=false
```

Não copie valores de homologação para produção ou vice-versa. `NEXT_PUBLIC_` é incorporado no build do frontend. Se qualquer flag pública for alterada, será necessário redeploy.

### 3.4 Dependências e validações

Use **Node.js 24.x**, conforme `package.json`, e execute:

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento"
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

**Critério:** sem erros. Este pacote teve sua sintaxe TS/TSX verificada ao ser gerado, mas **não foi homologado com um build Next.js completo no ambiente de preparação**. Faça o build local antes do push.

## 4. Supabase — o que fazer

**Não há nova migration SQL nos Ajustes 05.** A implementação usa as tabelas e funções já adicionadas em V1, Ajustes 02, 03 e 04. Não reexecute migrations anteriores só para instalar o 05.

Para conferir a estrutura existente em **homologação**:

```sql
select table_name from information_schema.tables
where table_schema='public'
and table_name in ('ae_ai_organizations','ae_ai_customers','ae_ai_customer_addresses','ae_ai_requests','ae_ai_request_items')
order by table_name;

select slug,name,automation_enabled,public_intake_enabled
from public.ae_ai_organizations
where slug in ('reparos-rmc','piloto-automotivo');
```

As flags do atendimento automático e do envio público devem seguir desligadas enquanto estivermos na Fase 0.

## 5. Homologação funcional em localhost e Vercel Preview

Use clientes de teste consentidos, não contatos reais sem autorização. Teste também em celular Android e desktop.

1. **Anônimo em `/rmc/solicitar`:** deve ver login com WhatsApp/e-mail, senha, Mostrar, Entrar, Esqueci minha senha e Cadastrar, sem a tela intermediária antiga.
2. **Login errado:** erro genérico, sem informar se determinado telefone é cadastrado.
3. **Cliente com portal desabilitado:** não deve acessar pedidos ou registrar solicitações.
4. **Operador RMC autenticado:** `/rmc/solicitar` deve abrir o formulário de pedido assistido e manter a seleção do cliente.
5. **Cadastro:** `/rmc/cadastro` deve mostrar formulário de operador para quem for operador; para público, explicar a fase assistida, sem criar conta automaticamente.
6. **Redefinir senha:** testar primeiro com e-mail de teste confirmado em Supabase Auth e domínio listado em `Authentication > URL Configuration`; link só deve funcionar com token válido. Testar link inválido/expirado.
7. **Pop-ups:** Por que usar, Como funciona, Serviços atendidos; conferir "Fechar" no canto superior direito, tecla Esc, foco e botão Solicitar serviço.
8. **Cabeçalho:** nome do usuário autenticado e Sair; confirmar encerramento da sessão.
9. **Formulário:** um serviço, depois dois serviços; dados específicos, texto detalhado, fotos e vídeos opcionais, CEP/endereço e aceite de tratamento de dados.
10. **Endereço salvo:** em portal habilitado de teste, garantir que só endereços do próprio cliente apareçam. Em Fase 0, testar endereços já cadastrados do cliente escolhido pelo operador.
11. **Painel:** em mobile, Lista e Detalhes alternam; paginação aparece com mais de 8 pedidos. Filtro por status deve funcionar e o orçamento N2 continuar restrito.
12. **Permissões:** usuário sem vínculo RMC não deve acessar o painel; cliente A não pode ler endereços/pedidos do cliente B, inclusive alterando IDs manualmente nas URLs das APIs.
13. **Mensageria:** nenhum envio automático pelo WhatsApp ou Cloud API durante Preview e Fase 0. A abertura de link `wa.me` não comprova entrega.
14. **Regressão:** validar login e páginas principais do TUCXA e StudyAgent. Os fontes dessas soluções não foram modificados.

**Recursos preparados, não ativados:** autocadastro SMS OTP (precisa provedor e verificação) e envio de pedidos diretamente pelo portal. Não validar em produção com clientes reais antes da ativação controlada.

## 6. Git — commit na branch correta

Depois de aprovar todas as validações:

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento"
if ((git branch --show-current).Trim() -ne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch incorreta' }

git add -- src/components/atendimento-inteligente/rmc-login-form.tsx
git add -- src/components/atendimento-inteligente/rmc-public-registration.tsx
git add -- src/components/atendimento-inteligente/rmc-registration-gate.tsx
git add -- src/components/atendimento-inteligente/rmc-landing.tsx
git add -- src/components/atendimento-inteligente/request-form.tsx
git add -- src/components/atendimento-inteligente/request-queue.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/entrar/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/cadastro/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/esqueci-senha/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/redefinir-senha/page.tsx
git add -- src/app/api/atendimento-inteligente/actor/route.ts
git add -- src/app/api/atendimento-inteligente/my/addresses/route.ts
git add -- src/app/api/atendimento-inteligente/customers/self-register/route.ts
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_05.md

git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Revise o stage. Se aparecerem alterações não relacionadas, retire-as antes do commit:

```powershell
git commit -m "feat(ae): acesso unificado RMC e UX mobile ajustes 05"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

**Não use `git add .` indiscriminadamente.** Não commite `.env.local` nem o próprio ZIP.

## 7. Vercel Preview e publicação

1. Aguarde o Preview da branch; confira que as variáveis de ambiente do Preview apontam para **Supabase de homologação**, não para banco real de produção.
2. Teste a rota `/solucoes/atendimento-inteligente/rmc/solicitar` **sem sessão**, em guia anônima.
3. Repita login, cadastro assistido, formulário, upload, fila, orçamento, papéis, recuperação e responsividade.
4. Só após aprovação, abra PR `feature/ae-atendimento-inteligente-multicliente-v1` → `main`, revise arquivos, testes e logs e faça merge.
5. No Vercel Production, confirme Supabase correto e **todas as flags de autoenvio/autocadastro desativadas**.
6. Não há alteração de esquema; publicar o build não exige SQL novo em produção.
7. Após deploy, teste novamente as rotas públicas, o login autorizado e um pedido assistido de teste; não use o número comercial para experimentos de Cloud API.
8. Se necessário, desative acesso por configuração/rollback do deployment anterior, ou reverta o commit no GitHub, com revisão das alterações subsequentes. Não faça `reset --hard` na `main`.

## 8. Observações para futuras fases

- SMS OTP no Supabase pode exigir provedor externo, gerar cobranças e ter limites antiabuso. As duas flags de autocadastro precisam ser ligadas **juntas**, somente após homologação. Ao ativá-las, reveja taxas, throttling, CAPTCHA e a elegibilidade de contas que já foram provisionadas pelo operador.
- Recuperação de conta **somente por telefone** ainda não está implementada: orientar o cliente a contatar a equipe até disponibilizar OTP validado.
- A liberação do envio de solicitações diretas é uma decisão separada e controlada por `AE_AI_CUSTOMER_REQUESTS_ENABLED`.
- Autenticação só por número (sem senha nem OTP) continua proibida.
- Se alguma verificação falhar, envie o log de `npm run lint`, `npx tsc --noEmit` ou `npm run build` e o arquivo indicado. Não publique antes de corrigir.
