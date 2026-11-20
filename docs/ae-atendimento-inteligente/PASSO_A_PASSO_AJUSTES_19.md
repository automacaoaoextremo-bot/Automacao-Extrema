# AE — Atendimento Inteligente | Ajustes 19

**Implementação dos ajustes visuais descritos no arquivo `AE - Atendimento Inteligente 19.docx` (3 páginas).**

## Dados de referência

- Coleta recebida: `ae-atendimento-inteligente-ajustes-19-fontes-20261119-123920-022.zip`.
- Commit da coleta: `29e5fbb42e5f2a3d0cc404f60be0a13bf7d60d28`.
- Branch de destino: `feature/ae-atendimento-inteligente-multicliente-v1`.
- Worktree: `C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento`.
- Estado no momento da coleta: 20 entradas no Git status, inclusive `M src/app/api/atendimento-inteligente/my/requests/route.ts`. **Não descartar essas alterações.**

## Arquivos que este pacote altera

1. `src/components/atendimento-inteligente/rmc-dashboard.tsx`
2. `src/components/atendimento-inteligente/rmc-operations.tsx`
3. `docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_19.md` (novo documento)

### Comportamento novo

- Painel **N2**: sem o selo “Reparos RMC · N2” no cartão de saudação e sem “Toque para abrir” nos cards N2; menor espaçamento vertical e interno, preservando conteúdo e navegação. Os cards N1 mantêm seus textos e ações.
- **Serviços e Custos**: “+ Novo” aparece ao lado de “Fechar”, no mesmo grupo à direita do título; título e contagem de serviços com menos espaço vertical; **4 tipos de serviço por página**. Para as outras categorias de cadastro a página continua comportando 6 registros, evitando alterar seu fluxo sem solicitação.
- Editor permanece com apenas um botão “Fechar” para retornar à listagem, enquanto “Anterior/Próxima/Salvar”, “Editar/Excluir” e “Inativar/Ativar” permanecem.
- **Sem migration SQL nova** e sem alterações a APIs, autenticação, dados ou mensageria.

## 1. Preparar diretórios e verificar branch

Execute no **PowerShell**:

```powershell
$Repo = 'C:\Users\lacos\Documents\GitHub\automacao-extrema-atendimento'
$Scripts = 'C:\Users\lacos\Documents\scripts'
$Zips = 'C:\Users\lacos\Documents\zips'
New-Item -ItemType Directory -Force -Path $Scripts,$Zips | Out-Null
Set-Location $Repo

git worktree list
git branch --show-current
git status -sb
git rev-parse HEAD
```

A branch retornada por `git branch --show-current` **deve** ser `feature/ae-atendimento-inteligente-multicliente-v1`. Se não for, interrompa e localize o worktree correto. O script de instalação **não muda de branch**.

**Não use:** `git reset --hard`, `git clean -fd`, `git add -A`, `git push --force`.

## 2. Copiar arquivos baixados para as pastas corretas

Baixe o pacote de implementação e o instalador e coloque-os nos caminhos abaixo:

- `C:\Users\lacos\Documents\zips\AE-Atendimento-Inteligente-Ajustes-19-IMPLEMENTACAO.zip`
- `C:\Users\lacos\Documents\scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-19.ps1`

O arquivo `.txt` do instalador é exatamente o mesmo script e pode ser copiado no Bloco de Notas para um arquivo `.ps1` na pasta `$Scripts`.

## 3. Simular a instalação (sem mudar o repositório)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-19.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Ajustes-19-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips" `
  -DryRun
```

O instalador confirma branch, compara SHA256 do arquivo atual com a **base recebida**, confere o SHA256 de cada fonte do ZIP, e detecta divergências. Em caso de mudança local posterior à coleta, a instalação é bloqueada; **não sobrescreva nem apague o trabalho existente**. Confira o diff e envie uma nova coleta para conciliar.

## 4. Instalar com backup

Somente após o `-DryRun` concluir sem conflitos:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$Scripts\Instalar-AE-Atendimento-Inteligente-Ajustes-19.ps1" `
  -RepoRoot "$Repo" `
  -ZipPath "$Zips\AE-Atendimento-Inteligente-Ajustes-19-IMPLEMENTACAO.zip" `
  -BackupRoot "$Zips"
```

Antes da substituição, o instalador faz backup dos arquivos existentes em `C:\Users\lacos\Documents\zips\ae-atendimento-ajustes-19-backup-<data-hora>`. Ele não altera o Git, não instala dependências e não faz deploy. O arquivo de documentação é novo; caso já exista com conteúdo diferente, o instalador bloqueará a substituição.

## 5. Conferir o diff

```powershell
Set-Location $Repo
git status -sb
git diff --check
git diff --stat
git diff -- 'src/components/atendimento-inteligente/rmc-dashboard.tsx'
git diff -- 'src/components/atendimento-inteligente/rmc-operations.tsx'
```

Confirme que **nenhum** arquivo de API, SQL ou `.env` foi alterado pelo instalador. O estado local antigo de `src/app/api/atendimento-inteligente/my/requests/route.ts` deve permanecer intocado.

## 6. Compilar localmente e executar

O `package.json` exige **Node.js 24.x**:

```powershell
node --version
npm --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Se qualquer teste automatizado falhar, **não publique**. Investigue antes a origem do erro, sem limpar/descartar alterações de outras tarefas.

Acesse o navegador local:

`http://localhost:3000/solucoes/atendimento-inteligente/rmc/entrar`

O `vercel.json` do repositório usa `yarn install --no-lockfile --network-timeout 600000 --ignore-engines` e `yarn build`; um build npm local aprovado **não substitui** a conferência do Vercel Preview.

