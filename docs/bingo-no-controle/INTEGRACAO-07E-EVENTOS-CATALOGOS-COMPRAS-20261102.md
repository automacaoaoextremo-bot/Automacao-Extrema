# Bingo no Controle — Integração 07E (02/11/2026)

## Base da entrega

Fontes coletados em `bingo-tucxa-admin-07-fontes-20261102-173153.zip`, referenciando a 07D. Conferências SQL da homologação: evento TUCXA `bingo-tucxa-2026-12-12`, `status=ready`, `is_public=false`, `sales_enabled=false`; dez itens ativos de cardápio sem foto; sete ofertas de combos/cartelas/voucher com `status=draft`.

### Arquivos substituídos

- `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/page.tsx`
- `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/bnc-catalogos-v07c.tsx`
- `src/app/solucoes/bingo-no-controle/cliente/tucxa/bingo-tucxa-home.tsx`
- `src/app/solucoes/bingo-no-controle/cliente/tucxa/bnc-public-events-v07b.tsx`

### Novos

- `src/app/solucoes/bingo-no-controle/cliente/tucxa/compras-antecipadas/page.tsx`
- `supabase/migrations/20261102234500_bnc_admin_07e_eventos_catalogos.sql`
- `supabase/diagnostics/bnc_v07e_preflight.sql`
- `supabase/diagnostics/bnc_v07e_pos_aplicacao.sql`
- Este documento.

## Regras e limites

1. Três rótulos na interface: Rascunho (`draft` e eventos não públicos), Publicado (`ready` ou `active` **com** `is_public=true`) e Finalizado (`completed`/`closed`). A estrutura de estados do banco permanece inalterada. Evento finalizado é somente leitura; esta integração não implementa finalização.
2. Publicação passa pelo RPC auditado `bnc_v07b_publish_event(uuid,boolean)`: requer ao menos uma rodada, administra somente TUCXA. Não ativa vendas. Um evento `ready` e `is_public=false` ainda **não** é público.
3. No cadastro de evento há uma seleção opcional de evento histórico para copiar. O RPC `bnc_v07e_clone_from_form` chama o clone homologado V07D, configura descrição/local e cria evento `draft` com rodadas planejadas, sem copiar sorteios, ganhadores ou reivindicações. Não recrie `bingo-tucxa-2026-12-12`, que já existe.
4. Prendas são ordenadas alfabeticamente, têm edição de nome/descrição e podem ser marcadas disponíveis/indisponíveis pelo RPC V07D. A ação “Apagar do catálogo” realiza **arquivamento lógico** e é bloqueada se a prenda constar em qualquer premiação. Prendas arquivadas não são exibidas nos formulários administrativos. A foto existente não é excluída do Storage.
5. Itens de cardápio são associados a **um evento**, não são catálogo global: editar nome/categoria/preço/status somente enquanto o evento estiver `draft` ou `ready`, `sales_enabled=false`, e sem pedidos. A ação “Apagar” arquiva apenas se o evento não estiver publicado e não tiver pedidos. Em evento publicado use “Indisponível”. Dados auditados e imagens existentes são preservados.
6. A página `/compras-antecipadas` é informativa, sem endpoint de pedido, checkout, pagamento, cartão, Pix, voucher utilizável ou emissão de cartela. Sete ofertas permanecem `draft` e não são expostas como preços aprovados.
7. O erro HTTP 400 do upload de fotos **não foi reproduzido nem confirmado resolvido** no ambiente desta entrega. A interface detalha mais a mensagem do Storage. Valide bucket, MIME, limite e políticas com pré-diagnóstico e navegador Network (Response); não compartilhe tokens nem headers. O arquivo `client.ts` continua isolando Preview e Production.
8. O histórico do Sementinha integra o TUCXA apenas para leitura autorizada. A V07E não modifica as 15 rodadas/688 sorteios do Sementinha nem as 11 rodadas/358 sorteios do TUCXA.

