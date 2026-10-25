# Automação Extrema — Memórias que Encantam — Ajustes 05 / V7

Branch de destino: `fix/memorias-lu-20261025-v1`.
Base analisada: `1d45b41f20f7d55dd4ae39e8bbc3810ce64e67c5` (ZIP `memorias-lu-ajustes-05-fontes-20261025-155605.zip`).

## Alterações

- A frase “Feita para ouvir e cantar em família!” abre uma linha própria na apresentação do livro.
- Lista de reordenação das 12 músicas ficou mais compacta e continua rolável em aparelhos menores.
- Todos os botões FECHAR de modais da solução têm fundo verde e texto branco, inclusive em telas menores.
- Botão de ajuda de gravações recebeu o padrão visual de cartão e subtítulo “CLIQUE PARA ABRIR”.
- QR Codes passaram a ter uma etapa de revisão na própria janela modal: título, código e endereço exato, com anterior/próxima na opção de 12 músicas, antes de salvar o PDF.
- PDFs passam a imprimir também o endereço de destino (além do QR), facilitando verificação antes da impressão.

## Segurança e escopo

- Não foi alterada qualquer API de autenticação, upload, armazenamento, liberação de vozes ou permissão administrativa.
- Não há novas variáveis Vercel, bibliotecas npm ou migrações Supabase.
- O endereço dos QR Codes continua permanente no domínio `www.automacaoextrema.com`, com parâmetros `musica=ID` para cada canção.
- O link no Preview aponta para Production; o QR final deve ser revalidado quando a V7 estiver publicada.
- A prévia é uma representação digital do QR Code; o PDF final inclui elementos adicionais de impressão. Abra e confira o PDF antes de imprimi-lo.
- Aparelhos menores ou configurações com fontes ampliadas podem exigir rolagem na janela de reordenação.

## Instalação

1. Salve o ZIP em `C:\Users\lacos\Documents\zips` e o instalador em `C:\Users\lacos\Documents\scripts`.
2. Confira `git branch --show-current` e `git status` no worktree `automacao-extrema-memorias`.
3. Execute o instalador, que verifica SHA256 dos arquivos originais e novos, faz backup e aplica os 5 arquivos somente na branch correta.
4. Valide com `npx eslint src/components/education src/lib/education src/app/solucoes/memorias-que-encantam`, `npx tsc --noEmit` e `npm run build` (Node 24).
5. Teste a interface no celular: frase nova, 12 itens, todos FECHAR, ajuda e revisões de QR geral, individual e lote de 12.
6. Faça commit e push apenas dos 5 caminhos do manifesto; confira Preview Ready e homologue.
7. Atualize a branch com a `origin/main` mais recente se ela tiver avançado; reexecute os testes e crie PR `fix/memorias-lu-20261025-v1` → `main`.
8. Após aprovação faça merge; confira deployment Production Ready e teste QR Codes no domínio permanente.

## Recuperação

O instalador grava backup dos arquivos anteriores em `C:\Users\lacos\Documents\zips\backup-memorias-lu-pre-v7-<data>`.
Não use `git reset --hard` ou `git clean -fd` para descartar alterações locais.

## Testes nesta entrega

A sintaxe dos três arquivos TS/TSX foi verificada com o parser do TypeScript. A instalação npm e o build completo não puderam ser concluídos neste ambiente (Node 22; o projeto exige Node 24). Não publique sem confirmar ESLint, TypeScript e build no Windows.
