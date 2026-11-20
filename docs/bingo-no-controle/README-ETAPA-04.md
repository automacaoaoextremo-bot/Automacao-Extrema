# Bingo no Controle — integração histórica 04

## Objetivo

Importação controlada do histórico real de maio e junho de 2026 para a arquitetura `bnc_*`, preservando o evento de teste exclusivamente na origem. O procedimento **não usa a conexão do Supabase antigo**: lê o dump local e gera um SQL para um destino de **homologação**.

## Escopo implementado

- Dois eventos de origem identificados por UUID e organização correta (`sementinha` e `tucxa`).
- 26 rodadas, 1.046 sorteios e 53 premiações materializados em `bnc_events`, `bnc_rounds`, `bnc_draws`, `bnc_awards`.
- 60 reivindicações e 47 ganhadores preservados integralmente no arquivo bruto privado `bnc_legacy_raw` para integração posterior às telas de administração, sem publicação de dados pessoais.
- Documentos/metadata dos prêmios utilizados preservados como snapshots privados, não como catálogo de ofertas comercializáveis.
- Histórico antigo com `is_public = false` e `sales_enabled = false`.
- Transação, contagem mínima, rastreabilidade de UUID de origem e abortos diante de divergências.

## Dependências

A migration `20261018220000_bingo_no_controle_v1.sql` precisa estar aplicada previamente no banco **de homologação**. A Etapa 04 requer o PostgreSQL com `bnc_*` criadas.

## Passo a passo

1. Faça backup do banco de homologação e confirme visualmente **o projeto destino** no Dashboard Supabase. Não aponte para o projeto legado nem para o projeto da Automação Extrema de produção.
2. Aplique `supabase/migrations/20261019090000_bnc_historico_legado_v04.sql` no projeto de homologação (via fluxo de migrations da branch, ou SQL Editor de homologação uma única vez; evite duplicar histórico de migrations).
3. Em Windows, com Python 3 instalado, rode o teste **sem gravar**:

   ```powershell
   py -3 "C:\Users\lacos\Documents\GitHub\automacao-extrema\scripts\bingo-no-controle\gerar_importacao_historica_04.py" --data "C:\Users\lacos\Documents\backups\bingo-supabase\data.sql"
   ```

4. Se a auditoria indicar as contagens exatas e a exclusão do evento de teste, gere o SQL **local e sensível**:

   ```powershell
   $out = "C:\Users\lacos\Documents\backups\bingo-supabase\importacao-bnc-v04-PRIVADO.sql"
   py -3 "C:\Users\lacos\Documents\GitHub\automacao-extrema\scripts\bingo-no-controle\gerar_importacao_historica_04.py" --data "C:\Users\lacos\Documents\backups\bingo-supabase\data.sql" --gerar-sql --saida $out
   ```

5. **O arquivo gerado contém dados pessoais**: não o envie para esta conversa, não faça commit, não o disponibilize publicamente. Revise sua geração. Com o projeto de homologação já configurado e migration aplicada, execute esse SQL com a ferramenta de banco autorizada pela equipe, em conexão de administração para o **destino de homologação**.
6. Execute `supabase/diagnostics/bingo-no-controle-04-pos-importacao.sql` no destino. O evento de teste deve permanecer ausente; compare contagens e organização.
7. **Não executar em produção** até confirmar ambiente, resultado, restauração do backup e isolamento multiempresa. Uma importação de histórico não libera vendas, prêmios nem checkout.

## Limitações explícitas

- A importação não conecta Python ao banco remoto, não migra usuários Auth e não transfere Storage.
- Reivindicações, ganhadores e eventuais informações pessoais são conservados apenas na tabela privada de staging nesta etapa. A integração administrativa normalizada e autorização por organização ficam para a próxima fase.
- Se qualquer arquivo alterar o esquema, a importação abortará ao encontrar divergência de contagem ou referências.
- A tabela de prêmios do legado pode não corresponder diretamente às premiações (snapshots); não inferir doações, imagens ou novos itens à venda.
- A importação repete IDs do legado nas tabelas de histórico; conflitos de ID requerem revisão manual, não sobreposição.
