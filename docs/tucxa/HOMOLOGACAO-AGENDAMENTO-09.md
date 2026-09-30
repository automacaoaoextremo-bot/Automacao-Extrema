# Homologação — Tucxa · Agendamento 09

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Configurações da Recepção

1. Acesse o painel da Recepção.
2. Abra **Configurações**.
3. Altere um valor seguro para teste e clique em **Salvar configurações**.
4. Confirme que a mensagem de sucesso **não aparece entre o cabeçalho verde e os cards da página**.
5. Confirme que abre o popup **Configurações salvas**.
6. Feche o popup e confirme que a tela principal permanece limpa.

## 2. Cadastro de Consulente

1. Abra **Cadastros > Consulentes**.
2. Localize um Consulente de teste.
3. Altere um dado reversível e clique em **Salvar**.
4. Confirme que abre o popup **Cadastro de Consulente salvo**.
5. Confirme que não aparece mensagem verde persistente na página principal.

## 3. Cadastro de Entidade

1. Abra **Cadastros > Entidades** ou **Entidades > Cadastro**.
2. Selecione uma Entidade de teste.
3. Faça uma alteração reversível e salve.
4. Confirme que abre o popup **Cadastro de Entidade salvo**.
5. Confirme que não aparece mensagem verde persistente na página principal.

## 4. Calendário da Entidade

1. Abra **Entidades**.
2. Escolha uma Entidade e clique em **Agendar**.
3. Confirme que o calendário mostra somente os meses que possuem datas de atendimento disponíveis.
4. Dentro desses meses, confirme que somente as datas de atendimento aparecem numeradas/destacadas; os demais dias ficam vazios.
5. Toque em uma das datas mostradas e confirme que o fluxo segue para o agendamento com Entidade e data já selecionadas.

## 5. Link de confirmação pelo WhatsApp/BotConversa

1. Faça um novo agendamento para um telefone controlado de teste.
2. Confirme que o novo link enviado pelo BotConversa aponta diretamente para `/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/[token]`.
3. Toque no link diretamente dentro do WhatsApp/BotConversa, sem copiar e colar.
4. Confirme que a página já abre com os dados do atendimento — não deve ficar presa em **Validando seu agendamento...**.
5. Teste também um link antigo no formato `/a/[token]`; ele deve redirecionar normalmente para a tela de confirmação.

## 6. Horários na confirmação

Antes de confirmar, verifique a presença de:

- Data;
- Chegada;
- Horário em que a porta fecha;
- Horário em que a porta reabre;
- Início dos atendimentos;
- Término previsto;
- Entidade.

Os valores padrão atuais do piloto são 18h30–19h20 para chegada, 19h20 para fechamento da porta, 20h para reabertura/início dos atendimentos e 21h40 para término previsto, salvo alteração nas configurações do módulo.

## 7. Confirmar presença

1. Clique em **Confirmar minha presença**.
2. Confirme que aparece a mensagem **Presença confirmada conforme os dados abaixo.**
3. Confirme que os horários e a Entidade continuam visíveis.
4. Confirme que aparece o quadro final **Presença confirmada** e que não é necessário recarregar a página.

## 8. Não comparecimento

1. Crie outro agendamento controlado.
2. Abra o link e clique em **Não poderei comparecer**.
3. Confirme que o aviso é registrado e que a vaga é liberada.

## 9. Regressão

Ao final execute localmente:

```powershell
npm run lint
npm run build
git diff --check
```

Não faça merge para `main` enquanto estes testes não estiverem concluídos no Preview.
