# Homologação — TUCXA Agendamento 08

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Como funciona no mobile

1. Entre no painel da Recepção.
2. Abra **Como funciona**.
3. Confirme que os cinco blocos aparecem mais compactos e que, em um celular comum, o conteúdo cabe sem necessidade de rolar a área interna do popup.
4. Confira **Agendamento**, **Confirmação**, **Chegada**, **Ordem** e **Contato**.

## 2. Cadastros > Consulentes

1. Abra **Cadastros** e depois **Consulentes**.
2. Confirme que não existe mais o botão interno `← Cadastros`.
3. Pesquise um Consulente por nome ou WhatsApp e abra o cadastro.
4. Toque em **Fechar**.
5. O sistema deve voltar ao seletor **Cadastros**, com os cartões **Consulentes** e **Entidades**, sem fechar completamente o popup.

## 3. Cadastros > Entidades

1. Abra **Cadastros** e depois **Entidades**.
2. Confirme que não existe mais o botão interno `← Cadastros`.
3. Selecione uma Entidade e confira Nome, Descrição, Vagas/dia, Cavalinho e calendário semanal.
4. Toque em **Fechar**.
5. O sistema deve voltar ao seletor **Cadastros**.

## 4. Disponibilidade das Entidades

1. Abra **Entidades** na tela inicial da Recepção.
2. A lista deve mostrar, para cada Entidade ativa:
   - nome;
   - próxima disponibilidade;
   - quantidade de vagas daquela próxima data;
   - botão **Cadastro**;
   - botão **Agendar**;
   - WhatsApp do Cavalinho, quando houver.
3. A antiga ficha extensa de disponibilidade/suspensão não deve aparecer nessa tela.

## 5. Botão Cadastro

1. Na lista de Entidades, toque em **Cadastro**.
2. O sistema deve abrir `Cadastros > Entidades` com aquela Entidade já selecionada.
3. Altere um dado controlado e salve, se desejar validar atualização.
4. Ao tocar **Fechar**, deve voltar ao seletor **Cadastros**.

## 6. Botão Agendar e calendário anual

1. Na lista de Entidades, toque em **Agendar**.
2. Deve abrir um calendário anual com o nome da Entidade.
3. Somente datas futuras em que a Entidade atende e ainda possui vaga devem aparecer destacadas/clicáveis.
4. Se o horizonte atravessar dois anos, use **Anterior/Próximo** para alternar o ano.
5. Toque em uma data destacada.
6. O sistema deve abrir o popup **Agendar Filho de Fora/Consulente**, já com:
   - modo `Por Entidade`;
   - Entidade selecionada;
   - data selecionada.

## 7. Buscar ou cadastrar Consulente

1. Depois de escolher a data no calendário, pesquise por nome ou WhatsApp.
2. Se houver homônimos, selecione o cadastro correto pelo WhatsApp.
3. Se não existir cadastro e a busca for por WhatsApp, crie novo Consulente.
4. Crie o agendamento e confirme que o popup final mostra pessoa, data, Entidade e link de confirmação.

## 8. BotConversa

Esta evolução não altera as variáveis já configuradas no Agendamento-07. Valide o agendamento com um contato de teste e confirme o fluxo `TUCXA - Confirmar Agendamento` no WhatsApp.

## 9. Regressão mínima

Execute também:

```powershell
npm run lint
npm run build
git diff --check
```

E valide que Acolhimento, Configurações e o login unificado continuam funcionando.
