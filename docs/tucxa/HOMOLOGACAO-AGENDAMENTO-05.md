# Homologação — Tucxa Agendamento 05

## Página pública

Acesse:

`/solucoes/organizacao-em-harmonia/agendamento`

Validar no celular:

1. A terceira linha do cabeçalho usa o mesmo padrão compacto da página principal do Tucxa.
2. Existem somente: **Por que usar | Horários | Agendamento | Ajuda**.
3. **Agendamento** aparece destacado ao abrir a página.
4. Ao tocar em **Por que usar**, essa opção fica destacada e o popup abre.
5. Ao tocar em **Horários**, essa opção fica destacada e o popup abre.
6. O quadro principal possui proporção, arredondamento, tipografia e espaçamento mais próximos da página inicial do Tucxa.
7. Os três botões internos são **Por que usar | Horários | Agendamento**.

## Login único

Acesse:

`/solucoes/organizacao-em-harmonia/agendamento/login`

Validar:

1. O cabeçalho apresenta **Voltar | Ajuda** no mesmo padrão compacto usado pelo Tucxa.
2. **Voltar** aparece destacado.
3. O quadro segue o padrão visual do login atual dos Filhos da Corrente.
4. O título permanece **Entre com o seu WhatsApp ou e-mail**.
5. Campo de WhatsApp/e-mail possui placeholder.
6. Senha e Mostrar/Ocultar ficam na mesma linha visual do campo, como no login de referência.
7. Login de Recepção continua levando ao painel correto.

## SMS

1. Configure as variáveis Twilio em Preview.
2. Crie um agendamento usando um telefone real de teste.
3. Confirme “SMS enviado” na tela.
4. Confirme recebimento no aparelho.
5. Confirme que o link curto `/a/[token]` redireciona para a confirmação pública.
6. Confirme a presença.
7. Confira o log na Twilio.

## Regressão

Executar:

```powershell
npm run lint
npm run build
git diff --check
```

Não fazer merge para `main` enquanto existirem ajustes pendentes do piloto.
