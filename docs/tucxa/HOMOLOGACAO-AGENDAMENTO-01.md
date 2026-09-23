# Tucxa em Harmonia — Agendamento Piloto — Ajustes 01

## Objetivo

Homologar a evolução do piloto de agendamentos antes de qualquer merge para `main`.

Branch esperada:

`feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## Pré-requisitos

1. Aplicar a migration `supabase/migrations/20260923143000_oh_tucxa_agendamento_piloto_ajustes_01.sql`.
2. Manter as variáveis Supabase já usadas pelo projeto.
3. Para SMS, manter `TUCXA_SMS_PROVIDER=disabled` enquanto o provedor não estiver configurado, ou configurar o provedor já adotado no piloto.
4. Para o endpoint de lembretes, definir `CRON_SECRET` no ambiente em que ele for agendado.
5. Provisionar os acessos iniciais com o script local, usando o JSON de dados pessoais fora do repositório.

## 1. Página pública

Acessar:

`/solucoes/organizacao-em-harmonia/agendamento`

Validar:

- a página abre sem exigir login;
- não ocorre o flash da tela privada seguido de redirecionamento;
- existem benefícios para Consulentes, Recepção e Cavalinhos;
- aparecem os horários de chegada, fechamento da porta e atendimentos;
- os botões **Agendamento** / **Acessar Agendamento** levam para o login único;
- no site público do Tucxa existe a ação **Agendamento** apontando para a página pública.

## 2. Login único

Acessar:

`/solucoes/organizacao-em-harmonia/agendamento/login`

Testar separadamente:

- uma pessoa da Recepção;
- um Cavalinho;
- um Filho de Fora/Consulente que já possua login;
- outro Filho da Corrente que já possua login.

Confirmar que o sistema direciona cada perfil para sua área correta.

## 3. Primeiro acesso dos novos logins

Para um usuário provisionado com senha temporária:

1. entrar com WhatsApp e senha temporária;
2. confirmar nome;
3. confirmar telefone;
4. preencher e-mail, se desejar;
5. marcar a ciência do Aviso de Privacidade/LGPD;
6. informar uma nova senha com pelo menos 8 caracteres;
7. concluir o primeiro acesso;
8. sair e entrar novamente usando a nova senha;
9. confirmar que o formulário de primeiro acesso não é apresentado novamente.

## 4. Cavalinhos e Entidades

Na base de dados, validar que:

- cada Cavalinho informado no arquivo local foi associado à Entidade correta;
- Reginaldo possui os dois vínculos previstos;
- usuários que já existiam tiveram o login preservado e não tiveram sua senha substituída;
- `Mata Verde`, `Passe - Jupira` e `Passe - Araribóia` foram cadastradas sem calendário ativo, pois o documento não informou seus dias de atendimento.

Antes de liberar essas três Entidades para agendamento, a Recepção precisa cadastrar seu calendário.

## 5. Configurações da Recepção

Na tela do piloto da Recepção, abrir **Configurações** e testar:

- visualização **Entidade / dia**;
- visualização **Dia / Entidade**;
- opção **Ambos**;
- ativar/desativar Entidade padrão por Consulente;
- permitir/proibir que o Consulente escolha uma Entidade diferente da padrão;
- ordem por agendamento;
- ordem por chegada;
- antecedências globais de lembretes de confirmação;
- preferência pessoal da Recepção para resumo por e-mail e/ou SMS;
- preferência pessoal da Recepção para agrupamento do resumo.

Observação: a preferência de resumo é armazenada nesta versão. O envio automático do resumo não é agendado porque o requisito ainda não informa periodicidade/horário de envio.

## 6. Cadastro de Consulente

Na área **Cadastros** da Recepção:

- pesquisar um Consulente existente;
- atualizar nome, WhatsApp e e-mail;
- definir Entidade padrão;
- abrir o WhatsApp a partir do cadastro;
- confirmar que as alterações permanecem após recarregar a página.

## 7. Cadastro de Entidade

Na área **Cadastros** da Recepção:

- editar uma Entidade existente;
- alterar capacidade diária;
- definir em quais ocorrências de segunda e/ou terça ela atende (1ª, 2ª, 3ª, 4ª);
- cadastrar uma Entidade de teste;
- verificar que o calendário do piloto passa a respeitar a configuração salva.

## 8. Agendamento e troca de Entidade

Como Recepção:

- criar um agendamento;
- abrir o WhatsApp do Consulente;
- trocar a Entidade do agendamento;
- confirmar que capacidade e disponibilidade são respeitadas;
- confirmar manualmente o agendamento;
- cancelar um agendamento de teste.

## 9. Ordem de chegada

Com a configuração **ordem de chegada**:

- marcar o primeiro Consulente como chegou;
- marcar o segundo como chegou;
- confirmar ordem 1 e ordem 2;
- marcar uma pessoa como ausente;
- voltar um registro para pendente, se necessário;
- confirmar que a visualização mostra a ordem de chegada.

## 10. Experiência do Consulente

Como Consulente:

- testar Dia / Entidade;
- testar Entidade / Dia;
- testar o seletor quando a configuração permitir ambos;
- testar Entidade padrão;
- confirmar que outra Entidade fica bloqueada quando a Recepção desabilitar a troca;
- criar agendamento;
- consultar e confirmar;
- configurar seus próprios lembretes SMS;
- cancelar um agendamento de teste.

## 11. Lembretes

O endpoint preparado é:

`/api/cron/tucxa-agendamento-reminders`

Ele exige o header `Authorization: Bearer <CRON_SECRET>`.

Validar inicialmente com um acionamento controlado em ambiente seguro. Conferir a tabela `oh_tucxa_pilot_notification_log` para garantir que o mesmo lembrete não seja enviado duas vezes.

## 12. Mobile

Em um celular real ou DevTools, conferir:

- página pública;
- login único;
- primeiro acesso;
- tela da Recepção;
- tela do Consulente;
- modais de configuração/cadastro;
- botões de WhatsApp;
- ausência de rolagem desnecessária na visão principal quando o conteúdo puder ser aberto em modal.

## Pendências funcionais que exigem decisão

- corrigir o registro marcado com `needsReview` no JSON local antes do provisionamento; o número recebido possui quantidade inválida de dígitos após normalização;
- definir o calendário de `Mata Verde`, `Passe - Jupira` e `Passe - Araribóia`;
- definir periodicidade/horário do resumo automático que a Recepção poderá receber por e-mail/SMS;
- confirmar se `20h às 21h40` é o horário oficial a exibir publicamente ou se deve ser ajustado;
- definir a estratégia de agendamento do endpoint de lembretes conforme o plano Vercel utilizado.
