# Homologação — Tucxa Agendamento 04

Branch: `feature/tucxa-em-harmonia-agendamentos-piloto-v1`

## 1. Página pública

Acesse `/solucoes/organizacao-em-harmonia/agendamento`.

No mobile, confirme:
- terceira linha com `Por que usar | Horários | Agendamento | Ajuda`;
- todos os quatro botões com o mesmo tamanho de fonte/estilo;
- botão interno `Horários` (sem `Ver`);
- quadro verde ocupando a altura disponível sem exigir rolagem da página;
- `Por que usar` e `Horários` continuam abrindo seus pop-ups;
- `Agendamento` abre o login único.

## 2. Login único

Acesse `/solucoes/organizacao-em-harmonia/agendamento/login`.

Confirme:
- cabeçalho sem `Início`;
- apenas `Voltar` e `Ajuda`;
- botões com o mesmo padrão visual da página pública;
- texto explicativo da fase do piloto removido;
- `Mostrar/Ocultar` na mesma linha visual do rótulo `Senha`;
- quadro verde usa a altura disponível no mobile sem rolagem.

## 3. Painel inicial da Recepção

Entre com um usuário com função Recepção.

Acesse `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto`.

Confirme:
- terceira linha possui somente `Sair`;
- `Sair` encerra a sessão e redireciona para `/solucoes/organizacao-em-harmonia/agendamento/login`;
- não aparece a palavra `Piloto` no cartão principal;
- saudação usa o primeiro nome: `Olá, <nome>, aqui você agenda, confirma e organiza os atendimentos do Tucxa.`;
- o texto antigo sobre a Recepção trabalhar com a mesma informação do Consulente foi removido;
- ordem dos cards: `Como funciona`, `Configurações`, `Cadastros`, `Entidades`, `Agendar`, `Acolhimento`;
- `Acolhimento` abre a função que antes era apresentada como `Consultar`.

## 4. Cadastro de novo Consulente

Em `Agendar`, pesquise um WhatsApp não cadastrado.

Confirme:
- senha inicial já preenchida com `12345678`;
- botão `Mostrar/Ocultar` fica junto ao campo Senha;
- LGPD continua obrigatória;
- após criar, a mensagem mostra somente `Cadastro criado. Login: <telefone>.`;
- no primeiro login desse usuário, a troca de senha continua obrigatória.

## 5. SMS

O código atual oferece:
- `TUCXA_SMS_PROVIDER=disabled`
- `TUCXA_SMS_PROVIDER=twilio`
- `TUCXA_SMS_PROVIDER=webhook`

Antes de testar SMS real, configure as variáveis do provedor no Preview do Vercel e faça Redeploy.
