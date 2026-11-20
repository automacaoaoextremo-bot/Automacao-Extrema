# Memorias que Encantam — V16: cabeçalho Lu, Fafa e Tia Manu

## Escopo

No componente compartilhado do cabeçalho, a segunda linha foi alterada de **Projeto da Lu • 2026** para **Lu • Fafa • Tia Manu • 2026**. A identificação completa das educadoras está no atributo `title`: professoras Lu e Fafa e Tia Manu.

O CSS adiciona somente uma classe de formatação responsiva (`lu-project-credits`) para a segunda linha. A primeira linha, o botão Docentes, a faixa "Desenvolvido por" e o logo da Automação Extrema permanecem intactos.

A mudança alcança as páginas que compartilham `LuHeader`, incluindo a área pública e as telas docentes. Não altera bancos de dados, PDFs, QR Codes, gravações, legendas ou regras de autorização.

## Arquivos

- `src/components/education/lu-header.tsx` — componente completo atualizado.
- `src/app/solucoes/memorias-que-encantam/livro/lu-2026/lu-music.css` — folha completa atualizada.
- `docs/MEMORIAS_LU_V16_CABECALHO_LU_FAFA_MANU.md` — este documento.

## Instalação e validação

Utilize o instalador PowerShell entregue com o pacote, na branch `fix/memorias-lu-20261025-v1`. Ele confere os hashes da versão enviada pelo usuário (inclusive se o worktree tinha alterações locais), salva os arquivos anteriores em uma pasta de backup e substitui apenas os dois arquivos da V16.

Com os arquivos instalados, execute na raiz do repositório:

```powershell
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Teste no navegador e em celular com larguras próximas de 320, 360, 390 e 430 px. Confirme que os quatro nomes/indicadores (Lu, Fafa, Tia Manu, 2026) ficam legíveis, o botão Docentes funciona e a faixa do logo continua inteira. Em dispositivos estreitos, a linha pode quebrar naturalmente sem sobreposição.

## GitHub / Vercel

Não execute `git add .`. Inclua apenas os dois arquivos atualizados e este documento. Confira `git diff --cached --name-status` antes do commit e push. Homologue o deployment Preview da branch e crie PR com `base: main` e `compare: fix/memorias-lu-20261025-v1`. O PR deve conter somente os arquivos esperados. Não é necessária migração SQL.

O manifesto da coleta recebida registrava `has_local_changes: true`. Antes de sincronizar novamente a branch ou executar qualquer merge, confira e proteja quaisquer alterações locais pendentes. Não utilize `git reset --hard` nem `git clean -fd`.
