# Bingo do TUCXA — Ajustes 02 (02/11/2026)

## Objetivo

Adaptação da página pública do Bingo do TUCXA com base no documento **OeH -Tucxa-Bingo-02**:

- manter apenas a linha de identificação do TUCXA e a faixa "Desenvolvido por"; remover o menu/terceira linha **somente nessa página**;
- remover "Cliente Fundador" da página pública do Bingo do TUCXA;
- primeira tela mobile com mensagem direta, 3 botões e conteúdo principal acessível sem precisar descer a página na maioria dos celulares usuais;
- botão "Doar prenda" na primeira linha do cabeçalho e outro no destaque central, usando WhatsApp **(19) 98904-5150**;
- manter a comunicação centrada em convivência, alegria, acolhimento e contribuição, sem alegar que há vendas liberadas ou próximo evento confirmado.

## Arquivos completos entregues

1. `src/app/solucoes/bingo-no-controle/cliente/tucxa/page.tsx` — substituição integral da página pública.
2. `src/app/solucoes/bingo-no-controle/cliente/tucxa/bingo-tucxa-home.tsx` — novo componente client-side: CTAs e janelas de conteúdo, sem rolagem para acessar o essencial.
3. `src/components/organizacao-em-harmonia/tucxa-public-header.tsx` — alteração **aditiva e opcional**: prop `topAction`. Sem mudanças no comportamento das outras páginas que usam o cabeçalho.
4. `docs/bingo-no-controle/AJUSTES-BINGO-02-20261102.md` — esta documentação.

**Não há migrations nem alterações de banco.** A página administrativa, a autenticação e os dados históricos ficam intactos.

## Instalação no Windows

### 1) Conferir a branch

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema"
git branch --show-current
git status
```

A branch deve ser `feature/bingo-no-controle-cliente-fundador-tucxa-v1`.
Se existir trabalho local sobre qualquer arquivo dos itens 1–3, não sobrepor antes de salvá-lo e comparar diferenças.

### 2) Criar backup local dos arquivos existentes (fora do repositório)

```powershell
$repo = "C:\Users\lacos\Documents\GitHub\automacao-extrema"
$backup = "C:\Users\lacos\Documents\backups\bingo-fontes-02-20261102"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item -LiteralPath "$repo\src\app\solucoes\bingo-no-controle\cliente\tucxa\page.tsx" -Destination "$backup\page-antes-bingo02.tsx"
Copy-Item -LiteralPath "$repo\src\components\organizacao-em-harmonia\tucxa-public-header.tsx" -Destination "$backup\tucxa-public-header-antes-bingo02.tsx"
```

### 3) Extrair ZIP

```powershell
$zip = "C:\Users\lacos\Documents\zips\bingo-no-controle-tucxa-ajustes-02-20261102.zip"
Expand-Archive -LiteralPath $zip -DestinationPath $repo -Force
cd $repo
```

O ZIP já tem caminhos relativos à raiz do repositório (`src/...` e `docs/...`); não há pasta extra `automacao-extrema` no pacote.

## Homologação local

```powershell
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

O usuário deve executar esses comandos no repositório completo; os fontes fornecidos são um subconjunto do projeto. Os três TSX passaram pela verificação de sintaxe local, mas isso **não substitui** o lint ou build do projeto completo.

Abra o servidor para teste manual:

```powershell
npm run dev
```

Rota: `http://localhost:3000/solucoes/bingo-no-controle/cliente/tucxa`

**Checklist manual:**

- Conferir no celular (DevTools em 360 × 640 e 390 × 844) e desktop.
- Cabeçalho com **duas linhas**: TUCXA + botão de doação, depois crédito à Automação Extrema; sem terceira linha.
- Nenhuma ocorrência de "Cliente fundador" na página do Bingo do TUCXA.
- Três botões visíveis na primeira tela: "Por que participar", "Próximo bingo", "Quero doar uma prenda". Telas excepcionalmente pequenas ou zoom de acessibilidade podem demandar rolagem natural, sem esconder conteúdo.
- Ao tocar nos dois primeiros botões, abrir conteúdo sobre os benefícios e o próximo evento, sem inventar data nem ativar vendas.
- Fechar as janelas por botão "Fechar" e tecla Escape.
- Doação nos dois locais abre WhatsApp **5519989045150**, com texto pré-preenchido; não envia mensagem automaticamente.
- Links "Histórico dos bingos", "Área administrativa" e logo TUCXA abrem as rotas existentes.
- Conferir outras páginas do TUCXA que reutilizam `TucxaPublicHeader`, garantindo que os menus existentes não mudaram.

## Commit exclusivo na branch do Bingo

```powershell
git branch --show-current
git status
git add -- `
  "src/app/solucoes/bingo-no-controle/cliente/tucxa/page.tsx" `
  "src/app/solucoes/bingo-no-controle/cliente/tucxa/bingo-tucxa-home.tsx" `
  "src/components/organizacao-em-harmonia/tucxa-public-header.tsx" `
  "docs/bingo-no-controle/AJUSTES-BINGO-02-20261102.md"
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "feat(bingo-no-controle): otimiza home mobile e doacao de prendas TUCXA"
git push origin feature/bingo-no-controle-cliente-fundador-tucxa-v1
```

Não usar `git add .` ou incluir arquivos privados/temporários. Em caso de conflitos com mudanças locais ou da branch, resolver e validar antes do commit.

## Preview na Vercel

- Após push, abrir **Vercel > Deployments** e selecionar o Preview `Ready` da branch do Bingo.
- Repetir checklist manual em dispositivo real ou modo responsivo e conferir que o Preview continua apontando para Supabase de homologação no painel administrativo.
- A página pública alterada não precisa das credenciais Supabase. Esta entrega não exige variáveis ou migrations novas.

## Publicar em produção

1. Confirmar que a branch está revisada contra a `main`, considerando também as alterações **anteriores** já existentes na branch.
2. Verificar as variáveis `NEXT_PUBLIC_BNC_ENV`, `NEXT_PUBLIC_BNC_SUPABASE_URL` e `NEXT_PUBLIC_BNC_SUPABASE_ANON_KEY` nos ambientes Preview/Production; não trocar o Supabase de outras soluções.
3. Abrir PR de `feature/bingo-no-controle-cliente-fundador-tucxa-v1` para `main`; revisar **Files changed** e eventuais conflitos com outras soluções.
4. Fazer merge somente após aprovação do Preview, dos testes de autenticação/RLS do administrativo e da revisão do PR.
5. Esperar Vercel Production `Ready`, testar a página pública e o WhatsApp, a área administrativa, o histórico e fluxos essenciais das outras soluções da Automação Extrema.
6. Se houver regressão de frontend, usar o rollback de deployment da Vercel ou `git revert` do commit de merge conforme o procedimento da equipe. Esta entrega não tem alteração de banco.

## Segurança e escopo

- O botão do WhatsApp é uma **intenção de doação de prendas**, não mecanismo de pagamento ou emissão de cartelas.
- O número informado no documento é `19 98904-5150` (formato da URL: `5519989045150`).
- O catálogo de prêmios, as datas do próximo evento e as vendas permanecem **em preparação**.
- Não mexer nas migrations V1/V04/V05 nem reimportar o histórico já validado.
