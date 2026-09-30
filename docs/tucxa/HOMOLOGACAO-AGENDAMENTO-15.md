# Homologação — TUCXA Agendamento 15

## 1. BotConversa — criação
1. Criar um agendamento para um Consulente com WhatsApp válido.
2. Confirmar no popup “Agendamento criado” a mensagem “Confirmação enviada automaticamente pelo WhatsApp”.
3. Confirmar o recebimento no WhatsApp do Consulente.
4. Se falhar, copiar a mensagem de erro exibida no popup e consultar os logs do deployment na Vercel procurando por `[TUCXA piloto BotConversa envio]`.

## 2. BotConversa — confirmação para Recepção
1. Abrir o link recebido pelo Consulente e confirmar presença.
2. Confirmar o recebimento do fluxo `TUCXA - Recepção - Confirmação` no WhatsApp da Recepção.
3. Em falha, consultar os logs por `[TUCXA confirmação]`.

## 3. Cadastros — Consulentes
1. Abrir Cadastros > Consulentes no celular.
2. Confirmar o título `Cadastros · Consulentes` na primeira linha.
3. Pesquisar um Consulente e confirmar que o formulário ficou mais compacto, sem a linha de título duplicada.
4. Atualizar e salvar um cadastro.

## 4. Cadastros — Entidades
1. Abrir Cadastros > Entidades no celular.
2. Selecionar uma Entidade existente.
3. Desmarcar `Entidade ativa para atendimento/agendamento` e salvar.
4. Fechar o popup de sucesso: deve voltar para `Cadastros · Entidades`.
5. Confirmar que a Entidade aparece como inativa e não fica disponível para novo agendamento.
6. Reabrir a mesma Entidade, reativar e salvar; calendário e ocorrências devem continuar disponíveis.
