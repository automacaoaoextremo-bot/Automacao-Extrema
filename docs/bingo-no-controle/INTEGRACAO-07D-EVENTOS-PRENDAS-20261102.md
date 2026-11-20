# Bingo no Controle — Integração 07D: Eventos e Prendas

## Escopo

1. Eventos: ações independentes **Abrir evento** e **Ver rodadas**, status no canto do cartão, início e término.
2. Novo evento: formulário em seção exclusiva, com início e término; clonagem de evento concluído no mesmo local. As cópias continuam **privadas**, com rodadas planejadas, sem sorteios nem vencedores.
3. Prendas: catálogo geral independente, foto JPEG/PNG/WebP até 3 MB, disponibilidade (`available`, `allocated`, `unavailable`) e confirmação da doação como campos distintos.
4. Premiação: várias prendas disponíveis podem ser vinculadas atomicamente à rodada planejada. **Cada prenda torna-se um registro de premiação individual**; criar um pacote único compartilhado por vários itens e um único ganhador exige etapa futura.

## Mudanças no banco

Migration nova `20261102230000_bnc_admin_eventos_prendas_v07d.sql`:
- `bnc_events.ends_at` com restrição de horário posterior ao início;
- permissão de inserção/edição apenas para `ends_at`, usando as políticas V07A existentes;
- `bnc_prizes.availability_status` e funções de alteração auditada;
- política de upload limitada a `tucxa/prizes/<uuid>/` no bucket existente `bnc-public-images`;
- funções RPC `bnc_v07d_clone_event`, `bnc_v07d_prize_set_image`, `bnc_v07d_prize_set_availability`, `bnc_v07d_assign_prizes`;
- revoga execução das RPCs antigas `bnc_v07c_attach_prize` e `bnc_v07b_add_prize`, que não impediam o reuso de uma prenda já alocada.

As mudanças não reexecutam V1/V04/V05/V07A/V07B/V07C e não alteram diretamente sorteios, pedidos, cartelas ou ganhadores.

## Requisitos

- Aplicar somente após comprovar V07A, V07B e V07C no projeto **homologação** `zbqcngvohidmwqkfwwvf`.
- Realizar backup recuperável, rodar `bnc_v07d_preflight.sql`, aplicar a migration uma única vez e validar `bnc_v07d_pos_aplicacao.sql`.
- Manter `NEXT_PUBLIC_BNC_ENV=homolog` e a URL da homologação no ambiente local e Preview.
- Fazer os testes de RLS com usuário `manager`, `viewer` e sem vínculo; testar que eventos históricos não podem ser modificados.
- Nenhum acesso SQL deve ser feito à produção antes de aprovar a homologação.

## Checklist funcional

- [ ] Eventos históricos Sementinha 09/05/2026 e TUCXA 14/06/2026 intactos.
- [ ] Cartões com status, início e término quando cadastrados.
- [ ] Abrir evento e Ver rodadas levam a telas diferentes.
- [ ] Novo evento não exibe a lista de eventos nem formulários duplicados.
- [ ] Cadastro novo de 12/12/2026, 14:00–20:00, com término salvo.
- [ ] Clonagem de evento concluído com 15 rodadas e zero sorteios, em rascunho.
- [ ] Catálogo geral carrega mesmo com evento selecionado.
- [ ] Envio da foto não expõe dados de participantes e o link é do bucket BNC.
- [ ] Prenda indisponível não pode ser vinculada; prenda vinculada passa a alocada.
- [ ] Associação de 2 prendas na mesma rodada cria 2 premiações e auditoria, sem duplicação.
- [ ] Usuários sem permissão não podem executar RPCs ou upload.
- [ ] Área pública mostra somente prenda confirmada em evento publicado.
- [ ] Lint, TypeScript e build aprovados; Preview Ready.

## GitHub e Vercel

Usar **somente** a branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`. Fazer commit seletivo dos arquivos da integração, não `git add .`; push e Preview. Após homologação funcional e RLS, aplicar apenas V07D no banco compartilhado de produção `ooegejytfldzkjeexggo` com backup, executar diagnóstico e só então abrir PR para `main`. Vendas e pagamentos permanecem desativados.
