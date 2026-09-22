# Automação Extrema — Impacto no Controle — Sementinha — InC-04

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `72bcd1a04eb9ba27b992f16bf622e8c2a9755767`
- working tree indicada no pacote: limpa

## Implementado

### 1. Popup inicial orientado ao propósito
- reforça que a participação ajuda a arrecadar recursos para as ações do Dia das Crianças;
- mantém a rifa e o prêmio como contexto, sem transformar a comunicação em pressão de venda;
- informa que o pagamento pode ser por Pix ou por outra forma combinada com o Suporte;
- informa que o sorteio terá data a confirmar;
- informa que haverá gravação em vídeo com evidência do número ganhador;
- informa que o vídeo será disponibilizado junto com a prestação de contas;
- o botão `COMEÇAR` recarrega a mesma campanha e usa uma marca temporária de sessão para que o popup não abra novamente nessa navegação;
- continua existindo `Não mostrar novamente neste navegador`.

### 2. Página pública mais objetiva
- remove da página principal os botões `Sobre a bicicleta` e `Regulamento`;
- mantém um card simples de Suporte;
- `Andamento da arrecadação` e `Impacto estimado` ficam lado a lado;
- textos de pagamento foram revisados para mencionar Pix ou outra forma combinada com o Suporte.

### 3. Cabeçalho da reserva
A página `/reserva/[token]` agora usa:
- logo do cliente;
- nome `Sementinha`;
- link da marca apontando de volta para a campanha.

### 4. Prazo exato da reserva
A página informa data e horário reais de expiração, além da contagem regressiva.

### 5. Suporte e outras formas de pagamento
A orientação da reserva deixa explícito:
- Pix é uma opção;
- outra forma pode ser combinada com o Suporte;
- `fale com o Suporte` é um link clicável para WhatsApp.

### 6. Botão PIX / COMPROVANTE
Depois do quadro `Tempo restante da reserva` foi incluído:
- `PIX / COMPROVANTE`.

O botão abre um fluxo guiado de três telas:
1. Resumo da reserva;
2. Faça o pagamento — Pix ou outra forma combinada com o Suporte;
3. Envie o comprovante, incluindo o quadro `Dica`.

Todas as telas têm `FECHAR` e `TIRAR DÚVIDA`; as etapas intermediárias têm `CONTINUAR`.

### 7. Envio público de comprovante
O endpoint público agora recebe `payment_method`:
- `pix`: mantém as validações Pix já existentes;
- `other`: aceita comprovante para conferência manual e registra que a forma de pagamento foi combinada com o Suporte.

### 8. Gestão — registrar comprovante
Em `Pagamentos e participações`, a Gestão passa a ter:
- `Registrar comprovante`;
- `Substituir comprovante`, quando já existir arquivo;
- escolha da forma de pagamento: Pix ou outra forma combinada com o Suporte;
- observação opcional da Gestão.

O registro coloca a participação em `aguardando conferência do pagamento` e mantém os números vinculados.

### 9. Gestão — excluir reserva aguardando pagamento/comprovante
Para reservas em `awaiting_payment` e sem comprovante:
- aparece `Excluir reserva`;
- há confirmação antes de excluir;
- os números são liberados;
- a contribuição/reserva é excluída;
- a ação é gravada em auditoria;
- reservas com comprovante ou já em conferência/aprovadas não podem ser excluídas por essa ação.

### 10. Integridade transacional
A migration InC-04 cria duas RPCs restritas ao `service_role`:
- `inc_admin_register_contribution_proof(...)`;
- `inc_admin_delete_awaiting_reservation(...)`.

Elas mantêm atualização da contribuição, números e auditoria na mesma transação de banco.

## Arquivos alterados/novos
O pacote contém todos os arquivos completos necessários para esta rodada.

## Banco / Vercel
- nova migration Supabase: **sim**
- nova tabela: **não**
- nova coluna: **não**
- novas funções/RPCs: **sim**
- nova variável Vercel: **não**
- alteração em `vercel.json`: **não**
- alteração nas variáveis `PIX_*`: **não**

## Validação já realizada
Os 19 arquivos TS/TSX alterados ou novos foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo execute obrigatoriamente:
```powershell
npm run lint
npm run build
```

## Homologação recomendada
1. Aplicar a migration InC-04.
2. Abrir a rifa em nova sessão/navegador e conferir o popup.
3. Conferir mensagem do Dia das Crianças, pagamento e transparência do sorteio.
4. Clicar `COMEÇAR` e confirmar que a mesma URL abre sem o popup.
5. Conferir ausência de `Sobre a bicicleta` e `Regulamento`.
6. Conferir `Andamento da arrecadação` e `Impacto estimado` lado a lado.
7. Criar uma reserva.
8. Conferir cabeçalho Sementinha e data/hora exatas da expiração.
9. Testar `fale com o Suporte`.
10. Abrir `PIX / COMPROVANTE` e percorrer as três etapas.
11. Testar envio por Pix.
12. Criar outra reserva e testar `Outra forma com o Suporte`.
13. Entrar na Gestão e registrar manualmente um comprovante.
14. Aprovar/rejeitar o comprovante.
15. Criar uma reserva sem comprovante e usar `Excluir reserva`.
16. Confirmar que os números excluídos voltaram a ficar disponíveis.
