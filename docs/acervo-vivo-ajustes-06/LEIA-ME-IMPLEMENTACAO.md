# Tucxa — Acervo Vivo — Ajustes 06

Base recebida:
- branch: `feature/tucxa-acervo-vivo-ajustes-01`
- commit: `45b5760d5bf982996b453869c50ac2fcdce27fd8`

## Escopo implementado

1. Tela `Obrigado!` da reserva com apenas um botão `Fechar`.
2. Exemplares com status `reservado` ou `emprestado` deixam de aparecer como códigos disponíveis:
   - no detalhe do livro;
   - na busca por código;
   - na identificação do exemplar para empréstimo.
3. Livros dentro das Trilhas passam a mostrar:
   - quantidade total de exemplares;
   - quantidade de exemplares disponíveis.
4. Tela logada:
   - remove o card redundante `Trilhas`;
   - `Meus livros` passa a exibir empréstimos ativos e reservas ativas.
5. Cancelamento de reserva:
   - continua liberando o exemplar para a fila/próxima disponibilidade;
   - envia e-mail de cancelamento ao leitor;
   - envia e-mail aos mesmos responsáveis da Biblioteca usados nas notificações de reserva.

## Arquivos alterados

- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`
- `src/lib/organizacao-em-harmonia/acervo-vivo.ts`
- `src/lib/organizacao-em-harmonia/acervo-vivo-notifications.ts`

## Banco / Vercel

- nova migration Supabase: **não**
- nova tabela/coluna: **não**
- nova variável de ambiente: **não**
- novo cron: **não**
- alteração no `vercel.json`: **não**

## Validação já executada no pacote

Os quatro arquivos TS/TSX foram processados pelo parser/transpilador do TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo ainda devem ser executados:

```powershell
npm run lint
npm run build
```

## Homologação recomendada

1. Reserve um exemplar e confirme que a tela `Obrigado!` mostra apenas um `Fechar`.
2. Abra o mesmo título pelas Trilhas:
   - o exemplar reservado não pode aparecer em `Código disponível no armário`;
   - a Trilha deve mostrar o total de exemplares e os disponíveis.
3. Confirme o empréstimo da reserva e repita:
   - o exemplar emprestado continua sem aparecer como disponível.
4. Entre como Filho da Corrente:
   - não deve existir o card `Trilhas` duplicado;
   - `Meus livros` deve mostrar, por exemplo, `0 empréstimo(s) • 1 reserva(s)`.
5. Cancele uma reserva:
   - valide a liberação do exemplar/fila;
   - valide o e-mail do leitor;
   - valide o e-mail dos responsáveis da Biblioteca.