## Procedimento de instalação e homologação

1. Na pasta `C:\Users\lacos\Documents\GitHub\automacao-extrema`, confirmar branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1` e `git status`. Fazer cópia dos quatro arquivos existentes. Nunca `reset --hard`/`git clean`.
2. Extrair o ZIP da entrega na **raiz** do repositório. Revisar `git diff --check`, `git diff --stat` e `git status`.
3. Antes de aplicar SQL: `npm run lint`; `npx tsc --noEmit`; `npm run build`. Qualquer falha interrompe a etapa.
4. No projeto Supabase **homologação** `zbqcngvohidmwqkfwwvf`, executar `bnc_v07e_preflight.sql` e guardar resultado. Verificar que V07B, V07C, V07D estão aplicadas. Fazer backup recuperável.
5. Executar `20261102234500_bnc_admin_07e_eventos_catalogos.sql` uma única vez em homologação. Se falhar, parar; não reaplicar sem diagnóstico.
6. Executar `bnc_v07e_pos_aplicacao.sql`. Cinco RPCs presentes; `anon_execute=false`; contagens de eventos, rodadas, sorteios e premiações iguais às anteriores. Nota: as tabelas terão as novas colunas `archived_at`.
7. Iniciar o app local (`NEXT_PUBLIC_BNC_ENV=homolog` e URL/anon de homologação) ou Vercel Preview. Testar com contas manager, viewer e sem vínculo.
8. Testar edição/arquivamento somente em **eventos e prendas de homologação**, nunca em registros históricos. Para publicar o evento de 12/12, validar programação/prendas e usar o botão em Configurações; conferir `is_public=true` e área pública. Fazer teste reversível de despublicação apenas em homologação.
9. Testar upload JPEG/PNG/WebP até 3 MB; se 400, registrar apenas status, texto da resposta (sem PII/tokens), bucket e caminho anonimizado.
10. Validar a nova página `/compras-antecipadas`: deve informar que **não existe checkout**, não emitir cartelas/vouchers e não mostrar propostas como preços finais.
11. Commit restrito aos nove arquivos listados, push na branch. Conferir o Preview da Vercel como `Ready`, e rede apontando para `zbqcngvohidmwqkfwwvf.supabase.co`.
12. Somente após homologação: backup do Supabase compartilhado **produção** `ooegejytfldzkjeexggo`, executar o preflight e conferir que V07B/C/D estão presentes. Aplicar somente V07E, executar pós-diagnóstico, comparar contagens. PR de `feature/bingo-no-controle-cliente-fundador-tucxa-v1` para `main`, revisar **todas** mudanças acumuladas, merge, aguardar Vercel `Ready`. Confirmar `NEXT_PUBLIC_BNC_ENV=production` e URL correta, validar TUCXA e outras soluções.

## Verificação de fotografia com erro 400

- Supabase Dashboard → Storage → bucket `bnc-public-images`, público, até 3 MB e MIME JPEG/PNG/WebP.
- Confirmar que o usuário autenticado pertence ao TUCXA e papel owner/manager; políticas `bnc_v07c_menu_photo_upload` e `bnc_v07d_prize_image_upload` estão presentes em `storage.objects`.
- Conferir que o caminho enviado segue `tucxa/<event_uuid>/menu/<uuid>.jpg` ou `tucxa/prizes/<prize_uuid>/<uuid>.jpg`.
- No Chrome DevTools → Network → chamada de Storage retornando 400 → Response. Copiar somente código/mensagem sem bearer, URL com token nem dados pessoais.

## Exclusões deliberadas

Nenhum `CREATE TABLE` para vendas/pagamentos/vouchers; nenhuma alteração às funções de sorteio e reivindicação; nenhuma importação do histórico; nenhuma alteração a `auth.users`, tabelas do Bazar ou Storage de outros produtos; nenhuma autorização implícita de compra pública.
