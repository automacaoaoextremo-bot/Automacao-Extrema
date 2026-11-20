# Bingo no Controle — TUCXA — Integração 07C (primeira entrega funcional)

## Base e escopo

Arquivos produzidos tomando como fonte o ZIP `bingo-tucxa-admin-05-fontes-20261102-135539.zip` e os requisitos de `OeH -Tucxa-Bingo-05.docx`.

**Nesta entrega:** menu administrativo de **Materiais de apoio** (5 guias operacionais), **Catálogo geral de prendas** com confirmação e associação às rodadas, **cardápio com upload de fotos** (JPEG/PNG/WebP, até 3 MB), cadastro de **combos somente em rascunho**, cadastro de **lotes e cores de cartelas somente em rascunho**, melhoria dos cartões de eventos e relatório com estatísticas de números/rodadas. A página pública de eventos publicados exibe as fotos do cardápio e das prendas confirmadas.

**Esta NÃO é a migração integral/pixel a pixel do painel antigo.** Em particular, não habilita venda antecipada, checkout, recebimento, emissão física/digital de cartelas, controle de estoque individual, compensação de vouchers/créditos, conciliação de pagamentos, reembolso ou validação automática de cartelas. Nenhum combo ou lote é vendido/validado por esta implementação. As funções de sorteio e revisão manual da V07B continuam sem mudança de regras.

**Dados históricos:** a Integração 07C não altera sorteios, premiações já registradas nem ganhadores do Sementinha/TUCXA. O Sementinha continua um grupo dentro do TUCXA, sem perder sua identificação no banco. Não se deve migrar registros outra vez.

## Arquivos do pacote

1. `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/page.tsx` — substituição completa do painel administrativo.
2. `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/bnc-catalogos-v07c.tsx` — novo componente de administração de fotos, combos, lotes e catálogo.
3. `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/bnc-materiais-v07c.tsx` — novo componente de materiais de apoio.
4. `src/app/solucoes/bingo-no-controle/cliente/tucxa/bnc-public-events-v07b.tsx` — substituição completa do componente público para consultar a nova RPC e mostrar as fotos.
5. `supabase/migrations/20261102200000_bnc_admin_catalogos_v07c.sql` — migration incremental com tabelas isoladas, funções com checagem explícita de papéis, Storage restrito a fotos e RPC pública sem dados pessoais.
6. `supabase/diagnostics/bnc_v07c_preflight.sql` — antes da migration.
7. `supabase/diagnostics/bnc_v07c_pos_aplicacao.sql` — depois da migration.
8. Este documento.

## Instalação no Windows

1. Confirmar branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1` e verificar `git status`.
2. Fazer cópia dos dois arquivos TSX substituídos para fora do repositório.
3. Extrair o ZIP na raiz `C:\Users\lacos\Documents\GitHub\automacao-extrema`, verificando os arquivos alterados com `git diff`.
4. Rodar `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`. Não avançar se houver erro. A verificação de sintaxe isolada não substitui estes testes.
5. Verificar as variáveis do projeto local/Preview: `NEXT_PUBLIC_BNC_ENV=homolog`, URL `https://zbqcngvohidmwqkfwwvf.supabase.co` e chave pública desse projeto.
6. Executar **somente no projeto de HOMOLOGAÇÃO** o pré-diagnóstico; todas as dependências V07A/V07B devem constar como existentes e V07C como ausente.
7. Garantir backup recuperável de homologação e executar a migration V07C uma vez; em caso de erro não reexecutar sem auditar o estado. Executar diagnóstico pós-instalação.
8. Executar `npm run dev` e testar a rota `/solucoes/bingo-no-controle/cliente/tucxa/admin`.
9. Fazer commit e push *somente* dos 8 arquivos deste pacote na branch correta; homologar o Preview da Vercel com o Supabase de homologação.
10. **Produção apenas após homologação:** confirmar backup do banco compartilhado da Automação Extrema `ooegejytfldzkjeexggo`, dependências V07A/V07B em produção e aplicar somente V07C, conferir os históricos e permissões. Verificar variáveis Production da Vercel, abrir PR da branch Bingo para `main`, revisar diferenças acumuladas, fazer merge, conferir deploy `Ready` e testes de regressão das outras soluções.

## Testes mínimos de homologação

- `owner/manager` TUCXA: consulta os dois históricos, cria evento rascunho e suas rodadas, cadastra item alimentício com foto e troca a foto posteriormente. Foto aparece na página pública **somente quando evento for publicado**.
- Foto de arquivo maior que 3 MB ou não JPEG/PNG/WebP: rejeitada. Foto não fica em conteúdo privado.
- Catálogo geral: criar prenda (não confirmada), associar a uma rodada planejada de evento TUCXA, confirmar doação. Prenda confirmada aparece na página pública do evento publicado. Não exibir dados de doador/vencedor.
- Cadastrar combo para cartelas, alimentação, misto e crédito fixo. Confirmar `status=draft` e ausência de pagamento/pedido/cartela emitida.
- Cadastrar lote de cor livre e lote vinculado exclusivamente a uma rodada. Confirmar `status=draft` e ausência de geração/venda de cartelas.
- Teste negativo: `viewer`, `operator` e conta não vinculada não conseguem criar itens nem executar RPCs de cadastro, incluindo chamadas feitas fora da interface. Não basta esconder botões.
- O evento concluído do Sementinha não aceita escrita. Totais de eventos históricos, rodadas, sorteios, prêmios e reivindicações permanecem inalterados.
- A RPC pública retorna apenas programação publicada, fotos autorizadas e itens ativos; não retorna clientes, doadores, cartelas ou ganhadores.
- Relatórios conferem apenas pedras válidas (não anuladas); exportação CSV não contém dados pessoais.

## Regras que dependem da Diretoria

- Para 12/12/2026 foi solicitado horário de **14h a 20h**. Confirmar capacidade, local, regras, responsáveis e publicidade antes da publicação.
- Definir se um bloco de cartelas vale para todas as rodadas ou apenas rodadas selecionadas; as cores são identificadores visuais, **não** validadores por si só.
- Definir como combos de alimentação/cartelas e créditos fixos serão vendidos, resgatados, cancelados e conciliados antes de habilitar qualquer venda.
- A foto da cesta de Natal só deverá ser mostrada como prenda confirmada após a composição/doação ser aprovada; exemplos devem ser rotulados como ilustrativos.

## Atenção à segurança

A migration cria o bucket público **`bnc-public-images`**, exclusivo para imagens JPEG/PNG/WebP até 3 MiB. A política INSERT é restrita a gestores TUCXA e ao caminho `tucxa/<eventId>/menu/<arquivo>` de eventos `draft/ready`. A URL pública exibe imagens autorizadas; **nunca** enviar documentos, telefones, comprovantes ou fotos identificáveis sem autorização.

`bnc_v07c_combos`, `bnc_v07c_card_batches` e a auditoria de prendas têm RLS; escrita exclusiva via funções `SECURITY DEFINER`, que verificam o usuário autenticado, papel e pertencimento do evento. Combo e lote permanecem em `draft` por restrição no banco.

**Não reaplicar V1/V04/V05/V07A/V07B. Não copiar o banco antigo. Não executar `supabase db push` indiscriminadamente no Supabase compartilhado.**

## Reversão

Se o Preview falhar, retornar ao último commit/deployment funcional. A instalação SQL não deve ser revertida apagando tabelas ou políticas do banco de produção sem análise das dependências e dos dados; nesse caso manter a função nova desabilitada via publicação/cliente até correção específica.
