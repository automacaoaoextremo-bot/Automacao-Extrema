# Tucxa — Acervo Vivo — Ajustes 08

Base recebida:
- branch: `feature/tucxa-acervo-vivo-ajustes-01`
- commit: `5236cbe14a0de24f4c2255af5ac6427ec97eec74`
- working tree indicada pelo pacote: limpa

## Implementado

### 1. Contatos clicáveis no e-mail de cancelamento
Quando uma reserva foi cancelada por outra pessoa:
- o e-mail do responsável continua visível;
- o e-mail virou link `mailto:`;
- o WhatsApp virou link `wa.me`;
- o HTML do e-mail mostra os botões `Enviar e-mail` e `Falar pelo WhatsApp`;
- o texto simples do e-mail continua trazendo os dados de contato.

### 2. Inventário reorganizado como fluxo
A área Inventário passa a orientar:
1. Criar novo inventário;
2. Selecionar/continuar inventário em andamento;
3. Conferir por categoria;
4. Conferir por código/QR;
5. Revisar/concluir;
6. Consultar histórico.

As conferências feitas por categoria e por código passam a ser vinculadas ao inventário selecionado.

### 3. Base congelada e exemplares novos
Ao criar um inventário:
- o sistema grava, em `metadata`, a lista de exemplares que compõem a base inicial;
- esta base não cresce retroativamente;
- exemplares cadastrados depois do início não alteram a quantidade esperada.

No cadastro de um exemplar:
- se houver inventários abertos, é possível associar opcionalmente o exemplar a um deles;
- nesse caso o exemplar é registrado como `adicionado durante o inventário`;
- ele fica associado à sessão por `oh_acervo_inventory_scans`;
- ele não entra na base esperada daquela contagem.

Não foi necessária nova tabela ou migration: a estrutura atual de `oh_acervo_inventory_sessions.metadata` e `oh_acervo_inventory_scans` já comporta a regra.

### 4. Inventário por categoria associado à sessão
`inventory-copy` e `inventory-copy-not-found` agora aceitam `sessionId`.
- exemplar encontrado: gera/atualiza o scan daquela sessão;
- exemplar `Não encontrado`: fica registrado no metadata da sessão;
- se for localizado depois, sai da lista de `Não encontrado`.

### 5. Revisão e encerramento
Ao concluir um inventário o resumo separa:
- base esperada;
- itens da base conferidos;
- faltantes;
- explicitamente `Não encontrado`;
- ainda pendentes;
- novos exemplares adicionados durante a contagem.

### 6. Atualização dos dados do exemplar sem alongar a tela
Na tela compacta do exemplar foram incluídos pop-ups para:
- Localização;
- Estado físico;
- Dados do exemplar;
- Dados do livro;
- QR Code já permanece em ação própria.

Os campos de circulação (reservado, emprestado etc.) não são editados manualmente nesses pop-ups; continuam sob controle dos fluxos de reserva/empréstimo.

### 7. Atualização parcial segura
A ação `update-copy` foi alterada para atualização parcial.
Isso evita que editar apenas a localização, por exemplo, apague ou redefina outros campos do exemplar.

## Arquivos alterados
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/lib/organizacao-em-harmonia/acervo-vivo-notifications.ts`

## Banco / Vercel
- nova migration Supabase: **não**
- nova tabela: **não**
- nova coluna: **não**
- nova variável Vercel: **não**
- novo cron: **não**
- alteração em `vercel.json`: **não**

## Validação feita no pacote
Os 3 arquivos TS/TSX foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.
Também foi executada verificação equivalente a `git diff --check` nos três arquivos.

No repositório completo, execute obrigatoriamente:
```powershell
npm run lint
npm run build
```

## Homologação sugerida
1. Cancele uma reserva como Gestor Biblioteca e confira os dois botões do e-mail.
2. Crie um inventário com nome identificável.
3. Confira a quantidade base inicial.
4. Selecione o inventário.
5. Confira um exemplar por categoria.
6. Confira outro por código/QR.
7. Marque um terceiro como Não encontrado.
8. Cadastre um exemplar novo e associe-o ao inventário aberto.
9. Confira que a base esperada não aumentou e que o novo item aparece separado.
10. Abra um exemplar no inventário e edite Localização, Estado físico, Dados do exemplar e Dados do livro pelos pop-ups.
11. Revise e conclua o inventário.
12. Confira o resumo no Histórico.