## 7. Homologação manual — celular e desktop

Teste com um usuário N2 de homologação, por exemplo em largura de 360 e 390 px, e no desktop. Com usuário N1 teste que o fluxo anterior permanece.

| Teste | Passos | Resultado esperado |
|---|---|---|
| H19-01 | Entrar como N2 | Saudação e texto da Reparos RMC; sem “Reparos RMC · N2” no topo do cartão |
| H19-02 | Conferir menu N2 | Nenhum card N2 mostra “TOQUE PARA ABRIR”; títulos e descrições preservados |
| H19-03 | Rolagem no celular | Cards em duas colunas, espaços menores, sem sobreposição ou truncamento prejudicial |
| H19-04 | Abrir “Serviços e custos” | “Serviços e Custos” e “Tipos de serviço (12)” mais próximos; **+ Novo** junto a **Fechar** |
| H19-05 | Com 12 serviços | Página 1 exibe 4; “Próxima” passa para páginas 2 e 3, sem repetir/omitir itens |
| H19-06 | Paginação | “Anterior” desativado na página 1; “Próxima” desativado na última página |
| H19-07 | + Novo | Abre editor; único “Fechar” fecha editor e retorna à lista, sem deslogar |
| H19-08 | Editar serviço | Campos/etapas e botões “Anterior/Próxima/Salvar” funcionam normalmente |
| H19-09 | Inativar/Ativar | Os botões continuam funcionando, com preservação dos dados (somente homologação) |
| H19-10 | Abrir outros catálogos N2 | Navegação e CRUD mantidos, seis registros por página como antes |
| H19-11 | “Fechar” na lista | Retorna ao menu N2 e mantém a sessão |
| H19-12 | Entrar como N1 | Cadastrar cliente, registrar pedido e acompanhar pedidos continuam disponíveis; sem privilégio N2 |
| H19-13 | Outras empresas | Painéis não-RMC sem regressão |

Esses testes exigem aplicação funcional e usuários reais de homologação. O pacote não contém credenciais ou dados de produção.

**Supabase:** não há SQL novo dos Ajustes 19. As migrations anteriores, inclusive a 18, precisam continuar aplicadas no ambiente que será testado. Não faça nenhuma alteração no banco de produção para esses ajustes.

## 8. Commit isolado na branch e push

Antes de adicionar os arquivos, confira se o índice já contém algo de outra tarefa:

```powershell
Set-Location $Repo
git branch --show-current
git diff --cached --name-only
```

Se houver arquivos já em staging de outra tarefa, resolva isso separadamente antes de continuar; **não** os inclua no commit 19.

```powershell
git add -- 'src/components/atendimento-inteligente/rmc-dashboard.tsx'
git add -- 'src/components/atendimento-inteligente/rmc-operations.tsx'
git add -- 'docs/ae-atendimento-inteligente/PASSO_A_PASSO_AJUSTES_19.md'

git diff --cached --check
git diff --cached --name-only
git diff --cached --stat
git diff --cached
```

O commit deve conter **exatamente esses três caminhos**. Após conferir:

```powershell
git commit -m "feat(ae): compacta painel RMC e pagina servicos ajustes 19"
git push -u origin feature/ae-atendimento-inteligente-multicliente-v1
```

O push da branch não equivale à publicação em produção. Confirme o SHA do commit e não misture outros ajustes pendentes.

## 9. Vercel Preview e integração na main

1. No Vercel, abra o deployment **Preview** da branch, confira o SHA enviado e o resultado do build.
2. Confirme que o Preview utiliza o Supabase de homologação, e que integrações externas / mensagens reais estão desativadas (por exemplo, `AE_AI_SEND_LIVE=false`, se usado no projeto).
3. Repita H19-01 a H19-13 no Preview; se falhar, corrija na mesma branch e faça novo push.
4. No repositório local, confira as mudanças ainda não integradas:

```powershell
git fetch origin --prune
git log --oneline origin/main..origin/feature/ae-atendimento-inteligente-multicliente-v1
git diff --stat origin/main...origin/feature/ae-atendimento-inteligente-multicliente-v1
```

5. No GitHub, abra um **Pull Request** da branch para `main`. A branch pode conter commits de ajustes anteriores: **avalie TODOS os commits do PR**, não apenas os dois componentes desta entrega.
6. Depois da aprovação e dos checks, faça o merge. Se o Vercel estiver vinculado à `main` para Production, confirme o deployment correspondente ao commit integrado.
7. Valide a tela em `https://www.automacaoextrema.com/solucoes/atendimento-inteligente/rmc/entrar` usando conta N2 autorizada. Faça smoke test da paginação, cards, + Novo, Fechar e navegação N1.

**Não houve publicação automática:** este ZIP e script apenas preparam a instalação local.

## 10. Reversão

Se detectar problema **antes do commit**, use a pasta de backup feita pelo instalador para recuperar somente os arquivos deste pacote (copie de volta após inspecionar). Se ocorrer problema **após produção**, prefira restaurar o deployment anterior do Vercel e fazer um `git revert` do commit dos Ajustes 19, por Pull Request, sem executar `git reset --hard` na branch compartilhada. Não é necessário reverter SQL.

## Limites da validação efetuada pelo assistente

O pacote foi gerado a partir dos arquivos da coleta, o diff dos dois componentes foi inspecionado e a sintaxe TSX foi testada via transpilador TypeScript. **Ainda não** foram executados o build integral Next.js, testes com usuários/sessões N1/N2, deploy Preview/Production nem o instalador PowerShell em Windows, pois este ambiente não possui as condições do seu repositório e contas reais. Esses testes são essenciais para liberar produção.
