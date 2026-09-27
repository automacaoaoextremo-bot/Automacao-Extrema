# Homologação — TUCXA Agendamento 12

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Acolhimento ao entrar

1. Entre pelo Login único do Agendamento com um usuário da Recepção.
2. Confirme que, com a preferência habilitada, o sistema abre automaticamente o popup **Acolhimento**.
3. Confirme que a data selecionada é a próxima data disponível do piloto.
4. No cabeçalho do popup, confirme os rótulos **Entidade** e **Dia**.
5. Confirme que a data aparece por completo no padrão `segunda-28/09/26`.
6. No filtro de status, confirme que o rótulo é **Confirmado**.

## 2. Preferência individual

1. Abra **Configurações**.
2. Desative **Abrir Acolhimento automaticamente na próxima data de atendimento** e salve.
3. Saia e entre novamente com a mesma pessoa: o Acolhimento não deve abrir sozinho.
4. Ative novamente, salve, saia e entre: o Acolhimento deve abrir.
5. Se houver outra pessoa de Recepção disponível, confirme que a preferência de uma não altera a da outra.

## 3. Registro de chegada

### Dentro da janela

1. Use um agendamento com a data de hoje.
2. Entre 18:00 e 20:00 (America/Sao_Paulo), toque **Ações → Chegou**.
3. Deve aparecer um popup **Chegada registrada**.
4. Ao fechar, o cartão deve refletir a chegada e os indicadores devem ser atualizados.

### Fora da janela

1. Em horário anterior a 18:00 ou posterior a 20:00, ou usando um agendamento que não seja de hoje, toque **Chegou**.
2. O sistema deve bloquear a ação e abrir popup informando que a chegada só pode ser registrada no dia do atendimento, entre 18:00 e 20:00.
3. Confirme que o banco não registrou a chegada.

## 4. Cadastro pessoal

1. Abra **Cadastros**.
2. Confirme os três caminhos: **Consulentes**, **Entidades** e **Cadastro pessoal**.
3. Toque **Cadastro pessoal**.
4. Deve abrir o fluxo existente `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados`.
5. Confirme que o usuário logado consegue revisar seus próprios dados normalmente.

## 5. Aviso à Recepção quando o Consulente confirma

1. Configure o fluxo BotConversa descrito em `CONFIGURACAO-BOTCONVERSA-AGENDAMENTO-12.md`.
2. Crie um novo agendamento de teste para um WhatsApp controlado.
3. Abra o link de confirmação e confirme a presença.
4. A presença deve ser registrada normalmente para o Consulente.
5. O WhatsApp da Recepção do Tucxa deve receber um aviso contendo nome, data, Entidade e link para o Login único.
6. Abra o link do aviso.
7. Faça login como Recepção.
8. O sistema deve retornar ao painel do piloto com o Acolhimento aberto.

## 6. Regressão

- Criar agendamento continua disparando o fluxo `TUCXA - Confirmar Agendamento`.
- Lembrete do dia continua usando `TUCXA - Lembrete Agendamento`.
- Cancelamento com motivo continua funcionando.
- Filtros múltiplos e paginação do Acolhimento continuam funcionando.
- Confirmação pública continua funcionando mesmo que o aviso BotConversa da Recepção esteja temporariamente indisponível.
