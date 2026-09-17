# Tucxa — Acervo Vivo — Ajustes 05

Base recebida:
- Branch: `feature/tucxa-acervo-vivo-ajustes-01`
- Commit: `a2f0357013952c9319c4dc5b021c252b0bf5823f`

## Implementado

1. **Homologação / Gestor Biblioteca**
   - A configuração **Oferecer homologação ao usuário após o empréstimo** passou a aparecer dentro do próprio painel/pop-up de Homologação.
   - O status aparece como **Habilitado/Desabilitado**.
   - A configuração pode ser salva diretamente nessa área.
   - O endpoint `save-settings` passou a preservar os demais parâmetros quando recebe uma atualização parcial.

2. **Reserva com exemplar disponível**
   - Texto alterado para deixar explícito que o exemplar disponível será reservado por `reservation_hold_days`.
   - Ao reservar, o exemplar continua sendo marcado imediatamente como `reservado`, portanto deixa de compor a quantidade disponível.
   - Foi adicionada uma tela **Obrigado!** para reserva confirmada e para entrada em fila.
   - A orientação de QR Code foi substituída por orientação compatível com exemplares ainda sem QR Code.

3. **Confirmação do empréstimo em Meus livros**
   - Reservas com status `disponivel` mostram o botão **Confirmar empréstimo**.
   - A confirmação transforma o exemplar reservado em emprestado, cria o empréstimo e marca a reserva como atendida.
   - O prazo de devolução começa nesse momento.
   - Depois da confirmação, abre a tela **Obrigado!** do empréstimo.
   - O fluxo respeita limite de empréstimos, cadastro válido, pendências e atrasos.

4. **E-mail da reserva**
   - Reservas prontas para retirada orientam o leitor a:
     1. entrar/logar no Acervo Vivo;
     2. abrir **Meus livros**;
     3. abrir **Reservas**;
     4. tocar em **Confirmar empréstimo** quando estiver com o exemplar em mãos.

5. **Expiração automática**
   - A reconciliação de reservas vencidas já existente agora também é executada no cron `acervo-vivo-reminders`.
   - O catálogo público também reconcilia reservas vencidas antes de calcular a disponibilidade.
   - Quando uma reserva pronta expira, ela é marcada como `expirada` e o exemplar é oferecido à próxima pessoa da fila; se não houver fila, volta para `disponivel`.

6. **Tela Obrigado**
   - Empréstimo direto mantém a tela **Obrigado!**.
   - Reserva agora também possui tela **Obrigado!**.
   - Confirmação de reserva em **Meus livros** termina na mesma tela **Obrigado!** de empréstimo.

## Arquivos alterados

- `src/app/api/cron/acervo-vivo-reminders/route.ts`
- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/app/api/organizacao-em-harmonia/site-tucxa/acervo-vivo/route.ts`
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-homologacao-manager.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`
- `src/lib/organizacao-em-harmonia/acervo-vivo-notifications.ts`
- `src/lib/organizacao-em-harmonia/acervo-vivo.ts`

## Banco / Vercel

- Migration nova: **não**
- `vercel.json`: **sem alteração**
- Nova variável de ambiente: **não**
- Novo cron: **não**
- O cron existente `/api/cron/acervo-vivo-reminders` passa a executar também a reconciliação de reservas vencidas.

## Validação realizada aqui

Os 9 arquivos TypeScript/TSX alterados foram submetidos ao parser/transpilador do TypeScript 5.8.3 sem erro de sintaxe.

No repositório completo, ainda execute:
- `npm run lint`
- `npm run build`
