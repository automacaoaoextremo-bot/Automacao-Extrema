# AE-AI-RMC-01 — Formulário, áudio e alternância de respostas

Fonte: documento AE-AI-RMC-01, ZIP de fontes no commit `382be05635225e6eacdc0f822c390b4933dbfeaa` da branch `feature/ae-atendimento-inteligente-multicliente-v1`.

## O que muda

- `header-actions.tsx`: ao identificar uma sessão autenticada, oculta **Voltar** no cabeçalho. Sem sessão, a navegação de entrada permanece.
- `rmc/solicitar/page.tsx` e `request-form.tsx`: o botão **Fechar** fica no canto superior direito do cartão inicial; o fluxo passa a ter **1. Endereço e pessoa atendida; 2. Serviços e problema; 3. Fotos, preferências e confirmação**.
- Etapa 2: usa o gravador já existente e permite importar áudio OGG/Opus, WebM ou M4A. Reprodução local antes de enviar. Para um único serviço, o áudio pode substituir a descrição livre; o registro de texto permanece com marcador explícito para o N2 ouvir o anexo. Se o upload falhar, o pedido ainda existirá, e a falha será apresentada ao usuário.
- `request-timeline.tsx`: N2 pode marcar **Solicitar resposta do cliente** ao enviar texto ou áudio. Mensagens sem essa marcação não mudam o turno automaticamente.
- `ae_ai_request_timeline.requires_response` e `ae_ai_requests.awaiting_response_from`: nova migration RMC. Triggers em transação definem `need_info/customer` quando N2 solicita resposta e `in_review/n2` quando cliente responde por texto ou conclui upload de anexo. Importações históricas (`origin=whatsapp_import`) não modificam o turno.
- A fila N2 e “Meus pedidos” mostram a próxima ação. A outra empresa do Atendimento Inteligente não usa esse novo controle.

## Regras essenciais

1. A pessoa atendida sem WhatsApp não precisa de conta: o pedido é registrado pelo solicitante autenticado, como já previsto na migration 20261120213000.
2. Somente proprietário N2/admin AE (com permissão de importação) pode marcar **Solicitar resposta do cliente**. Não há concessão de privilégios aos clientes.
3. Um áudio só altera o status quando seu upload termina e é confirmado; um item pendente/falhado não desloca o pedido.
4. Datas históricas importadas são mantidas separadas de `created_at`. Não utilizar as mensagens importadas para movimentar automaticamente a fila.
5. O bucket privado `ae-ai-request-media` é reutilizado, sem novos buckets públicos.
6. A migration é aditiva; não apagar automaticamente a coluna/triggers se houver registros posteriores.

## Implantação

Executar os testes e a migration **primeiro em homologação**, no projeto Supabase correspondente ao Vercel Preview. Confirmar que nenhuma credencial de produção será utilizada no Preview. Rodar `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` usando Node 24.x; validar em Android e desktop. Verificar clientes N1/N2, terceiro sem WhatsApp, resposta por texto/áudio, permissões cruzadas, estados terminal e histórico já existente.

No Git, fazer staging dos arquivos do manifesto, rever `git diff --cached` e abrir PR para `main` apenas depois que o Preview funcionar. Como a branch reúne commits anteriores, revisar todo o PR. Em produção, realizar backup do banco e aplicar a migration antes de publicar o código, confirmar deployment e smoke tests. Em caso de falha, rollback do deployment com revisão do estado de dados persistidos.

## Histórico da mãe

Registrar primeiro um pedido real com consentimento e dados verdadeiros; guardar UUID. O script existente de importação por lotes (`Importar-Historico-Mae-RMC-Em-Lotes.ps1`) deve ser executado com simulação, validação dos hashes e confirmação das datas divergentes antes de `-Executar`. O primeiro lote inclui imagem e áudio inicial; o lote restante, as seis mídias seguintes. O importador existente exige login N2 autorizado e **não** altera status. Não compartilhar áudios ou fotografias em repositórios.
