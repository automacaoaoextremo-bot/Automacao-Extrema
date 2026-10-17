# TUCXA · Ajuste 68 · BotConversa · localização e destaque da Recepção

## Objetivo

Atualizar as mensagens enviadas ao Consulente pelo BotConversa para:

1. incluir um link clicável do Google Maps para o endereço do TUCXA;
2. destacar em **negrito** a orientação para falar com a Recepção;
3. manter horários, link de confirmação, aviso de atendimento individual e demais informações já existentes.

O endereço usado pelo sistema é:

`Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611`

Link do Google Maps:

`https://www.google.com/maps/search/?api=1&query=Rua%20Talvino%20Eg%C3%ADdio%20de%20Souza%20Aranha%20J%C3%BAnior%2C%20179%20-%20Jardim%20Miranda%20-%20Campinas%2FSP%20-%20CEP%2013034-611`

## Limitação do WhatsApp

Mensagens de texto comuns do WhatsApp/BotConversa permitem negrito usando `*texto*`, mas não permitem escolher a cor da fonte de um trecho. Portanto, o pedido de "vermelho e negrito" deve ser implementado com **negrito** e um indicador visual vermelho, por exemplo o emoji `🔴`.

Use:

`🔴 *Em caso de dúvida, fale com a Recepção do TUCXA.*`

Isso é compatível com uma mensagem textual normal do WhatsApp. Não usar HTML, `<span style="color:red">` ou sintaxe semelhante, pois o WhatsApp não renderiza cor de fonte dessa forma.

## 1. Fluxo `TUCXA - Confirmar Agendamento`

No BotConversa, abra:

`Fluxos de conversa -> TUCXA - Confirmar Agendamento`

No bloco `Conteúdo`, preserve o texto existente e acrescente, antes da orientação final de Recepção:

```text
📍 Local do atendimento:
Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611

🗺️ Google Maps:
https://www.google.com/maps/search/?api=1&query=Rua%20Talvino%20Eg%C3%ADdio%20de%20Souza%20Aranha%20J%C3%BAnior%2C%20179%20-%20Jardim%20Miranda%20-%20Campinas%2FSP%20-%20CEP%2013034-611

🔴 *Em caso de dúvida, fale com a Recepção do TUCXA.*
```

Não remover:

- nome do Consulente;
- data;
- Entidade;
- chegada orientada;
- horário de fechamento da porta;
- link de confirmação;
- aviso de atendimento individual;
- elemento `Contato` da Recepção, se já estiver configurado.

## 2. Fluxo `TUCXA - Lembrete Agendamento`

Abra:

`Fluxos de conversa -> TUCXA - Lembrete Agendamento`

Acrescente o mesmo bloco de localização e substitua a frase simples da Recepção por:

`🔴 *Em caso de dúvida, fale com a Recepção do TUCXA.*`

## 3. Não criar nova variável na Vercel

Este ajuste não exige novo `FLOW_ID`, campo personalizado ou variável de ambiente. O link do Google Maps é fixo no texto do fluxo, porque o endereço do TUCXA não varia por agendamento.

As variáveis existentes continuam sendo utilizadas normalmente.

## 4. Homologação

Faça um agendamento para um WhatsApp controlado e confira no aparelho:

- o link do Google Maps aparece clicável;
- ao tocar no link, abre o endereço do TUCXA;
- a frase da Recepção aparece em negrito;
- o emoji vermelho `🔴` aparece antes da frase;
- data, Entidade, horários e link de confirmação permanecem corretos;
- o elemento de contato da Recepção continua disponível, se configurado.

## 5. Código do repositório

O Ajuste 68 também centraliza o endereço em:

`src/lib/organizacao-em-harmonia/tucxa-location.ts`

A mensagem textual usada em auditoria/fallback passa a incluir a mesma localização. O fluxo efetivamente recebido pelo WhatsApp continua sendo controlado pelo conteúdo configurado no BotConversa, por isso a alteração manual acima é necessária.
