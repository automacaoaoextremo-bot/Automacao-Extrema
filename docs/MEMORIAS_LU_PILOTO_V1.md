# MEMÓRIAS QUE ENCANTAM — LU — PILOTO V1
## Instalação, segurança e homologação por celular

**Branch:** `feature/memorias-que-encantam-lu-piloto-v1`  
**Base:** `origin/main` (NÃO criar a partir das branches Tucxa Agendamentos V2 ou Bingo)  
**Rota:** `/solucoes/memorias-que-encantam/livro/lu-2026`

## O que esta versão entrega
- Acesso restrito por código de homologação; cookie HttpOnly assinado com validade de três dias.
- Página que se adapta ao celular, com 12 músicas pré-cadastradas, ordem provisória.
- Áudios **sintetizados/instrumentais de teste**, 8 segundos por música.
- Botões de reprodução, pausa, anterior, próxima e barra de progresso.
- Seção demonstrativa de letras/desenhos; não há ilustrações reais nesta versão.
- Feedback selecionável e compartilhável pelo WhatsApp, sem gravar respostas no servidor.
- Não instala bucket, não grava dados no Supabase e não altera arquivos antigos.

**ATENÇÃO:** esta prévia não utiliza as gravações das crianças! Não transfira o `Lu.zip` para `public/`, Vercel, GitHub, buckets públicos ou qualquer link público. Não troque os 12 MP3 de demonstração por gravações reais. Isso só será feito após a validação e publicação segura em armazenamento privado.

## Antes de começar
1. No Windows 11, confirme que está dentro da pasta do repositório local da Automação Extrema (onde existe `package.json`).
2. Confira `git status` — a árvore deve estar limpa. Faça commit ou stash deliberado das alterações existentes se necessário; não apague o trabalho das branches Tucxa/Bingo.
3. Confirme o Node.js 24 (`node -v`). O `package.json` desta base exige `24.x`.
4. Baixe o `ae-memorias-lu-piloto-v1.zip` para `C:\Users\lacos\Documents\zips` e `instalar_memorias_lu_piloto_v1.ps1` para `C:\Users\lacos\Documents\scripts`.

## Criar a nova branch sem interferir nas duas existentes
No PowerShell, na pasta de seu repositório:

```powershell
git status
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c feature/memorias-que-encantam-lu-piloto-v1
git branch --show-current
```

Se a branch já existir, use `git switch feature/memorias-que-encantam-lu-piloto-v1` **sem recriá-la**. Não faça merge das outras branches neste piloto.

## Aplicar o pacote
O script abaixo cria ou seleciona a branch a partir de `origin/main`, verifica se o repositório está limpo e copia somente os novos caminhos. Executar da pasta do repositório:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\lacos\Documents\scripts\instalar_memorias_lu_piloto_v1.ps1" -RepoPath (Get-Location).Path -ZipPath "C:\Users\lacos\Documents\zips\ae-memorias-lu-piloto-v1.zip"
```

**Não precisa executar os comandos de criação de branch manualmente se usar o script.** Escolha um método. Se instalar manualmente, extraia o ZIP na raiz do repositório, preservando as pastas `src`, `public` e `docs`. O pacote contém apenas arquivos novos.

## Configurar segredo de homologação na Vercel
Abra o projeto da Automação Extrema em **Vercel → Settings → Environment Variables** e adicione (marque **Preview**, não Production):

- `MEMORIAS_LU_PREVIEW_CODE`: um código de no mínimo 8 caracteres que você enviará separadamente à Lu.
- `MEMORIAS_LU_SESSION_SECRET`: sequência aleatória secreta de pelo menos 32 caracteres, utilizada para assinar o acesso. **Nunca compartilhe esta chave com a Lu.**

Para gerar uma chave aleatória de 32 bytes no PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Coloque o valor gerado em `MEMORIAS_LU_SESSION_SECRET`. Evite pôr qualquer um desses valores no Git, neste documento ou em `NEXT_PUBLIC_*`. Não altere as variáveis das soluções já ativas. Após alterar variáveis da Vercel, dispare um novo deployment/redeploy de Preview para elas surtirem efeito.

## Testes locais
Com Node.js 24 instalado:

```powershell
npm ci
npx eslint src/app/solucoes/memorias-que-encantam/livro/lu-2026 src/components/education src/lib/education
npx tsc --noEmit
npm run build
```

Para acessar localmente (se desejar): defina as duas variáveis somente **na sessão do seu PowerShell** e execute `npm run dev`:

```powershell
$env:MEMORIAS_LU_PREVIEW_CODE = "<codigo-local-de-teste>"
$env:MEMORIAS_LU_SESSION_SECRET = "<segredo-local-com-32-ou-mais-caracteres>"
npm run dev
```

Abra `http://localhost:3000/solucoes/memorias-que-encantam/livro/lu-2026`. Os valores entre `<...>` são placeholders, substitua-os por segredos reais escolhidos por você.

