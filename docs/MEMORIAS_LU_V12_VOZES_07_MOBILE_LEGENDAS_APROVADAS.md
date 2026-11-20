# Memórias que Encantam — V12 / Educação–Vozes 07

Data: 31/10/2026  
Branch de desenvolvimento: `fix/memorias-lu-20261025-v1`  
Worktree: `C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias`

## Objetivos implementados

1. Página pública compacta em celular: cabeçalho, hero e cartões menores; sem espaços distribuídos artificialmente. O aviso final "Feito com carinho" é omitido somente no mobile, porque a mensagem já existe no hero. Em telas muito pequenas, a página **pode continuar rolando** para não cortar conteúdo nem prejudicar acessibilidade.
2. O botão CC aparece apenas quando **a API pública retorna letra autorizada pela docente com ao menos uma marcação de início `[mm:ss]`** e a cantiga tem gravação real disponível. Letra pendente/não publicada não aparece; letra aprovada sem marcação continua legível em "Ver desenhos e letras", sem opção de sincronização.
3. O CC abre diretamente uma tela sobreposta de tamanho de viewport, com trecho anterior, atual e seguinte, controles de reprodução e barra de progresso; o documento de fundo não precisa rolar. Fechar legenda não interrompe a música. Em telas extremas, apenas a área de texto pode rolar para garantir que uma frase longa nunca seja cortada.
4. Segurança: `api/auto-captions` GET e POST agora exigem sessão docente. Transcrições automáticas brutas não são liberadas às famílias, nem enviadas ao player público. A autorização para publicação das legendas continua em `ae_education_track_lyrics.is_published`.
5. Preservados: 12 gravações, QR Codes, PDF de 14 páginas, galeria, playlist, curadoria e acesso docente. Sem migração SQL nova. Sem chave da OpenAI para exibir legendas previamente aprovadas.

**Observação importante:** a aprovação de legendas manuais V10/V12 é por cantiga, não por versão de áudio; se a professora mudar a versão selecionada, será preciso rever os tempos. A geração automática V11 continua disponível **somente na API docente** para eventual revisão futura e não é exigida para a exibição das letras autorizadas.

## 1. Preparar branch sem perder trabalho

Abra PowerShell:

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias"
git fetch origin
git branch --show-current
git status --short
```

É obrigatório estar em `fix/memorias-lu-20261025-v1` e não ter alterações locais. Se houver alterações, guarde-as/registre-as antes de prosseguir. Não use `git reset --hard` nem `git clean -fd`.

```powershell
git pull --ff-only origin fix/memorias-lu-20261025-v1
git merge --ff-only origin/main
git status --short
```

O `--ff-only` vai parar se a integração não for linear; não tente forçar conflitos.

## 2. Instalar com backup

Salve em:
- `C:\Users\lacos\Documents\zips\memorias-lu-vozes-07-v12-implementacao.zip`
- `C:\Users\lacos\Documents\scripts\instalar_memorias_lu_vozes_07_v12.ps1`

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "C:\Users\lacos\Documents\scripts\instalar_memorias_lu_vozes_07_v12.ps1"
```

O instalador verifica a branch, a árvore limpa do Git, os arquivos base por SHA-256 e os novos arquivos por SHA-256; cria backup na pasta de zips e **não executa commit, SQL nem deploy**. Interrompe se os arquivos de origem diferirem das fontes fornecidas no ZIP de 31/10/2026; nesse caso não sobrescreva manualmente.

## 3. Testar localmente

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias"
node --version
npm ci
npm run lint
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

Use a versão Node 24.x declarada no `package.json` e continue **somente** com todos os testes aprovados. Aqui foram realizados checks de sintaxe TypeScript e consistência do pacote, não build com Next.js e credenciais de projeto.

Para testar em navegador local (se `.env.local` estiver configurado): `npm run dev` e abra `http://localhost:3000/solucoes/memorias-que-encantam/livro/lu-2026`.

## 4. Checklist de homologação

- Mobile: testar com Chrome Android e Safari iPhone; 360×640, 390×844 e telefone de pouca altura, zoom do sistema e teclado. Mostrar cartões com menos espaço; não truncar botões. Em aparelhos muito pequenos a página pode rolar.
- Cantiga sem legenda aprovada: **não** mostrar CC, nem "Legendas automáticas ainda não habilitadas".
- Cantiga com letra `is_published = true` e tempos `[mm:ss]`: mostrar CC; ao tocar, abrir tela inteira; áudio continua, pausa e avanço/retrocesso sincronizam trecho atual.
- Tela ampliada: deve caber sem rolagem da página, com controles acessíveis; fechar legenda mantém o áudio.
- Playlist: músicas com e sem legenda; ao trocar a gravação, fechar/limpar a legenda anterior.
- Testar rascunhos importados por V12: enquanto `is_published=false`, o público não vê CC. **Não autorize textos automaticamente**; a Lu deve revisar e autorizar previamente, além de verificar direito de exibição das letras.
- Segurança: GET e POST `/api/auto-captions?versionId=<UUID_REAL>` sem sessão docente devem retornar HTTP 401, inclusive com as flags de transcrição externa habilitadas.
- Regressão: área Docentes, PDF 14 páginas, 12 QR Codes, desenhos, upload e curadoria, playlist, áudio celular e desktop.

## 5. GitHub: commit e push somente desta solução

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias"
git add -- "src/components/education/lu-music-experience.tsx" `
  "src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css" `
  "src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/auto-captions/route.ts" `
  "docs/MEMORIAS_LU_V12_VOZES_07_MOBILE_LEGENDAS_APROVADAS.md"
git diff --cached --name-status
git diff --cached --check
git commit -m "fix(memorias-lu): compactar mobile e exibir apenas legendas aprovadas"
git push -u origin fix/memorias-lu-20261025-v1
```

Se `git diff --cached --name-status` apresentar arquivos fora dos quatro listados, **não faça o commit** antes de conferir.

## 6. Vercel Preview, PR e Production

1. Em Vercel → Deployments, selecione o Preview desse commit (`fix/memorias-lu-20261025-v1`); status `Ready` e testes do checklist aprovados.
2. Preview pode apontar para o mesmo banco de produção: **não publique letras de teste** em dados reais. A aplicação desta versão não necessita SQL novo.
3. Abra PR em `https://github.com/automacaoaoextremo-bot/Automacao-Extrema/pulls`: **base `main`**, compare **`fix/memorias-lu-20261025-v1`**.
4. Revise `Files changed`: apenas os quatro arquivos previstos; mantenha a `main` atualizada para não sobrescrever evoluções do TUCXA. Use `Merge pull request` (merge commit) após Preview aprovado.
5. Confirme o novo Vercel Production deployment vinculado à `main`, com status `Ready`.
6. Verifique `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026` e faça smoke test TUCXA, livro PDF e legendas aprovadas.

## 7. Rollback

Se qualquer teste falhar antes do commit, utilize o backup que o instalador criou; não descarte outras mudanças. Se falhar após Production, faça rollback para o deployment saudável anterior na Vercel. Não exclua as tabelas V10/V11 ou mídias do Supabase; não há migração nova nesta versão.
