# Memorias que Encantam - V14 - Educacao / Vozes 09

## Escopo

Ao tocar em FECHAR no player de uma cantiga individual, retornar ao dialogo **Escolha uma musica**, diretamente na pagina com a cantiga que estava sendo reproduzida (4 faixas por pagina). O ajuste vale tambem para a tecla Escape e para o clique no fundo do dialogo.

## Comportamentos preservados

- FECHAR na lista de musicas: retorna a pagina inicial do livro.
- FECHAR na playlist: retorna a pagina inicial do livro.
- FECHAR na galeria: retorna a pagina inicial do livro.
- FECHAR LEGENDA: fecha somente a tela ampliada CC; nao fecha o player, mantendo o audio em reproducao.
- Ao voltar a lista: pausar audio, invalidar pedidos pendentes de URL e nao manter CC aberto.
- O botao ja existente **Voltar a lista de musicas** continua funcionando.
- Entrada direta via QR (?musica=01...12) continua abrindo o player; FECHAR leva a lista da faixa exibida.

## Arquivos

- MODIFICADO `src/components/education/lu-music-experience.tsx`
- NOVO `docs/MEMORIAS_LU_V14_VOZES_09_RETORNO_A_LISTA.md`

Nenhuma alteracao em CSS, banco de dados, APIs, audio privado ou PDF. Sem nova migracao SQL.

## Instalacao segura

1. No worktree `C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias`, verificar branch `fix/memorias-lu-20261025-v1`.
2. Garantir que o arquivo `lu-music-experience.tsx` esteja sem modificacoes locais. Nao descartar outras alteracoes.
3. Colocar o ZIP de implementacao em `C:\Users\lacos\Documents\zips` e o instalador em `C:\Users\lacos\Documents\scripts`.
4. Executar o instalador PowerShell; ele confere hashes e realiza backup do arquivo existente.

## Validacao local

```powershell
cd "C:\Users\lacos\Documents\GitHub\automacao-extrema-memorias"
npm run lint
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

## Homologacao funcional

1. Abrir **Escolha uma musica**, tocar uma faixa da pagina 1, tocar FECHAR: retornar a pagina 1 da lista.
2. Ir a pagina 2, tocar faixa 5 a 8, FECHAR: retornar a pagina 2.
3. Ir a pagina 3, tocar faixa 9 a 12, FECHAR: retornar a pagina 3.
4. Em player individual: tecla Escape ou clique fora do dialogo tambem retorna a lista.
5. FECHAR na lista fecha a lista e retorna ao livro inicial.
6. Ouvir todas: FECHAR continua voltando ao livro inicial.
7. Galeria: FECHAR continua voltando ao livro inicial.
8. Abrir CC de uma cantiga aprovada: FECHAR LEGENDA nao encerra o player; FECHAR do player retorna a lista.
9. Testar um QR individual, uma playlist completa e as mudancas de faixa.
10. Verificar PDF de 14 paginas e QR Codes; nenhuma parte foi alterada.

## Publicar

Depois de validar localmente, adicionar SOMENTE os dois arquivos listados, realizar commit e push na `fix/memorias-lu-20261025-v1`. Homologar o deploy Preview da Vercel; abrir PR para `main` e verificar que nao existem mudancas de outras solucoes no diff. Fazer merge e verificar o deploy `Ready` de Production.

## Reversao

Se necessaria, antes do commit, restaurar o arquivo do backup gerado pelo instalador (na pasta `C:\Users\lacos\Documents\zips\backup-memorias-lu-vozes09-v14-...`). Apos publicar, usar o rollback do ultimo deployment estavel da Vercel. Nao ha migracao SQL para reverter.