## Publicar Preview sem afetar Production
1. `git status` — confirme que os arquivos novos são apenas `src/app/solucoes/memorias-que-encantam`, `src/components/education`, `src/lib/education`, `public/education-demo` e este guia.
2. Adicione **apenas esses arquivos**:

```powershell
git add src/app/solucoes/memorias-que-encantam src/components/education src/lib/education public/education-demo docs/MEMORIAS_LU_PILOTO_V1.md
git commit -m "feat(educacao): piloto mobile do livro musical da Lu"
git push -u origin feature/memorias-que-encantam-lu-piloto-v1
```

3. Em Vercel → projeto → Deployments, localize o Preview da branch. Aguarde que fique **Ready**.
4. Abra o Preview. Acrescente **somente** `/solucoes/memorias-que-encantam/livro/lu-2026` ao domínio exibido pela Vercel.
5. Se a Vercel pedir login, use **Share → Anyone with the link / Shareable Link** para essa branch, mantendo a proteção do projeto; o link compartilhável dá acesso à etapa da Vercel, e a página ainda pede o código próprio. A disponibilidade exata depende das configurações de proteção do projeto. Nunca compartilhe tokens amplos de bypass de automação.
6. Teste em aba anônima e no celular: primeiro veja a tela de código, depois o conteúdo. Digite um código incorreto e verifique que o conteúdo continua inacessível. Teste o correto e o botão Sair.
7. Envie à Lu **o URL efetivo do Preview e o código em mensagem separada**, sem incluir nenhum segredo de sessão. Não use `vercel --prod` e não faça merge em `main`.

## Roteiro de homologação para a Lu
- Abre no celular sem aplicativo e sem precisar criar conta?
- Consegue entrar usando o código enviado?
- Identifica as 12 músicas e sugere a sequência correta?
- Consegue reproduzir/pausar/voltar/avançar entre as amostras instrumentais?
- Entende onde aparecerão as letras e ilustrações das crianças?
- A página está confortável para ler e tocar em Android e iPhone?
- Consegue marcar o checklist e compartilhar a avaliação?

## Próxima etapa, após autorizações
- Confirmar autorização/legitimidade para uso das gravações e ilustrações, direitos de músicas, condições de retenção e retirada dos materiais.
- Confirmar títulos e ordem com a Lu e receber as letras e desenhos.
- Criar Supabase Storage **privado**, dados de projeto e rotas autenticadas de entrega de áudio; nunca usar pasta `public` para gravações de crianças.
- Substituir amostras instrumentais por reprodução segura dos 12 áudios aprovados e testar permissões com um usuário sem autorização.
- Gerar QR Codes somente depois de estabilizar o endereço definitivo que será impresso no livro; URLs de Preview não devem ser impressas.

## Higiene do ZIP de fontes
O ZIP completo do repositório usado como referência continha `.git`, `node_modules`, `.next` e `.env.local`. **Não compartilhe novamente `.env.local` ou tokens com terceiros.** Para futuras análises, gere pacotes de fontes sem estes diretórios/arquivos. Se algum segredo tiver sido divulgado além do ambiente de trabalho confiável, faça a rotação do segredo na origem.
