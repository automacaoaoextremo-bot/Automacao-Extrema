# AE Atendimento Inteligente — Ajustes 13

**Reparos RMC | `feature/ae-atendimento-inteligente-multicliente-v1` | 14/11/2026**

## 1. Escopo efetivamente entregue

- O cabeçalho, em `user-menu.tsx`, exibe somente o primeiro e o último nome do usuário autenticado; não altera o nome completo armazenado no Supabase Auth.
- O formulário em `request-form.tsx` passa a ter **três botões** para abrir as etapas em janelas modais: (1) Serviços e problema, (2) Fotos e preferências, (3) Endereço e autorização.
- O modal usa o elemento HTML nativo `<dialog>` para foco, Escape e bloqueio do fundo. Os estados permanecem na memória da tela ao fechar/reabrir uma etapa. O diálogo é responsivo, com rolagem interna e rodapé de navegação.
- O envio real continua usando a API autenticada existente, com validação de serviços, arquivos, endereço e consentimento. Nada é enviado por abrir ou fechar uma etapa.
- **Não há nova migration SQL, API nova, alteração na autenticação nem na integração WhatsApp.**
- Os três chats de clientes foram examinados e uma prévia de histórico foi preparada **fora do ZIP de código**, para revisão. Não houve gravação automática no Supabase; esse passo exige confirmação dos dados, autorização e senha individual criada pelo N1.

## 2. Arquivos que a instalação altera

```text
src/components/atendimento-inteligente/user-menu.tsx
src/components/atendimento-inteligente/request-form.tsx
```

Este guia acompanha o pacote em `docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_13.md`.

## 3. Pré-requisitos

- Windows PowerShell 5.1+.
- Git com a branch **exatamente** `feature/ae-atendimento-inteligente-multicliente-v1` na worktree local.
- Node.js **24.x** conforme configuração do projeto em Vercel; npm instalado.
- `.env.local` existente, com Supabase apropriado ao ambiente **de homologação**; mantenha todos os envios automáticos desativados durante o piloto.
- Acesso N1 válido e conta N2 Anderson previamente vinculada à RMC.
- Um Vercel Preview configurado contra um **banco de homologação distinto de Production** (se não houver ambiente separado, não use cadastros de teste reais).

## 4. Fazer backup e instalar

Salve o ZIP e instalador:

```powershell
$repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$branch = 'feature/ae-atendimento-inteligente-multicliente-v1'
$zip = 'C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-13-IMPLEMENTACAO.zip'
cd $repo

git status -sb
git branch --show-current
git worktree list

if ((git branch --show-current).Trim() -cne $branch) { throw 'Branch incorreta. Interrompido.' }
```

Se houver alterações locais não relacionadas, preserve-as antes de instalar. O instalador faz backup dos dois arquivos que substitui, para `C:\Users\lacos\Documents\zips\backup-ae-ai-ajustes-13-<data>`.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
 -File 'C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-13.ps1' `
 -RepoPath $repo -ZipPath $zip
```

Se preferir instalação manual, somente após backup:

```powershell
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
```

**Atenção:** o ZIP não contém `.env` nem históricos privados; a extração manual também adiciona a documentação e o manifesto do pacote. O instalador controla os destinos esperados.

Após instalar:

```powershell
cd $repo
git status -sb
git diff --check
git diff -- src/components/atendimento-inteligente/user-menu.tsx src/components/atendimento-inteligente/request-form.tsx
```

## 5. Validações locais (obrigatórias)

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

**Pare no primeiro erro**, principalmente erro de lint, TypeScript ou build. O pacote passou na verificação de sintaxe isolada com o compilador TypeScript, **não** em `npm ci`, lint ou build integral do projeto nesta sessão.

## 6. Homologação funcional

Abrir no ambiente local/Preview:

```text
/solucoes/atendimento-inteligente/rmc/entrar
/solucoes/atendimento-inteligente/rmc/solicitar
/solucoes/atendimento-inteligente/rmc/cadastro
/solucoes/atendimento-inteligente/rmc/atendimento
```

