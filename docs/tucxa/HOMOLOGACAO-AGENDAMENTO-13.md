# Homologação — TUCXA Agendamento 13

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Data no BotConversa

1. Mantenha o campo `TUCXA - Data atendim` como tipo **Data** no BotConversa.
2. Crie um novo agendamento para um WhatsApp de teste.
3. Confirme que o fluxo `TUCXA - Confirmar Agendamento` exibe a data no formato `DD/MM/AAAA`.
4. Confirme que Nome, Entidade e Link continuam preenchidos normalmente.
5. Faça também um teste do fluxo de lembrete e do aviso à Recepção para garantir que o mesmo campo de data continua sendo atualizado.

## 2. Configurações da Recepção

1. Abra **Configurações**.
2. Confirme que o quadro informativo verde sobre visualização por Data/Entidade e Entidade padrão não aparece mais.
3. Confirme que Ordem dos atendimentos, lembretes, abertura automática do Acolhimento e resumo continuam funcionando.

## 3. Aviso de confirmação para a Recepção

1. Confirme um agendamento pelo link enviado ao Consulente.
2. O WhatsApp da Recepção deve receber o fluxo `TUCXA - Recepção - Confirmação`.
3. O campo usado como link deve conter exatamente:
   `https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/agendamento/login`
4. Confirme que não há token de confirmação nem `returnTo` nesse link.

## 4. Entidade padrão no Agendar

1. Em **Cadastros → Consulentes**, escolha um Consulente e defina uma Entidade padrão.
2. Abra **Agendar → Por data**.
3. Escolha uma data em que a Entidade padrão tenha vaga.
4. Localize o mesmo Consulente por nome ou WhatsApp.
5. Ao selecionar a pessoa, o campo **Entidade** deve ser preenchido automaticamente com a Entidade padrão.
6. Repita com outro Consulente sem Entidade padrão: o campo deve permanecer sem seleção.
7. Repita com uma data em que a Entidade padrão não tenha vaga: o sistema não deve selecionar uma opção indisponível.

## 5. Seleção alfabética de Consulentes

1. Abra **Agendar**.
2. Confirme que, além da busca por nome/WhatsApp, aparece **Ou escolha pela inicial**.
3. Confirme que são exibidas somente letras que possuem Consulentes ativos elegíveis.
4. Toque em uma letra, por exemplo `R`.
5. Deve abrir um popup com os nomes e WhatsApps dos Consulentes daquela inicial, em ordem alfabética.
6. Toque em uma pessoa.
7. O popup deve fechar, o cadastro deve ser selecionado e a Entidade padrão deve ser aplicada quando houver uma disponível para a data.

## 6. Agendamento iniciado pela agenda da Entidade

1. Abra **Entidades**.
2. Escolha uma Entidade e toque **Agendar**.
3. Selecione uma data disponível.
4. No modal seguinte, confirme que **não** aparecem os botões `Por data` e `Por Entidade`.
5. Confirme que a Entidade e a data já escolhidas aparecem como contexto fixo.
6. Escolha o Consulente por busca ou pela seleção alfabética.
7. Finalize o agendamento e valide o envio BotConversa normalmente.

## 7. Regressão

- Criar agendamento continua gerando confirmação.
- Acolhimento, cancelamento, chegada e indicadores continuam funcionando.
- `Cadastro pessoal` continua abrindo o fluxo de atualização dos próprios dados.
- O aviso à Recepção continua sendo secundário: falha no BotConversa não desfaz a confirmação do Consulente.
