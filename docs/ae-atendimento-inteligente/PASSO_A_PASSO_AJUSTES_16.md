# AE Atendimento Inteligente | Reparos RMC — Ajustes 16

**Base analisada:** ZIP gerado em 15/11/2026, commit `e817854e6af238a5ef2e8636dcad7520fa190462` da branch `feature/ae-atendimento-inteligente-multicliente-v1`.

## Entregue neste pacote

- Mostrar/ocultar senha e confirmação, mínimo de 8 caracteres no reset e na troca de senha do cliente. A configuração de política de senhas do Supabase também deverá permitir 8 caracteres; manter uso de senhas fortes.
- Exibição de nome `Automação Extrema` quando metadados de nome da conta estiverem configurados. Atualização de `user_metadata.full_name` é administrativa e foi fornecida em script privado **separado**, sem reescrever `auth.users`.
- No painel RMC, retirada do título/subtítulo e botão superior de atualização redundante, preservando a atualização da fila. Botão `Fechar painel` volta à página RMC. Na página Solicitar, `Fechar` volta à fila N1/N2.
- Nova área N2 (owner) mobile-friendly: serviços (com materiais/ferramentas e estimativas), origens da RMC, veículos/consumo, materiais, ferramentas, fornecedores e contratos recorrentes.
- Cadastro de origem padrão por empresa (somente uma); a primeira origem vira padrão. Cálculo básico de custo/km = preço/L ÷ km/L + custos variáveis informados. **Não existe cálculo automático de distância** (depende de API de rotas ou entrada validada).
- Área de revisão de rascunhos dos históricos de Kelly, Chez Elle e Gelinter. A carga de rascunhos é SQL **privado e opcional**; N2 aprova para N1 cadastrar manualmente depois de conferir o local. A fila oficial de pedidos não é preenchida automaticamente.
- Migration isolada da RMC `20261115150000_ae_atendimento_inteligente_ajustes_16.sql`. Sem alteração das tabelas de outras soluções.

## 1 — Preparação Windows/Git

```powershell
$repo='C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
cd $repo
git status -sb
git branch --show-current
git worktree list
git fetch origin --prune
```

Confirme `feature/ae-atendimento-inteligente-multicliente-v1`. Não use `reset --hard`, `clean` ou `git add -A` indiscriminadamente.

Salve o ZIP em `C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-16-IMPLEMENTACAO.zip` e o instalador em `C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-16.ps1`.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File 'C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-16.ps1' `
 -RepoPath $repo `
 -ZipPath 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-16-IMPLEMENTACAO.zip'
```

Se houver conflito com alteração local, **pare e revise `git diff`**, faça backup e eventualmente incorpore as diferenças antes de executar novamente com `-AllowModifiedFiles`. Instalador não executa SQL nem faz deploy.

## 2 — Banco de homologação

Confirme que migrations V1, 02, 03, 04 e 14 estão instaladas. Faça backup de um banco de homologação, execute `supabase/migrations/20261115150000_ae_atendimento_inteligente_ajustes_16.sql` com SQL Editor administrativo (papel `postgres`). Nunca conceda `SELECT ON auth.users` a `authenticated`.

```sql
select to_regclass('public.ae_ai_rmc_catalog') as catalogo,
       to_regclass('public.ae_ai_rmc_review_drafts') as revisao;
select proname from pg_proc where proname='ae_ai_rmc_save_catalog_v16';
```

As duas tabelas devem existir e a função deve retornar uma linha. Nenhum registro privado é importado nessa etapa.

## 3 — Variáveis e validações locais

Na configuração de homologação, mantenha credenciais Supabase da homologação e `AE_AI_SEND_LIVE=false`. Não habilite Cloud API ou cadastro público durante esta etapa.

```powershell
cd $repo
node --version          # preferir 24.x
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

No Supabase Auth → Settings / Password Security, confira se a política aceita ao menos 8 caracteres. Se a política for mais forte (mínimo 12), **mantenha a proteção mais forte** e ajuste a interface para o mesmo valor; jamais enfraqueça todo o projeto Supabase compartilhado sem avaliar TUCXA, StudyAgent e demais aplicações.

## 4 — Homologação das funcionalidades