1. Entre como N1: no topo, conferir `Márcio Silva` se o Auth retorna `Márcio Alexandre da Silva`; verificar que o nome completo permanece igual no banco.
2. Entre como Anderson N2: confirmar que aparece apenas primeiro/último nome e que `Sair` funciona.
3. Selecione **cliente de teste** no N1 (conta de cliente com dados de teste autorizados).
4. Abra **1 — Serviços**, digite categoria e descrição, feche e reabra: os valores devem continuar presentes.
5. Abra **2 — Fotos e preferências**, selecione fotos/vídeos de teste, feche e reabra: os nomes devem continuar indicados; valide os limites de 3 fotos de até 5 MB e 1 vídeo de até 15 MB.
6. Abra **3 — Endereço e autorização** e verifique CEP, busca automática, endereço pré-existente e consentimento.
7. Teste navegação com os botões, Escape, teclado e rolagem vertical no Android; não deve aparecer o formulário longo na página principal.
8. Valide erro em serviço incompleto, endereço incompleto e consentimento ausente; não deve enviar pedido inválido.
9. Registre **somente uma solicitação fictícia de homologação** e confirme protocolo, registro no painel N2, edição de orçamento e ausência de envios automáticos.
10. Confirme isolamento entre RMC e Piloto, funcionamento do cadastro N1 e acesso do cliente ainda bloqueado na Fase 0.
11. Confirme que nenhuma requisição é criada simplesmente por abrir/fechar um modal.

## 7. Três históricos do WhatsApp: prévia privada, não alteração de produção

Os ZIPs de Kelly, Chez Elle e Gelinter são fornecidos separadamente pelo usuário. Não foram incluídos no pacote de código. A prévia privada identifica clientes, endereços/unidades e possíveis demandas.

**Antes de cadastrar contas reais:** verificar nome completo/razão social, telefone correto, se já existe contato/cliente com aquele número, autorização para cadastro e definir **senha individual** para cada conta. Não gerar senhas previsíveis. Não copiar senhas de chats para planilhas, arquivos, URLs ou Git. Permanecer com `portal_enabled=false` e `must_change_password=true` conforme fluxo do Ajuste 12.

Para os registros históricos, Anderson deve separar: (a) concluído comprovado, (b) orçamento enviado, (c) demanda em aberto e (d) informação ambígua. **Não crie solicitação nova para serviço concluído** nem lance recebimento sem conciliar. Gelinter precisa separar cada local de atendimento em seu endereço, ligado ao mesmo cliente comercial.

Com dados validados e acesso N1, use `/rmc/cadastro`, crie cada cliente, e utilize a opção `Registrar pedido deste cliente` somente para pendências reais. A importação em lote de históricos exigirá uma rotina administrativa adicional e uma aprovação explícita para escrita em produção. **Nenhuma escrita foi realizada nesta entrega.**

## 8. Commit e push exclusivamente na branch

Após todas as validações:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
if ((git branch --show-current).Trim() -cne 'feature/ae-atendimento-inteligente-multicliente-v1') { throw 'Branch incorreta.' }

git add -- src/components/atendimento-inteligente/user-menu.tsx
git add -- src/components/atendimento-inteligente/request-form.tsx
git add -- docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_13.md

git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Se o diff incluir conteúdo privado, mudanças 09/10 não aprovadas ou arquivos inesperados, retire da área staged com `git restore --staged -- <caminho>` e revise. **Nunca** `git add -A` na raiz sem inspeção.

```powershell
git commit -m 'feat(ae): ajusta nome exibido e etapas modais RMC ajustes 13'
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

## 9. Vercel Preview, PR e Production

1. Após o push, confirme o Preview Vercel dessa branch e as variáveis para o **Supabase de homologação**; mantenha `AE_AI_SEND_LIVE=false`, `AE_AI_PUBLIC_INTAKE_ENABLED=false`, `AE_AI_ASSISTED_N1_ENABLED=false`, `AE_AI_SELF_REGISTRATION_ENABLED=false`, `NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED=false` e `AE_AI_CUSTOMER_REQUESTS_ENABLED=false` na Fase 0, conforme código vigente.
2. Repita o checklist no Android e no desktop. Confirme sem envio de WhatsApp automático.
3. Compare **todo** o diff da branch contra `main`, não apenas o commit atual. Não integre mudanças antigas não homologadas.
4. Abra Pull Request para `main` e peça revisão dos componentes alterados e de eventuais diferenças pré-existentes.
5. Após aprovação, faça merge; aguarde o deploy Production e acompanhe o painel do Vercel.
6. Confira a tela no domínio oficial com contas de teste aprovadas; não crie histórico fictício de clientes reais. Não é preciso aplicar nova migration dos Ajustes 13.
7. Em falha, utilize o rollback do deployment Production no Vercel ou faça revert do commit por PR, **sem** alterar manualmente o banco ou descartar dados existentes.

## 10. Resumo do que não é feito automaticamente

- Não há cadastro automático dos três clientes em um Supabase remoto: faltam confirmação dos registros e senhas individuais, e não temos acesso administrativo ao banco nesta sessão.
- Não há importação automática de todas as mensagens como histórico de serviços.
- Não há integração nova com WhatsApp Business ou Google Contatos.
- Não há migração SQL nova nem mudança nas outras soluções da AE.
