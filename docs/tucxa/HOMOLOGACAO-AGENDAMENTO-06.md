# Homologação — Tucxa Agendamento 06

## 1. Página pública

Acesse `/solucoes/organizacao-em-harmonia/agendamento` no celular.

- Confirme que `Por que usar`, `Horários`, `Agendamento` e `Ajuda` usam a mesma tipografia, tamanho, peso e formato.
- Confirme que `Agendamento` continua ressaltado ao abrir a página.
- Abra `Por que usar` e `Horários` e confirme o destaque da opção ativa.

## 2. Painel da Recepção

Acesse `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto`.

- O cabeçalho deve mostrar `Sair` e `Ajuda` lado a lado e com o mesmo padrão visual.
- Não deve existir uma mensagem fixa de `Agendamento criado` na página principal.

## 3. Agendar por data

Abra `Agendar`.

1. Selecione `Por data`.
2. Escolha uma data.
3. Pesquise uma pessoa pelo WhatsApp.
4. Escolha a Entidade.
5. Crie o agendamento.
6. O modal de Agendar deve fechar e limpar seus dados.
7. Deve abrir um novo popup `Agendamento criado` com os dados da reserva.
8. O popup deve permitir `Enviar confirmação pelo WhatsApp` e `Copiar link de confirmação`.
9. Se SMS não estiver configurado, não deve aparecer a mensagem `Provedor de SMS não configurado`.

Feche o popup de sucesso e abra `Agendar` novamente. O formulário deve estar vazio.

## 4. Agendar por Entidade

1. Abra `Agendar` e selecione `Por Entidade`.
2. Escolha uma Entidade.
3. O sistema deve localizar e mostrar a próxima data futura com vaga disponível.
4. Pesquise/selecione a pessoa e conclua o agendamento.

Teste também uma Entidade sem vagas no horizonte disponível: o sistema deve informar que não encontrou próxima data com vaga.

## 5. Busca por nome ou WhatsApp

- Pesquise por WhatsApp completo.
- Pesquise por nome parcial.
- Se houver uma única correspondência, ela deve ser selecionada.
- Se houver homônimos, deve aparecer uma lista com nome + WhatsApp para escolha.
- Pesquise um nome inexistente: o sistema deve orientar a informar um WhatsApp com DDD para criar novo cadastro.

## 6. Acolhimento

Abra `Acolhimento`.

Confirme os filtros:

- Todos
- Confirmar
- Chegou
- Não Chegou
- Cancelar

Para cada pessoa:

- As ações devem ficar recolhidas inicialmente.
- `Confirmar`, `Chegou`, `Não chegou`, `WhatsApp`, `Cancelar` e `Trocar Entidade` só devem aparecer após tocar em `Ações`.
- Em `Entidade / Dia`, o nome da Entidade não deve ser repetido abaixo do nome da pessoa.
- O horário `20:00` não deve aparecer nos cartões.

## 7. Paginação mobile

- O Acolhimento mostra até 4 pessoas por página.
- Com mais de 4 pessoas, aparecem `Anterior`, indicador de página e `Próxima`.
- Trocar data, visualização ou status reinicia a navegação para a primeira página.
