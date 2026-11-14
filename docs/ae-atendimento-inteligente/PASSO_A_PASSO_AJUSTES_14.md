# AE Atendimento Inteligente — Ajustes 14

**Versão:** 14/11/2026 — branch `feature/ae-atendimento-inteligente-multicliente-v1`.

## 1. Escopo desta entrega

- Na RMC (empresa fixa), esconder a seleção/status técnico da empresa; no painel multiempresa ela permanece.
- Retirar a descrição técnica desnecessária da fila RMC.
- Mover **Adicionar outro serviço** para a terceira etapa; o botão volta para a etapa 1 com um novo serviço em branco. Máximo de cinco.
- Reutilizar endereços do mesmo cliente; mostrar orientação de primeiro pedido somente quando não houver pedidos anteriores. Novo endereço em **duas páginas compactas** no modal; rolagem interna continua como acessibilidade em telas muito pequenas.
- Remover quadro de consentimento e texto redundante da tela N1; manter autenticação e auditoria de quem registrou, sem declarar consentimento expresso que não foi coletado. A futura área do cliente continua exigindo confirmação explícita.
- Cadastro N1 com **nome + WhatsApp + e-mail opcional**, sem senha, sem criação de usuário Auth e sem liberar portal; adicionar botão Fechar. Clientes já existentes, inclusive os antigos com Auth, permanecem inalterados.
- **Migration 14 obrigatória** antes de cadastrar novos clientes, pois `auth_user_id` era NOT NULL.
- A importação dos históricos de Kelly, Chez Elle e Gelinter não é automática nesta entrega: prévia confidencial separada, checagem de duplicidades, revisão N1/N2, registro pelo formulário.

## 2. Pré-requisitos

- Worktree: `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`
- Branch: `feature/ae-atendimento-inteligente-multicliente-v1`
- Node.js 24.x, NPM, dependências do projeto; acesso ao ambiente Supabase correto.
- **Supabase de homologação separado** de Production. Se o Preview apontar para Production, evite criar registros fictícios.
- Migrations base V1/02/03/04 executadas no ambiente de destino. A migration 14 não as substitui.
- Envios reais de WhatsApp desativados: `AE_AI_SEND_LIVE=false`, sem ativar autocadastro público.

## 3. Backup da worktree e instalação

Abra PowerShell:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-14-IMPLEMENTACAO.zip'
cd $repo
git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
if ((git branch --show-current).Trim() -cne $branch) { throw 'Branch incorreta' }
```

Salve o instalador `Instalar-AE-Atendimento-Inteligente-Ajustes-14.ps1` em `C:\Users\lacos\Documents\scripts`. Execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-14.ps1' -RepoPath $repo -ZipPath $zip
```

O instalador valida a branch, verifica se há mudanças locais nos arquivos-alvo, cria backup com pastas originais dentro de `C:\Users\lacos\Documents\zips`, e copia somente 7 arquivos + este guia. Se houver arquivo-alvo modificado, o instalador **interrompe** por segurança; preserve o trabalho e revise antes de usar `-AllowModifiedFiles`.

## 4. Supabase — executar a migration 14 ANTES de testar cadastro

1. Faça backup do Supabase de homologação e confira o projeto selecionado (evite `main — PRODUCTION` por engano).
2. No SQL Editor com role administrativa **postgres**, execute **somente** `supabase/migrations/20261114220000_ae_atendimento_inteligente_ajustes_14.sql` depois das migrations 01-04.
3. Não execute `GRANT SELECT ON auth.users TO authenticated`. Esta migration não precisa conceder permissões públicas.
4. Execute a consulta de verificação:

```sql
SELECT table_schema, table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='ae_ai_customers'
  AND column_name='auth_user_id';
-- Esperado: is_nullable = YES

SELECT conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint WHERE conname='ae_ai_customer_portal_requires_auth_v14';
-- Esperado: portal_enabled exige auth_user_id não NULL
```

A alteração permite novos cadastros N1 sem senha. Para **ativar o portal no futuro**, será necessário verificar a titularidade do telefone, criar/vincular o usuário Auth ao registro existente e configurar uma senha escolhida pelo próprio cliente — não criar outro cliente com o mesmo número.

## 5. Validações no Windows

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version   # 24.x
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Se surgir qualquer erro, NÃO faça push ou merge até corrigi-lo.

## 6. Homologação funcional (local e Preview)

