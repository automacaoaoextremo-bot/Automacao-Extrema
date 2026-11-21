# RMC 03 — UX, agenda privada e solicitação histórica

Base: 58b334f163001126267a8502dcdc0431d448d70f, branch feature/ae-atendimento-inteligente-multicliente-v1.

- `AiUserMenu` destaca Sair para o cliente; operador permanece inalterado.
- O formulário abre um dialog nativo separado, com escolha de pessoa, identificação e contato/autorização. As páginas são curtas; rolagem de emergência fica disponível com teclado ou zoom.
- A agenda pertence ao titular autenticado, à organização e ao customer_id. Cada entrada combina pessoa e endereço; o mesmo endereço pode ser selecionado novamente, ou um novo informado. A confirmação do consentimento continua obrigatória a cada pedido. A persistência acontece ao concluir um pedido, não ao fechar o pop-up. Editar dados no formulário cria/atualiza a combinação ao concluir um pedido; não há CRUD independente da agenda nesta versão.
- A função v2 valida o titular e os endereços e realiza criação e gravação na agenda na mesma transação. Dados da pessoa atendida e endereço textual do pedido anterior são preservados. A migration recupera vínculos anteriores somente quando titular e endereço correspondem.
- `requested_at` é a data de origem **declarada** pelo solicitante, não prova independente. `created_at` e histórico de decisões mantêm a data efetiva. A fila continua ordenada pela criação real, para não esconder pedidos recém-importados. Uma chave histórica UUID estável por titular impede duplicação por reexecução. O pedido começa em pending; apenas N2 pode definir orçamento/status conforme fluxo atual. O script não envia anexos.
- Gravador: captura de microfone, contador, forma de onda de amplitude real, pausa/retomada, prévia, descartar e anexar. Use HTTPS ou localhost; suporte depende do navegador. Anexos confirmados permanecem no formulário; ao fechar durante captura ou antes de anexar, a gravação em andamento é descartada. Limites de mídia existentes preservados. Não cria bucket novo.

## Implantação
1. Instalar com DryRun, depois sem DryRun. Conferir o staging. Aplicar `20261121170000_ae_rmc_03_agenda_historico.sql` em homologação antes de rodar os novos endpoints.
2. Node 24.x: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run dev`.
3. Testar login, Sair, cadastro público, pedido próprio e terceiro sem WhatsApp; salvar pessoa/endereço, voltar em nova solicitação, selecionar endereço salvo, cadastrar outro e conferir imutabilidade do histórico. Usar dois usuários e tentar usar o ID de agenda alheio: API deve negar. Verificar também sessão sem autenticação e N1/N2.
4. Testar áudio em Chrome Android e Safari iOS, permissão recusada, pausa, retomada, prévia, descarte, anexar, fechar a etapa durante gravação e verificar microfone desligado. Testar áudio na linha do tempo dos dois lados e alternância de próxima ação anterior. Usar arquivos fictícios em teste.
5. Testar registro histórico com dados fictícios: data declarada anterior à atual, created_at atual, replay da mesma chave com o mesmo UUID, status pending, sem mudança de privilégio, e sem envio automático. Conferir que o N2 consegue importar a timeline sem alterar o andamento.
6. Commit seletivo, push, Preview com banco de homologação e envios reais desabilitados. Revisar PR integral para main. Backup e migration de produção antes de merge; depois deployment e smoke test. Não excluir tabela/colunas em rollback de código.
7. Só depois registrar o pedido real com a conta do cliente e importar mídia via N2. Confirmar data, autorização de compartilhamento e ausência de pedido já existente. Guardar o UUID do pedido e manter a mesma chave de importação. Dados privados e anexos não entram no Git.

Validação neste ambiente: transpileModule TypeScript (60 arquivos, zero diagnósticos de sintaxe), hashes dos fontes e pacote. Não foi executada a migration, o build completo ou o Windows PowerShell 5.1. Homologação obrigatória.
