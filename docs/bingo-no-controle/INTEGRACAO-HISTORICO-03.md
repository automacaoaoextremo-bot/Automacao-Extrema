# Bingo no Controle — Integração 03: catálogo auditado do histórico

## Fonte e decisões
Consulta de `event_days` e contagens enviada em 19/10/2026, referente ao projeto Supabase de origem `tzyyrabjqtvjzxossyuk`:
- **Sementinha** 09/05/2026: 15 rodadas, 688 sorteios, 30 premiações, 38 reivindicações, 25 ganhadores.
- **TUCXA** 14/06/2026: 11 rodadas, 358 sorteios, 23 premiações, 22 reivindicações, 22 ganhadores.
- **Teste** `8ab60e8d-57e5-4019-9cd8-52be78a48612`: excluir de qualquer migração.

Total dos dois eventos reais: **26 rodadas, 1.046 sorteios, 53 premiações, 60 reivindicações e 47 ganhadores**. Os totais da base original (27, 1.076, 55, 64, 48) incluem o evento de teste.

## Entregue agora
- Inventário tipado dos dois eventos reais e sua **organização proprietária**, sem dados pessoais.
- Página pública de histórico do TUCXA com seus indicadores agregados e informação explícita de que a importação ainda não ocorreu.
- Consulta SQL de conferência com seleção explícita por UUID e teste de referências órfãs.

## Não entregue ainda
- Importação de linhas históricas ao banco BNC, pois o pacote de código enviado não inclui `data.sql`, nem conexão ao banco de destino para validar o mapeamento.
- Painel de administração operacional, controle de sorteio, emissão de cartelas, pagamentos ou leitura de dados pessoais. Não reutilizar o acesso público como autorização administrativa.
- Correspondência `profiles` ↔ usuários Auth, exigindo migração de identidade e revisão das políticas multi-organização.

## Critérios para importar de verdade
1. Usar backup `data.sql` local, preservando informações pessoais sob controle do operador; não colocá-lo em Git nem no ZIP para a conversa.
2. Criar destino BNC de **homologação**, executar migração BNC atual e alterações de compatibilidade.
3. Manter duas organizações distintas, usar `bnc_legacy_map` em cada registro e checar constraints.
4. Conferir 2 eventos reais, 26 rodadas, 1046 sorteios, 53 premiações, 60 reivindicações, 47 ganhadores; verificar anulações e identificadores originais.
5. Fazer backup antes do cutover e rodar importador de forma idempotente; jamais apagar os registros de origem.
6. Validar `bnc_members` e autenticação protegida ANTES de implementar painéis com dados restritos.