1. Acesse `/solucoes/atendimento-inteligente/rmc/atendimento` como N1. Confirme que o seletor de empresa e status técnico sumiram; a fila e os botões permanecem.
2. Teste o painel administrativo multiempresa separado. O seletor deve continuar disponível lá.
3. Acesse `/solucoes/atendimento-inteligente/rmc/cadastro`: nome, WhatsApp, e-mail opcional, **sem senha**, botão Fechar. Cadastre cliente fictício no Supabase de teste; não crie Auth user. Conferir `auth_user_id IS NULL`, `portal_enabled=false`.
4. Repita o WhatsApp do teste: deve rejeitar duplicação, sem alterar o registro existente.
5. Teste cadastro já existente com `auth_user_id` preenchido: deve permanecer válido, sem exigir migração de identidade.
6. Abra `/rmc/solicitar` como N1, selecione cliente. Preencha etapa 1 e 2. Na etapa 3, botão “Adicionar outro serviço” deve voltar à etapa 1, preservando os campos já preenchidos. Máximo 5 serviços.
7. No primeiro pedido sem histórico, conferir explicação do endereço. Preencher CEP/rua/número e continuar para bairro/cidade/UF; enviar pedido. Em telas muito pequenas ou com zoom, rolagem **interna do modal** continua permitida.
8. Reabra o cliente e crie uma segunda solicitação: o endereço anterior deve aparecer para seleção e não deve ser recriado.
9. Verifique que não há quadro de consentimento N1, mas o histórico registra quem fez a triagem e `consent_confirmed=false` quando N1 não recolheu consentimento explícito. Quando acesso direto do cliente for liberado, seu checkbox continua exigido.
10. Entre como Anderson/N2 e confirme que consegue consultar pedido, criar orçamento e atualizar status. Teste isolamento entre RMC e Piloto.
11. Faça um pedido com foto opcional e um sem anexo. Confirme que nenhum WhatsApp automático foi enviado.
12. Compare os registros históricos de Kelly/Chez Elle/Gelinter (ver prévia privada) com a fila para evitar pedidos duplicados.

### SQL somente leitura de conferência dos três clientes (não cria nada)

```sql
SELECT c.id AS customer_id, c.full_name, t.phone, c.auth_user_id,
       c.portal_enabled
FROM public.ae_ai_customers c
JOIN public.ae_ai_contacts t ON t.id=c.contact_id AND t.organization_id=c.organization_id
JOIN public.ae_ai_organizations o ON o.id=c.organization_id
WHERE o.slug='reparos-rmc'
  AND t.phone IN ('5519997248819','5519996539390','5519984173280');
```

> Não execute SQL de criação de pedidos históricos sem conferir antes `ae_ai_requests`, os endereços e os status. O histórico do WhatsApp não prova automaticamente que algo foi concluído.

## 7. Commit seletivo e push na branch correta

Depois de todos os testes concluídos:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
if ((git branch --show-current).Trim() -cne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch errada' }
git add -- src/components/atendimento-inteligente/panel.tsx
git add -- src/components/atendimento-inteligente/request-queue.tsx
git add -- src/components/atendimento-inteligente/request-form.tsx
git add -- src/components/atendimento-inteligente/customer-provisioner.tsx
git add -- src/app/api/atendimento-inteligente/customers/route.ts
git add -- src/app/api/atendimento-inteligente/requests/route.ts
git add -- supabase/migrations/20261114220000_ae_atendimento_inteligente_ajustes_14.sql
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_14.md
git diff --cached --name-only
git diff --cached --check
git diff --cached --stat
git diff --cached
# Depois de revisar:
git commit -m 'feat(ae): simplifica N1 RMC e cadastro sem senha ajustes 14'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

Não inclua arquivos `.env`, conversas, CSVs de clientes nem senhas. Não use `git add -A` em todo o repositório.

## 8. Vercel Preview e publicação Production

- **Preview:** configure-o para Supabase de homologação, com migration 14 já aplicada. Repita testes mobile, cadastro, dois pedidos sucessivos, orçamento N2 e permissões.
- **PR para main:** revise `git diff origin/main...HEAD` e a lista de commits; não integre alterações antigas ainda não aprovadas.
- **Production:** faça backup do banco; aplique a migration 14 em Production com acesso administrativo **antes** do deploy com novos cadastros. Confirme que a migration passou. Verifique env vars e `AE_AI_SEND_LIVE=false`. Então faça merge do PR aprovado e teste com dados controlados.
- **Rollback:** se houver erro de interface, faça rollback para deployment anterior no Vercel. **Não** tente reverter automaticamente `auth_user_id` para `NOT NULL` se clientes sem Auth já tiverem sido cadastrados: o rollback de banco requer avaliação dos dados.
- **Dados reais:** não importar históricos nem reclassificar automaticamente na Production sem prévia aprovada por N1/Anderson.

## 9. Status e privacidade

| Lista WhatsApp | Status interno |
|---|---|
| Novo atendimento | `pending` |
| Aguardando informações | `need_info` |
| Para orçamento | `in_review` |
| Orçamento enviado | `quoted` |
| Agendado | `scheduled` |
| Em execução | `in_progress` |
| Aguardando pagamento | `awaiting_payment` |
| Finalizado | `completed` |
| Cliente recorrente | **Atributo de relacionamento**, não status de pedido |

Também existem estados internos `approved`, `declined`, `cancelled` que devem ser mantidos. Nenhuma lista do WhatsApp sincroniza automaticamente nesta fase.
