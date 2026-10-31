# Memórias que Encantam — Educação–Vozes 08 — V13

**Branch de desenvolvimento:** `fix/memorias-lu-20261025-v1`  
**Escopo:** duas correções CSS na página pública da Professora Lu.

## 1. O que mudou

1. **Home mobile — "Feito com carinho"**: reexibe o quadro que havia sido ocultado intencionalmente no ajuste anterior (`display: none`). Mantém dimensões compactas e permite rolagem natural quando a altura da tela é pequena ou o usuário aumenta a fonte.
2. **Tela de legendas CC**: sobe sua camada para `z-index: 6000`, acima da janela do player (`.lu-dialog-backdrop` com `z-index: 5000`). A tela de legendas continua a ser exibida somente quando existe uma letra sincronizada, aprovada e disponível pelo endpoint público.

**Nenhuma outra alteração:** não mexe em áudio, supabase, APIs, autorização, textos de letras, PDF ou QR Codes. Nenhuma migration SQL é necessária.

## 2. Instalação local

Salve:
- `C:\Users\lacos\Documents\zips\memorias-lu-vozes-08-v13-correcao-css.zip`
- `C:\Users\lacos\Documents\scripts\instalar_memorias_lu_vozes_08_v13.ps1`

No PowerShell:

```powershell
cd 'C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias'
git fetch origin
git branch --show-current
git status --short
# Somente se o worktree estiver limpo:
git pull --ff-only origin fix/memorias-lu-20261025-v1
git merge --ff-only origin/main

powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\lacos\Documents\scripts\instalar_memorias_lu_vozes_08_v13.ps1'
```

O instalador recusa branch incorreta, Git com alterações locais ou arquivos com hash inesperado. Copia os arquivos originais para backup no diretório de ZIPs antes de substituí-los. Não faz commit, não publica e não toca no banco.

## 3. Validação

```powershell
npm run lint
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

Homologação no navegador desktop e no celular:
- Na página inicial, o quadro `💚 Feito com carinho` deve estar visível, abaixo de "Desenhos da nossa turma".
- Em cantiga com letra aprovada e marcadores de tempo (por exemplo, Borboleta Eufrídia), o botão CC abre uma tela **na frente** do player; clique em fechar e volte à música normalmente.
- Teste CC e saída da tela em retrato e paisagem; verifique controles de play/pause e barra de progresso.
- Em cantiga sem letra aprovada, botão CC não deve aparecer.
- Confira playlist, desenhos, PDF 14 páginas e links QR, sem publicar letras não revisadas.
- Em telas muito pequenas ou zoom de acessibilidade, rolagem é permitida para não cortar conteúdo.

## 4. Git, Vercel Preview e main

```powershell
git add -- 'src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css' 'docs/MEMORIAS_LU_V13_VOZES_08_CORRECOES_MOBILE_CC.md'
git diff --cached --name-status
git diff --cached --check
git commit -m 'fix(memorias-lu): restaurar nota mobile e sobrepor CC'
git push -u origin fix/memorias-lu-20261025-v1
```

Verifique o deployment **Preview** da branch na Vercel: status `Ready` e testes da seção 3. Abra Pull Request `fix/memorias-lu-20261025-v1` → `main` no GitHub. Revise `Files changed` (esperados somente CSS e este documento), faça merge após aprovar, confirme Production `Ready` e execute o checklist no site oficial. O merge não substitui outros trabalhos em `main` quando o PR está atualizado e revisado.

## 5. Recuperação

Se falhar antes do commit: restaure o CSS do backup criado pelo instalador e remova apenas este documento se necessário. Não use `git reset --hard` nem `git clean -fd` para recuperar arquivos indiscriminadamente.

Após merge em Production, utilize o rollback da Vercel para o último deployment saudável; corrija o CSS em nova alteração e publique novamente. Sem migração SQL a reverter.