1. Abrir `/solucoes/atendimento-inteligente/rmc/redefinir-senha` com link válido: botões Mostrar/Ocultar, confirmação, erros, atualização e saída. Também validar `/rmc/trocar-senha` com conta habilitada.
2. Executar `01_AJUSTAR_DISPLAY_N1_AE.mjs` em **modo de simulação**, conferir e-mail/UID antes de optar por `AE_CONFIRMAR_DISPLAY_N1=SIM`. Reautenticar e conferir `Automação Extrema` no cabeçalho.
3. Entrar como Anderson N2 (`owner` RMC). Conferir botão `Fechar`, tela mobile e acesso a `Configurações e custos`.
4. Criar e editar 2 serviços, adicionar materiais/ferramentas, cadastrar um endereço de origem e um segundo; marcar padrão e conferir persistência. Verificar que exclusão de endereço padrão com outros endereços exige selecionar outro padrão.
5. Cadastrar 1 veículo com consumo e preço do combustível; conferir cálculo ilustrativo: 10 km/L e R$ 6/L = R$ 0,60/km (só combustível), sem inferir distância da rota.
6. Cadastrar fornecedor, contrato e validar exclusão/edição. Testar no celular Android em 360 px e desktop.
7. Entrar como operador N1 e validar que não pode acessar APIs privadas N2 (`403`), nem a interface N2.
8. Validar isolamento multiempresa: operação nunca grava registros na Piloto e não altera TUCXA.
9. Opcional, após revisar dados privados, executar `02_IMPORTACAO_RASCUNHOS_RMC_AJUSTES_16.sql` **apenas na homologação** e verificar os sete rascunhos visíveis no painel Anderson, permitindo aprovar/rejeitar. Nenhum pedido oficial é criado ao aprovar.
10. Abrir solicitações já existentes, preparar orçamento N2 e confirmar que nenhuma mensagem do WhatsApp é disparada automaticamente.

## 5 — GitHub

```powershell
cd $repo
git status -sb
git diff --check
git add -- src/app/solucoes/atendimento-inteligente/rmc/redefinir-senha/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/trocar-senha/page.tsx
git add -- src/app/solucoes/atendimento-inteligente/rmc/solicitar/page.tsx
git add -- src/app/api/atendimento-inteligente/me/change-password/route.ts
git add -- src/app/api/atendimento-inteligente/rmc/operations/route.ts
git add -- src/app/api/atendimento-inteligente/rmc/review-drafts/route.ts
git add -- src/components/atendimento-inteligente/user-menu.tsx
git add -- src/components/atendimento-inteligente/panel.tsx
git add -- src/components/atendimento-inteligente/rmc-operations.tsx
git add -- src/components/atendimento-inteligente/rmc-review-drafts.tsx
git add -- supabase/migrations/20261115150000_ae_atendimento_inteligente_ajustes_16.sql
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_16.md
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

**Não incluir** `02_IMPORTACAO_RASCUNHOS_RMC_AJUSTES_16.sql` nem `01_AJUSTAR_DISPLAY_N1_AE.mjs` em Git: são privados, carregam identificadores reais e/ou executam operações administrativas.

Após validação:

```powershell
git commit -m 'feat(ae): cadastros e revisao N2 RMC ajustes 16'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

## 6 — Vercel Preview

Confirme o deployment Preview da branch e as variáveis de ambiente correspondentes a um **Supabase de homologação separado**. Aplique migration 16 no banco do Preview se ainda não aplicada. Repita testes de acesso, formulários, contratos, revisão e cálculo. Se o Preview apontar para Production, evite testes que gravem dados fictícios.

## 7 — Produção

1. Faça backup do Supabase Production. Confirme estado das migrations anteriores e ausência de divergência dos objetos.
2. Aplique migration 16 Production (aditiva) e valide consultas de existência.
3. Revise integralmente o PR da branch contra `main`, inclusive commits anteriores. Faça merge com aprovação e acompanhe o deployment Production no Vercel.
4. Faça smoke test com a conta Anderson já existente, sem dados fictícios públicos. Valide CRUD e acessos N1/N2.
5. Opcional: execute o SQL privado de prévias somente após Anderson autorizar a importação das informações das conversas e conferir que o ambiente correto está selecionado. Confira cada rascunho antes da aprovação.
6. Preencha os dados de catálogo de acordo com a planilha revisada pelo Anderson; esta versão **não sincroniza automaticamente** Sheets → Supabase.

## 8 — Rollback

Para interface, redeploy de release anterior ou `git revert` do commit em PR. **Não remova a migration automaticamente** depois de cadastros reais: tabelas novas podem conter dados. Para interromper a funcionalidade, volte à release anterior, preserve dados e execute migração reversa planejada somente após backup.
