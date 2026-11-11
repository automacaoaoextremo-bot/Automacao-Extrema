# Memórias que Encantam — V15 | PDF para impressão (2 p.) e completo (14 p.)

## Objetivo
Disponibilizar no painel Docentes duas opções de download A4, após validação com as educadoras:

- **Impressão, 2 páginas:** apresentação com QR do livro digital e índice com os 12 QR Codes das cantigas. A geração não busca ilustrações; exige autenticação docente e projeto com mídia autorizada.
- **Completo, 14 páginas:** as duas páginas acima mais uma página por cantiga com ilustração aprovada; mantém a obrigatoriedade de liberação das ilustrações.

Nas duas edições, a apresentação e o rodapé identificam **Professora Lu, Professora Fafa e Tia Manu** e apresentam **Desenvolvido por** com o logo horizontal original da Automação Extrema. O logo foi incorporado ao código servidor, a partir de `public/ae-logo-horizontal.png`, para evitar dependência de leitura de arquivos estáticos no runtime da Vercel.

## Arquivos da implementação

- `src/lib/education/lu-book-pdf.ts` — seleção da edição, rodapé, créditos, marca e numeração.
- `src/lib/education/lu-pdf-branding.ts` — bytes JPEG RGB do logo oficial existente no projeto, reutilizados como XObject no PDF.
- `src/app/solucoes/memorias-que-encantam/livro/lu-2026/api/livro/pdf/route.ts` — `?paginas=2` ou `?paginas=14` (sem parâmetro preserva 14); autenticação docente e bloqueios de liberação.
- `src/components/education/lu-curation.tsx` — botões distintos de download.

## Segurança e compatibilidade

1. Não altera SQL, banco de dados, gravações, desenhos privados, a curadoria de letras nem QR Codes permanentes.
2. O endpoint exige `hasLuAdminAccess()`. Em caso de formato inválido retorna 400; falta de autorização das mídias retorna 409.
3. A versão de 2 páginas não exige que as 12 ilustrações estejam liberadas; a versão completa exige.
4. URLs dos QR Codes permanecem `https://www.automacaoextrema.com/solucoes/memorias-que-encantam/livro/lu-2026` e o mesmo endereço com `?musica=ID`.
5. A autorização para compartilhamento deve estar válida. Antes de imprimir, escaneie todos os códigos e confirme a abertura das músicas.
6. A mudança de nomes vale somente para PDFs; não altera os nomes exibidos no cabeçalho do site ou no cadastro das docentes.

## Validação local obrigatória

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

No painel Docentes, gerar os arquivos de 2 e 14 páginas e verificar: A4, tamanhos esperados, conteúdo, marca visível, créditos com nomes exatos, página inicial, índice, imagens aprovadas, texto e 13 QR Codes. Confirmar que `?paginas=3` é rejeitado e que o download depende de login docente.

## Deploy

Faça commit e push somente da V15 na branch `fix/memorias-lu-20261025-v1`, homologue na Vercel Preview, revise `Files changed` no PR para `main`, efetue merge só depois de validação e confirme o deployment Production Ready. Não executar migrações SQL para esta versão.
