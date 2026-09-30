# Homologação — Tucxa Agendamento 07

## 1. Página pública

- Abrir `/solucoes/organizacao-em-harmonia/agendamento` no celular.
- Confirmar que `Por que usar`, `Horários`, `Agendamento` e `Ajuda` usam exatamente o mesmo padrão compacto da terceira linha da página principal do Tucxa.
- Confirmar que `Agendamento` permanece destacado ao abrir a página.

## 2. Como funciona

Confirmar os textos:

- Agendamento: Recepção localiza/cadastra o Consulente e cria reserva por Data ou Entidade.
- Confirmação: Consulente confirma pelo link recebido, até 16:00 do dia do atendimento.
- Chegada: 18:30–19:20; porta fecha às 19:20.
- Ordem: acolhimento por ordem de agendamento ou chegada.
- Contato: WhatsApp do Consulente ou Cavalinho ligado à Entidade.

## 3. Configurações da Recepção

- Não deve existir `Consulentes podem visualizar para agendar por`.
- Não deve existir `Usar Entidade padrão por Consulente`.
- Não deve existir configuração global `Permitir que o Consulente escolha Entidade diferente da padrão`.
- Confirmar `Ordem dos atendimentos`.
- Confirmar `Lembretes/confirmações · antecedência em horas`.
- Confirmar `Receber resumo agendamentos` com `E-mail` e `WhatsApp`.

## 4. Cadastros

- Abrir `Cadastros` e confirmar primeiro nível com dois botões: `Consulentes` e `Entidades`.
- Em Consulentes, buscar por nome e por WhatsApp.
- Testar nome duplicado e selecionar pelo telefone.
- Testar nome inexistente e confirmar sugestão de novo cadastro.
- Em cadastro existente, confirmar `Entidade padrão` e `Permitir que este Consulente escolha Entidade diferente da padrão`.
- Confirmar que a permissão inicia desativada quando ainda não configurada.

## 5. Entidade padrão pelo primeiro atendimento

- Usar Consulente sem Entidade padrão.
- Fazer atendimento com uma Entidade que não seja Passe.
- No Acolhimento, registrar `Chegou`.
- Reabrir cadastro do Consulente e confirmar que essa Entidade se tornou padrão.
- Repetir com Entidade de Passe e confirmar que Passe não vira Entidade padrão.

## 6. Entidades

- Confirmar campos explícitos: Nome da Entidade, Descrição, Quantidade de vagas por dia de atendimento e Cavalinho associado.
- Atualizar uma Entidade e confirmar persistência.
- Trocar Cavalinho e verificar contato exibido na gestão/acolhimento.

## 7. BotConversa

- Configurar variáveis de Preview conforme `CONFIGURACAO-BOTCONVERSA-AGENDAMENTO-07.md`.
- Criar um agendamento com telefone de teste.
- Confirmar recebimento do fluxo pelo WhatsApp.
- Confirmar nome, data, Entidade e link corretos.
- Confirmar que não aparece mensagem sobre provedor SMS.
- Desabilitar temporariamente BotConversa e conferir que o botão manual de WhatsApp continua disponível.

## 8. Regressão

- `npm run lint`
- `npm run build`
- Agendar por Data.
- Agendar por Entidade.
- Busca por nome/WhatsApp.
- Popup final limpo.
- Acolhimento com filtros e paginação.
