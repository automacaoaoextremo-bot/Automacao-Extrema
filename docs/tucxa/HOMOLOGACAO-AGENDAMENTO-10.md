# Homologação — Tucxa Agendamento 10

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Exclusão segura de Entidades

1. Acesse Base Única > Entidades.
2. Escolha uma Entidade de teste sem atendimento/histórico.
3. Clique em **Excluir** e confirme.
4. Resultado esperado: a Entidade é apagada definitivamente e some da lista.
5. Repita com uma Entidade que já possua atendimento/recomendação.
6. Resultado esperado: o sistema não apaga o histórico; a Entidade é apenas inativada e a mensagem informa o motivo.

## 2. Capacidade / vagas

1. Aplique a migration do Agendamento 10.
2. Escolha uma Entidade com capacidade maior que 1 e sem override para a data.
3. Confirme que a tela mostra as vagas restantes.
4. Crie novo agendamento enquanto houver vaga.
5. Resultado esperado: a RPC aceita a reserva e retorna capacidade compatível com a exibida na tela.
6. Quando a capacidade real acabar, o erro deve aparecer em popup.

## 3. Indicadores

Na tela principal da Recepção:

- selecione **Data específica**, escolha uma data de hoje em diante e confira Agendados / Confirmados / Chegaram;
- selecione **Todos os futuros** e confira a soma de todos os agendamentos a partir da data atual;
- confirme/cancele/marque chegada e verifique se os indicadores são atualizados.

## 4. Calendário de vagas da Entidade

1. Abra **Entidades**.
2. Escolha uma Entidade e toque **Agendar**.
3. Resultado esperado: não existe mais calendário anual.
4. Devem aparecer somente meses e datas que realmente possuem vaga disponível.
5. Datas sem vaga não aparecem.
6. Ao escolher uma data, o fluxo deve seguir para busca/cadastro do Consulente.

## 5. Regressão

- criar agendamento;
- confirmação BotConversa;
- clicar no link;
- confirmar presença;
- Acolhimento;
- trocar Entidade;
- cancelar agendamento;
- cadastrar/editar Consulente;
- cadastrar/editar Entidade.
