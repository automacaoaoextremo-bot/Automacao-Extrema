# Tucxa — Acervo Vivo — Ajustes 07

Base recebida:
- branch: `feature/tucxa-acervo-vivo-ajustes-01`
- commit: `9efb6efdb2ee58f1fdb82d0526a8e0f7ae762c1d`
- working tree indicada no pacote: limpa

## Escopo implementado

### 1. Cancelamento de reserva pelo Gestor Biblioteca
Quando uma reserva é cancelada pela Gestão:
- a API identifica a pessoa logada que realizou o cancelamento;
- o e-mail enviado ao leitor informa o nome do responsável;
- informa o WhatsApp do responsável, quando cadastrado;
- o e-mail válido do responsável é colocado em CC na mensagem enviada ao leitor;
- os demais destinatários administrativos continuam recebendo a comunicação de gestão;
- o cancelamento feito pelo próprio leitor continua funcionando sem atribuir um Gestor.

### 2. Código da lombada na confirmação do empréstimo
Nos readers público e logado:
- o sistema escolhe explicitamente o exemplar que será emprestado;
- a tela `Confirmar empréstimo` mostra o código da lombada;
- o texto reforça que deve ser retirado exatamente o exemplar com aquele código;
- o `qrToken` desse exemplar específico é enviado à API, evitando divergência entre a mensagem mostrada e o exemplar registrado;
- em `Meus livros > Reservas`, a confirmação de retirada também mostra o código do exemplar reservado.

### 3. Inventário — Não encontrado
Na tela `Inventariar por categoria`:
- foi incluída a ação `Marcar como Não encontrado`;
- o exemplar permanece cadastrado no Acervo Vivo;
- `metadata.inventory_status` passa a ser `nao_encontrado`;
- se o exemplar estava `disponivel`, o estado de circulação passa para o estado já existente `perdido`, para que ele não continue sendo oferecido como disponível;
- o estado anterior é guardado em `metadata.inventory_previous_copy_status`;
- se o exemplar for localizado posteriormente e inventariado novamente, o estado anterior (`disponivel` ou `manutencao`) é restaurado;
- exemplares `emprestado` ou `reservado` não podem ser marcados como Não encontrado, pois estão em circulação.

## Banco de dados
Não foi necessária nova migration.

A migration inicial do Acervo Vivo já permite o estado `perdido` em `oh_acervo_copies.status`, e os dados específicos do inventário são gravados no campo JSONB `metadata`.

## Arquivos alterados
- `src/lib/organizacao-em-harmonia/acervo-vivo-notifications.ts`
- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`

## Validação realizada
Os cinco arquivos TS/TSX foram processados pelo parser/transpilador do TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo, execute obrigatoriamente:
```powershell
npm run lint
npm run build
```

## Homologação recomendada
1. Cancele uma reserva como Gestor Biblioteca.
2. Confira se o leitor recebe o nome e WhatsApp de quem cancelou.
3. Confira se o e-mail do Gestor aparece em CC.
4. Faça um empréstimo direto/self-service com mais de um exemplar disponível.
5. Confirme que a tela mostra o código exato da lombada e que o mesmo exemplar é registrado.
6. Em uma reserva pronta, abra `Meus livros > Reservas` e confira o código antes de confirmar o empréstimo.
7. No Inventário, marque um exemplar disponível como `Não encontrado`.
8. Confira se ele deixa de ser oferecido como disponível no leitor.
9. Volte ao Inventário, localize o mesmo exemplar, confira o QR e confirme o inventário.
10. Confira se ele volta à situação anterior.
