-- Organização em Harmonia / TUCXA
-- Evolução 01: substitui os valores provisórios de jan-jun/2026 pelos
-- balancetes oficiais enviados pelo Tucxa em 11/08/2026.
--
-- Fontes:
--   Balancetes Tucxa 2026-01Jan.pdf
--   Balancetes Tucxa 2026-02Fev.pdf
--   Balancetes Tucxa 2026-03Mar.pdf
--   Balancetes Tucxa 2026-04Abr.pdf
--   Balancetes Tucxa 2026-05Mai.pdf
--   Balancetes Tucxa 2026-06Jun.pdf
--
-- A migration preserva os lançamentos provisórios como cancelados para auditoria
-- e grava o realizado com source_type = balancete_pdf_2026.

do $$
declare
  org_id uuid;
  period_id uuid;
  category_id uuid;
  month_row record;
  entry_row record;
  actual_revenue numeric;
  actual_expense numeric;
  categories_data jsonb := $categories$
[{"entry_type":"despesa","name":"Aluguel chácara festa junina","public_name":"Aluguel de chácara — Festa Junina","slug":"aluguel-chacara-festa-junina","group_name":"Eventos e ações assistenciais","sort_order":100},{"entry_type":"despesa","name":"Aluguel e Despesas Tucxa 2","public_name":"Aluguel e despesas do espaço","slug":"aluguel-tucxa-2","group_name":"Estrutura e serviços essenciais","sort_order":101},{"entry_type":"despesa","name":"Barraca/Tenda Sementinha pet","public_name":"Barraca/Tenda Sementinha pet","slug":"barraca-tenda-sementinha-pet","group_name":"Eventos e ações assistenciais","sort_order":102},{"entry_type":"despesa","name":"Cadeiras Tucxa II","public_name":"Cadeiras para o espaço","slug":"cadeiras-tucxa-2","group_name":"Segurança e conservação","sort_order":103},{"entry_type":"despesa","name":"Celular Tucxa","public_name":"Telefone e comunicação","slug":"celular-tucxa","group_name":"Estrutura e serviços essenciais","sort_order":104},{"entry_type":"despesa","name":"Charuto","public_name":"Charutos","slug":"charuto","group_name":"Materiais dos trabalhos","sort_order":105},{"entry_type":"despesa","name":"Compra lona p/Sementinha","public_name":"Lona para o Sementinha","slug":"compra-lona-sementinha","group_name":"Eventos e ações assistenciais","sort_order":106},{"entry_type":"despesa","name":"Conserto fechadura Tucxa I","public_name":"Conserto de fechadura","slug":"conserto-fechadura-tucxa-1","group_name":"Segurança e conservação","sort_order":107},{"entry_type":"despesa","name":"Copos descartáveis","public_name":"Copos descartáveis","slug":"copos-descartaveis","group_name":"Materiais dos trabalhos","sort_order":108},{"entry_type":"despesa","name":"Coroa de Flores","public_name":"Coroa de flores","slug":"coroa-flores","group_name":"Materiais dos trabalhos","sort_order":109},{"entry_type":"despesa","name":"CPFL","public_name":"Energia elétrica","slug":"cpfl","group_name":"Estrutura e serviços essenciais","sort_order":110},{"entry_type":"despesa","name":"Defumação 7 mistur/espir","public_name":"Materiais de defumação","slug":"defumacao","group_name":"Materiais dos trabalhos","sort_order":111},{"entry_type":"despesa","name":"Despesa ventilador Tucxa 1","public_name":"Ventilador Tucxa I","slug":"despesa-ventilador-tucxa-1","group_name":"Estrutura e serviços essenciais","sort_order":112},{"entry_type":"despesa","name":"Despesas bancárias","public_name":"Despesas bancárias","slug":"despesas-bancarias","group_name":"Institucional e administrativo","sort_order":113},{"entry_type":"despesa","name":"Despesas diversas p/trabalho","public_name":"Despesas diversas dos trabalhos","slug":"despesas-diversas","group_name":"Materiais dos trabalhos","sort_order":114},{"entry_type":"despesa","name":"Despesas Elétricas","public_name":"Despesas elétricas","slug":"despesas-eletricas","group_name":"Segurança e conservação","sort_order":115},{"entry_type":"despesa","name":"Despesas eletricas Tucxa II","public_name":"Despesas elétricas Tucxa II","slug":"despesas-eletricas-tucxa-2","group_name":"Segurança e conservação","sort_order":116},{"entry_type":"despesa","name":"Faxineira","public_name":"Limpeza do espaço","slug":"faxineira","group_name":"Segurança e conservação","sort_order":117},{"entry_type":"despesa","name":"Federação - FUCESP","public_name":"Federação e obrigações institucionais","slug":"federacao-fucesp","group_name":"Institucional e administrativo","sort_order":118},{"entry_type":"despesa","name":"Feijoada","public_name":"Feijoada","slug":"feijoada","group_name":"Eventos e ações assistenciais","sort_order":119},{"entry_type":"despesa","name":"Festa junina","public_name":"Festa junina","slug":"festa-junina","group_name":"Eventos e ações assistenciais","sort_order":120},{"entry_type":"despesa","name":"Flores","public_name":"Flores","slug":"flores","group_name":"Materiais dos trabalhos","sort_order":121},{"entry_type":"despesa","name":"Garrafinhas 300ml c/100","public_name":"Garrafinhas","slug":"garrafinhas","group_name":"Materiais dos trabalhos","sort_order":122},{"entry_type":"despesa","name":"Incenso - eucalipto","public_name":"Incenso de eucalipto","slug":"incenso-eucalipto","group_name":"Materiais dos trabalhos","sort_order":123},{"entry_type":"despesa","name":"IPTU","public_name":"IPTU","slug":"iptu","group_name":"Institucional e administrativo","sort_order":124},{"entry_type":"despesa","name":"Despesas c/ a kombi - combustível","public_name":"Combustível da Kombi","slug":"kombi-combustivel","group_name":"Estrutura e serviços essenciais","sort_order":125},{"entry_type":"despesa","name":"Despesas manutenção","public_name":"Manutenção","slug":"manutencao","group_name":"Segurança e conservação","sort_order":126},{"entry_type":"despesa","name":"Materiais limpeza","public_name":"Materiais de limpeza","slug":"materiais-limpeza","group_name":"Segurança e conservação","sort_order":127},{"entry_type":"despesa","name":"Material elétrico p/Tucxa II","public_name":"Material elétrico Tucxa II","slug":"material-eletrico-tucxa-2","group_name":"Segurança e conservação","sort_order":128},{"entry_type":"despesa","name":"Pembas","public_name":"Pembas","slug":"pembas","group_name":"Materiais dos trabalhos","sort_order":129},{"entry_type":"despesa","name":"Pizza","public_name":"Pizza","slug":"pizza","group_name":"Eventos e ações assistenciais","sort_order":130},{"entry_type":"despesa","name":"Presente Dani/Helinho","public_name":"Presente institucional","slug":"presente-dani-helinho","group_name":"Institucional e administrativo","sort_order":131},{"entry_type":"despesa","name":"Reserva chácara p/confraternização","public_name":"Reserva de chácara para confraternização","slug":"reserva-chacara-confraternizacao","group_name":"Eventos e ações assistenciais","sort_order":132},{"entry_type":"despesa","name":"Sanasa","public_name":"Água e saneamento","slug":"sanasa","group_name":"Estrutura e serviços essenciais","sort_order":133},{"entry_type":"despesa","name":"Segurança","public_name":"Segurança","slug":"seguranca","group_name":"Segurança e conservação","sort_order":134},{"entry_type":"despesa","name":"Tinta para Tucxa I","public_name":"Tinta para manutenção","slug":"tinta-tucxa-1","group_name":"Segurança e conservação","sort_order":135},{"entry_type":"despesa","name":"Troca bacias Tucxa I","public_name":"Troca de bacias","slug":"troca-bacias-tucxa-1","group_name":"Segurança e conservação","sort_order":136},{"entry_type":"despesa","name":"Troca Filtros Tucxa","public_name":"Troca de filtros","slug":"troca-filtros-tucxa","group_name":"Estrutura e serviços essenciais","sort_order":137},{"entry_type":"despesa","name":"Velas","public_name":"Velas","slug":"velas","group_name":"Materiais dos trabalhos","sort_order":138},{"entry_type":"receita","name":"Barraca/Tenda Sementinha pet","public_name":"Barraca/Tenda Sementinha pet","slug":"barraca-tenda-sementinha-pet","group_name":"Ações do Sementinha","sort_order":139},{"entry_type":"receita","name":"Camisetas","public_name":"Camisetas","slug":"camisetas","group_name":"Outras receitas","sort_order":140},{"entry_type":"receita","name":"Cursos","public_name":"Cursos","slug":"cursos","group_name":"Cursos e atividades","sort_order":141},{"entry_type":"receita","name":"Devolução Presente Dani/Helinho","public_name":"Devolução de despesa","slug":"devolucao-presente-dani-helinho","group_name":"Outras receitas","sort_order":142},{"entry_type":"receita","name":"Doações","public_name":"Doações","slug":"doacoes","group_name":"Contribuições","sort_order":143},{"entry_type":"receita","name":"Feijoada","public_name":"Feijoada","slug":"feijoada","group_name":"Eventos","sort_order":144},{"entry_type":"receita","name":"Festa junina","public_name":"Festa junina","slug":"festa-junina","group_name":"Eventos","sort_order":145},{"entry_type":"receita","name":"Jornal","public_name":"Jornal","slug":"jornal","group_name":"Outras receitas","sort_order":146},{"entry_type":"receita","name":"Materiais limpeza","public_name":"Materiais de limpeza (recebimento)","slug":"materiais-limpeza","group_name":"Outras receitas","sort_order":147},{"entry_type":"receita","name":"Meditação","public_name":"Meditação","slug":"meditacao","group_name":"Cursos e atividades","sort_order":148},{"entry_type":"receita","name":"Mensalidades","public_name":"Contribuições mensais","slug":"mensalidades","group_name":"Contribuições","sort_order":149},{"entry_type":"receita","name":"Pizza","public_name":"Pizza","slug":"pizza","group_name":"Eventos","sort_order":150}]
$categories$::jsonb;
  seed_data jsonb := $seed$
[{"competence_month":"2026-01-01","entry_date":"2026-01-31","opening_balance":-10966.98,"closing_balance":-15759.14,"source_label":"Balancete oficial 01/2026 — Balancetes Tucxa 2026-01Jan.pdf","source_file":"Balancetes Tucxa 2026-01Jan.pdf","expected_revenue":6478.0,"expected_expense":11270.16,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":4950.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":980.0,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"jornal","amount":15.0,"description_internal":"Jornal","description_public":"Jornal","sort_order":3},{"entry_type":"receita","category_slug":"meditacao","amount":190.0,"description_internal":"Meditação","description_public":"Meditação","sort_order":4},{"entry_type":"receita","category_slug":"camisetas","amount":90.0,"description_internal":"Camisetas","description_public":"Camisetas","sort_order":5},{"entry_type":"receita","category_slug":"materiais-limpeza","amount":253.0,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza (recebimento)","sort_order":6},{"entry_type":"despesa","category_slug":"cpfl","amount":363.65,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":7},{"entry_type":"despesa","category_slug":"sanasa","amount":113.75,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":8},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":9},{"entry_type":"despesa","category_slug":"seguranca","amount":500.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":10},{"entry_type":"despesa","category_slug":"faxineira","amount":1000.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":11},{"entry_type":"despesa","category_slug":"charuto","amount":891.0,"description_internal":"Charuto","description_public":"Charutos","sort_order":12},{"entry_type":"despesa","category_slug":"velas","amount":3650.0,"description_internal":"Velas","description_public":"Velas","sort_order":13},{"entry_type":"despesa","category_slug":"celular-tucxa","amount":58.0,"description_internal":"Celular Tucxa","description_public":"Telefone e comunicação","sort_order":14},{"entry_type":"despesa","category_slug":"cadeiras-tucxa-2","amount":133.3,"description_internal":"Cadeiras Tucxa II","description_public":"Cadeiras para o espaço","sort_order":15},{"entry_type":"despesa","category_slug":"aluguel-tucxa-2","amount":1000.0,"description_internal":"Aluguel e Despesas Tucxa 2","description_public":"Aluguel e despesas do espaço","sort_order":16},{"entry_type":"despesa","category_slug":"materiais-limpeza","amount":1629.56,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza","sort_order":17},{"entry_type":"despesa","category_slug":"flores","amount":1010.0,"description_internal":"Flores","description_public":"Flores","sort_order":18},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":288.26,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":19},{"entry_type":"despesa","category_slug":"manutencao","amount":253.97,"description_internal":"Despesas manutenção","description_public":"Manutenção","sort_order":20},{"entry_type":"despesa","category_slug":"troca-bacias-tucxa-1","amount":198.67,"description_internal":"Troca bacias Tucxa I","description_public":"Troca de bacias","sort_order":21},{"entry_type":"despesa","category_slug":"tinta-tucxa-1","amount":60.0,"description_internal":"Tinta para Tucxa I","description_public":"Tinta para manutenção","sort_order":22}]},{"competence_month":"2026-02-01","entry_date":"2026-02-28","opening_balance":-15759.14,"closing_balance":-13634.19,"source_label":"Balancete oficial 02/2026 — Balancetes Tucxa 2026-02Fev.pdf","source_file":"Balancetes Tucxa 2026-02Fev.pdf","expected_revenue":11683.0,"expected_expense":9558.05,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":6875.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":943.0,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"camisetas","amount":130.0,"description_internal":"Camisetas","description_public":"Camisetas","sort_order":3},{"entry_type":"receita","category_slug":"pizza","amount":3330.0,"description_internal":"Pizza","description_public":"Pizza","sort_order":4},{"entry_type":"receita","category_slug":"barraca-tenda-sementinha-pet","amount":100.0,"description_internal":"Barraca/Tenda Sementinha pet","description_public":"Barraca/Tenda Sementinha pet","sort_order":5},{"entry_type":"receita","category_slug":"cursos","amount":40.0,"description_internal":"Cursos","description_public":"Cursos","sort_order":6},{"entry_type":"receita","category_slug":"materiais-limpeza","amount":265.0,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza (recebimento)","sort_order":7},{"entry_type":"despesa","category_slug":"pizza","amount":4929.89,"description_internal":"Pizza","description_public":"Pizza","sort_order":8},{"entry_type":"despesa","category_slug":"barraca-tenda-sementinha-pet","amount":100.0,"description_internal":"Barraca/Tenda Sementinha pet","description_public":"Barraca/Tenda Sementinha pet","sort_order":9},{"entry_type":"despesa","category_slug":"cpfl","amount":225.37,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":10},{"entry_type":"despesa","category_slug":"sanasa","amount":119.64,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":11},{"entry_type":"despesa","category_slug":"iptu","amount":126.2,"description_internal":"IPTU","description_public":"IPTU","sort_order":12},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":13},{"entry_type":"despesa","category_slug":"seguranca","amount":500.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":14},{"entry_type":"despesa","category_slug":"faxineira","amount":1000.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":15},{"entry_type":"despesa","category_slug":"celular-tucxa","amount":58.0,"description_internal":"Celular Tucxa","description_public":"Telefone e comunicação","sort_order":16},{"entry_type":"despesa","category_slug":"pembas","amount":132.0,"description_internal":"Pembas","description_public":"Pembas","sort_order":17},{"entry_type":"despesa","category_slug":"defumacao","amount":250.0,"description_internal":"Defumação 7 mistur/espir","description_public":"Materiais de defumação","sort_order":18},{"entry_type":"despesa","category_slug":"incenso-eucalipto","amount":16.0,"description_internal":"Incenso - eucalipto","description_public":"Incenso de eucalipto","sort_order":19},{"entry_type":"despesa","category_slug":"cadeiras-tucxa-2","amount":133.3,"description_internal":"Cadeiras Tucxa II","description_public":"Cadeiras para o espaço","sort_order":20},{"entry_type":"despesa","category_slug":"aluguel-tucxa-2","amount":1000.0,"description_internal":"Aluguel e Despesas Tucxa 2","description_public":"Aluguel e despesas do espaço","sort_order":21},{"entry_type":"despesa","category_slug":"materiais-limpeza","amount":90.0,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza","sort_order":22},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":286.07,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":23},{"entry_type":"despesa","category_slug":"manutencao","amount":471.58,"description_internal":"Despesas manutenção","description_public":"Manutenção","sort_order":24}]},{"competence_month":"2026-03-01","entry_date":"2026-03-31","opening_balance":-13634.19,"closing_balance":-10710.71,"source_label":"Balancete oficial 03/2026 — Balancetes Tucxa 2026-03Mar.pdf","source_file":"Balancetes Tucxa 2026-03Mar.pdf","expected_revenue":10619.3,"expected_expense":7695.82,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":6045.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":994.3,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"jornal","amount":65.0,"description_internal":"Jornal","description_public":"Jornal","sort_order":3},{"entry_type":"receita","category_slug":"camisetas","amount":90.0,"description_internal":"Camisetas","description_public":"Camisetas","sort_order":4},{"entry_type":"receita","category_slug":"pizza","amount":3285.0,"description_internal":"Pizza","description_public":"Pizza","sort_order":5},{"entry_type":"receita","category_slug":"feijoada","amount":140.0,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":6},{"entry_type":"despesa","category_slug":"pizza","amount":106.34,"description_internal":"Pizza","description_public":"Pizza","sort_order":7},{"entry_type":"despesa","category_slug":"feijoada","amount":350.0,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":8},{"entry_type":"despesa","category_slug":"cpfl","amount":271.3,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":9},{"entry_type":"despesa","category_slug":"sanasa","amount":119.64,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":10},{"entry_type":"despesa","category_slug":"iptu","amount":126.2,"description_internal":"IPTU","description_public":"IPTU","sort_order":11},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":12},{"entry_type":"despesa","category_slug":"seguranca","amount":1000.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":13},{"entry_type":"despesa","category_slug":"faxineira","amount":1000.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":14},{"entry_type":"despesa","category_slug":"velas","amount":1450.0,"description_internal":"Velas","description_public":"Velas","sort_order":15},{"entry_type":"despesa","category_slug":"celular-tucxa","amount":123.0,"description_internal":"Celular Tucxa","description_public":"Telefone e comunicação","sort_order":16},{"entry_type":"despesa","category_slug":"aluguel-tucxa-2","amount":1000.0,"description_internal":"Aluguel e Despesas Tucxa 2","description_public":"Aluguel e despesas do espaço","sort_order":17},{"entry_type":"despesa","category_slug":"materiais-limpeza","amount":211.0,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza","sort_order":18},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":345.87,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":19},{"entry_type":"despesa","category_slug":"garrafinhas","amount":330.0,"description_internal":"Garrafinhas 300ml c/100","description_public":"Garrafinhas","sort_order":20},{"entry_type":"despesa","category_slug":"despesas-eletricas","amount":530.9,"description_internal":"Despesas Elétricas","description_public":"Despesas elétricas","sort_order":21},{"entry_type":"despesa","category_slug":"coroa-flores","amount":356.67,"description_internal":"Coroa de flores","description_public":"Coroa de flores","sort_order":22},{"entry_type":"despesa","category_slug":"presente-dani-helinho","amount":254.9,"description_internal":"Presente Dani/Helinho","description_public":"Presente institucional","sort_order":23}]},{"competence_month":"2026-04-01","entry_date":"2026-04-30","opening_balance":-10710.71,"closing_balance":-7612.48,"source_label":"Balancete oficial 04/2026 — Balancetes Tucxa 2026-04Abr.pdf","source_file":"Balancetes Tucxa 2026-04Abr.pdf","expected_revenue":12843.1,"expected_expense":9744.87,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":5577.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":972.0,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"jornal","amount":30.0,"description_internal":"Jornal","description_public":"Jornal","sort_order":3},{"entry_type":"receita","category_slug":"meditacao","amount":80.0,"description_internal":"Meditação","description_public":"Meditação","sort_order":4},{"entry_type":"receita","category_slug":"pizza","amount":1170.0,"description_internal":"Pizza","description_public":"Pizza","sort_order":5},{"entry_type":"receita","category_slug":"feijoada","amount":4830.0,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":6},{"entry_type":"receita","category_slug":"devolucao-presente-dani-helinho","amount":184.1,"description_internal":"Devolução Presente Dani/Helinho","description_public":"Devolução de despesa","sort_order":7},{"entry_type":"despesa","category_slug":"pizza","amount":7.13,"description_internal":"Pizza","description_public":"Pizza","sort_order":8},{"entry_type":"despesa","category_slug":"feijoada","amount":4083.13,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":9},{"entry_type":"despesa","category_slug":"cpfl","amount":366.73,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":10},{"entry_type":"despesa","category_slug":"sanasa","amount":119.64,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":11},{"entry_type":"despesa","category_slug":"coroa-flores","amount":350.0,"description_internal":"Coroa de Flores","description_public":"Coroa de flores","sort_order":12},{"entry_type":"despesa","category_slug":"iptu","amount":126.2,"description_internal":"IPTU","description_public":"IPTU","sort_order":13},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":14},{"entry_type":"despesa","category_slug":"seguranca","amount":1000.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":15},{"entry_type":"despesa","category_slug":"faxineira","amount":1000.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":16},{"entry_type":"despesa","category_slug":"copos-descartaveis","amount":139.0,"description_internal":"Copos descartáveis","description_public":"Copos descartáveis","sort_order":17},{"entry_type":"despesa","category_slug":"flores","amount":750.0,"description_internal":"Flores","description_public":"Flores","sort_order":18},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":307.48,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":19},{"entry_type":"despesa","category_slug":"despesas-diversas","amount":194.14,"description_internal":"Despesas diversas p/Trabalho","description_public":"Despesas diversas dos trabalhos","sort_order":20},{"entry_type":"despesa","category_slug":"despesas-eletricas-tucxa-2","amount":516.2,"description_internal":"Despesas eletricas Tucxa II","description_public":"Despesas elétricas Tucxa II","sort_order":21},{"entry_type":"despesa","category_slug":"kombi-combustivel","amount":100.0,"description_internal":"Despesas c/ a kombi - combustível","description_public":"Combustível da Kombi","sort_order":22},{"entry_type":"despesa","category_slug":"aluguel-chacara-festa-junina","amount":420.0,"description_internal":"Aluguel chácara festa junina","description_public":"Aluguel de chácara — Festa Junina","sort_order":23},{"entry_type":"despesa","category_slug":"compra-lona-sementinha","amount":145.22,"description_internal":"Compra lona p/Sementinha","description_public":"Lona para o Sementinha","sort_order":24}]},{"competence_month":"2026-05-01","entry_date":"2026-05-31","opening_balance":-7612.48,"closing_balance":-6551.51,"source_label":"Balancete oficial 05/2026 — Balancetes Tucxa 2026-05Mai.pdf","source_file":"Balancetes Tucxa 2026-05Mai.pdf","expected_revenue":10003.15,"expected_expense":8942.18,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":6210.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":798.15,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"jornal","amount":15.0,"description_internal":"Jornal","description_public":"Jornal","sort_order":3},{"entry_type":"receita","category_slug":"pizza","amount":1155.0,"description_internal":"Pizza","description_public":"Pizza","sort_order":4},{"entry_type":"receita","category_slug":"feijoada","amount":1025.0,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":5},{"entry_type":"receita","category_slug":"festa-junina","amount":800.0,"description_internal":"Festa junina","description_public":"Festa junina","sort_order":6},{"entry_type":"despesa","category_slug":"pizza","amount":18.01,"description_internal":"Pizza","description_public":"Pizza","sort_order":7},{"entry_type":"despesa","category_slug":"feijoada","amount":30.16,"description_internal":"Feijoada","description_public":"Feijoada","sort_order":8},{"entry_type":"despesa","category_slug":"festa-junina","amount":288.52,"description_internal":"Festa junina","description_public":"Festa junina","sort_order":9},{"entry_type":"despesa","category_slug":"cpfl","amount":416.33,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":10},{"entry_type":"despesa","category_slug":"sanasa","amount":119.64,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":11},{"entry_type":"despesa","category_slug":"material-eletrico-tucxa-2","amount":363.43,"description_internal":"Material elétrico p/Tucxa II","description_public":"Material elétrico Tucxa II","sort_order":12},{"entry_type":"despesa","category_slug":"iptu","amount":126.2,"description_internal":"IPTU","description_public":"IPTU","sort_order":13},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":14},{"entry_type":"despesa","category_slug":"seguranca","amount":1000.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":15},{"entry_type":"despesa","category_slug":"faxineira","amount":1000.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":16},{"entry_type":"despesa","category_slug":"velas","amount":2940.0,"description_internal":"Velas","description_public":"Velas","sort_order":17},{"entry_type":"despesa","category_slug":"celular-tucxa","amount":65.0,"description_internal":"Celular Tucxa","description_public":"Telefone e comunicação","sort_order":18},{"entry_type":"despesa","category_slug":"pembas","amount":60.0,"description_internal":"Pembas","description_public":"Pembas","sort_order":19},{"entry_type":"despesa","category_slug":"defumacao","amount":146.0,"description_internal":"Defumação 7 mistur/espir","description_public":"Materiais de defumação","sort_order":20},{"entry_type":"despesa","category_slug":"materiais-limpeza","amount":252.0,"description_internal":"Materiais limpeza","description_public":"Materiais de limpeza","sort_order":21},{"entry_type":"despesa","category_slug":"flores","amount":1025.0,"description_internal":"Flores","description_public":"Flores","sort_order":22},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":331.89,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":23},{"entry_type":"despesa","category_slug":"despesas-diversas","amount":156.0,"description_internal":"Desp. diversas p/trabalho","description_public":"Despesas diversas dos trabalhos","sort_order":24},{"entry_type":"despesa","category_slug":"troca-filtros-tucxa","amount":242.0,"description_internal":"Troca Filtros Tucxa","description_public":"Troca de filtros","sort_order":25},{"entry_type":"despesa","category_slug":"conserto-fechadura-tucxa-1","amount":102.0,"description_internal":"Conserto fechadura Tucxa I","description_public":"Conserto de fechadura","sort_order":26},{"entry_type":"despesa","category_slug":"kombi-combustivel","amount":140.0,"description_internal":"Despesas c/ a kombi - combustível","description_public":"Combustível da Kombi","sort_order":27}]},{"competence_month":"2026-06-01","entry_date":"2026-06-30","opening_balance":-6551.51,"closing_balance":1075.56,"source_label":"Balancete oficial 06/2026 — Balancetes Tucxa 2026-06Jun.pdf","source_file":"Balancetes Tucxa 2026-06Jun.pdf","expected_revenue":20466.4,"expected_expense":12839.33,"rows":[{"entry_type":"receita","category_slug":"mensalidades","amount":4890.0,"description_internal":"Mensalidades","description_public":"Contribuições mensais","sort_order":1},{"entry_type":"receita","category_slug":"doacoes","amount":669.0,"description_internal":"Doações","description_public":"Doações","sort_order":2},{"entry_type":"receita","category_slug":"jornal","amount":30.0,"description_internal":"Jornal","description_public":"Jornal","sort_order":3},{"entry_type":"receita","category_slug":"camisetas","amount":90.0,"description_internal":"Camisetas","description_public":"Camisetas","sort_order":4},{"entry_type":"receita","category_slug":"pizza","amount":1350.0,"description_internal":"Pizza","description_public":"Pizza","sort_order":5},{"entry_type":"receita","category_slug":"festa-junina","amount":13437.4,"description_internal":"Festa junina","description_public":"Festa junina","sort_order":6},{"entry_type":"despesa","category_slug":"pizza","amount":27.14,"description_internal":"Pizza","description_public":"Pizza","sort_order":7},{"entry_type":"despesa","category_slug":"festa-junina","amount":5233.86,"description_internal":"Festa junina","description_public":"Festa junina","sort_order":8},{"entry_type":"despesa","category_slug":"cpfl","amount":363.54,"description_internal":"CPFL","description_public":"Energia elétrica","sort_order":9},{"entry_type":"despesa","category_slug":"sanasa","amount":119.64,"description_internal":"Sanasa","description_public":"Água e saneamento","sort_order":10},{"entry_type":"despesa","category_slug":"iptu","amount":126.2,"description_internal":"IPTU","description_public":"IPTU","sort_order":11},{"entry_type":"despesa","category_slug":"federacao-fucesp","amount":120.0,"description_internal":"Federação - FUCESP","description_public":"Federação e obrigações institucionais","sort_order":12},{"entry_type":"despesa","category_slug":"seguranca","amount":1000.0,"description_internal":"Segurança","description_public":"Segurança","sort_order":13},{"entry_type":"despesa","category_slug":"faxineira","amount":1300.0,"description_internal":"Faxineira","description_public":"Limpeza do espaço","sort_order":14},{"entry_type":"despesa","category_slug":"celular-tucxa","amount":65.0,"description_internal":"Celular Tucxa","description_public":"Telefone e comunicação","sort_order":15},{"entry_type":"despesa","category_slug":"reserva-chacara-confraternizacao","amount":420.0,"description_internal":"Reserva chácara p/confraternização","description_public":"Reserva de chácara para confraternização","sort_order":16},{"entry_type":"despesa","category_slug":"aluguel-tucxa-2","amount":1000.0,"description_internal":"Aluguel e Despesas Tucxa 2","description_public":"Aluguel e despesas do espaço","sort_order":17},{"entry_type":"despesa","category_slug":"flores","amount":1591.0,"description_internal":"Flores","description_public":"Flores","sort_order":18},{"entry_type":"despesa","category_slug":"despesas-bancarias","amount":371.5,"description_internal":"Despesas bancárias","description_public":"Despesas bancárias","sort_order":19},{"entry_type":"despesa","category_slug":"despesas-diversas","amount":102.0,"description_internal":"Desp. diversas p/trabalho","description_public":"Despesas diversas dos trabalhos","sort_order":20},{"entry_type":"despesa","category_slug":"despesa-ventilador-tucxa-1","amount":120.0,"description_internal":"Despesa ventilador Tucxa 1","description_public":"Ventilador Tucxa I","sort_order":21},{"entry_type":"despesa","category_slug":"tinta-tucxa-1","amount":329.45,"description_internal":"Tinta para Tucxa I","description_public":"Tinta para manutenção","sort_order":22},{"entry_type":"despesa","category_slug":"kombi-combustivel","amount":550.0,"description_internal":"Despesas c/ a kombi - combustível","description_public":"Combustível da Kombi","sort_order":23}]}]
$seed$::jsonb;
begin
  select id
    into org_id
  from public.oh_organizations
  where slug = 'tucxa'
     or name ilike '%tucxa%'
  order by created_at asc
  limit 1;

  if org_id is null then
    raise exception 'Organização Tucxa não localizada.';
  end if;

  -- Garante todas as categorias encontradas nos balancetes oficiais.
  for entry_row in
    select *
    from jsonb_to_recordset(categories_data) as category_row(
      entry_type text,
      name text,
      public_name text,
      slug text,
      group_name text,
      sort_order integer
    )
  loop
    insert into public.oh_financial_categories (
      organization_id,
      entry_type,
      name,
      public_name,
      slug,
      group_name,
      public_visible,
      active,
      sort_order,
      metadata,
      updated_at
    )
    values (
      org_id,
      entry_row.entry_type,
      entry_row.name,
      entry_row.public_name,
      entry_row.slug,
      entry_row.group_name,
      true,
      true,
      entry_row.sort_order,
      jsonb_build_object(
        'origin', 'balancetes_oficiais_jan_jun_2026',
        'loadedAt', now()
      ),
      now()
    )
    on conflict (organization_id, entry_type, slug)
    do update set
      name = excluded.name,
      public_name = excluded.public_name,
      group_name = excluded.group_name,
      public_visible = true,
      active = true,
      metadata = coalesce(public.oh_financial_categories.metadata, '{}'::jsonb)
        || excluded.metadata,
      updated_at = now();
  end loop;

  -- Cancela somente a carga provisória anterior de janeiro a junho.
  update public.oh_financial_entries
  set
    status = 'cancelado',
    needs_update = false,
    notes_internal = concat_ws(
      E'\n',
      notes_internal,
      'Substituído em 11/08/2026 pelo balancete oficial em PDF.'
    ),
    updated_at = now()
  where organization_id = org_id
    and competence_month between '2026-01-01'::date and '2026-06-01'::date
    and source_type in ('balancete_provisorio','seed_balancete')
    and status <> 'cancelado';

  for month_row in
    select *
    from jsonb_to_recordset(seed_data) as month_seed(
      competence_month date,
      entry_date date,
      opening_balance numeric,
      closing_balance numeric,
      source_label text,
      source_file text,
      expected_revenue numeric,
      expected_expense numeric,
      rows jsonb
    )
  loop
    insert into public.oh_financial_periods (
      organization_id,
      competence_month,
      status,
      opening_balance,
      closing_balance,
      needs_update,
      source_label,
      approved_at,
      workflow_status,
      data_nature,
      finalized_at,
      notes,
      updated_at
    )
    values (
      org_id,
      month_row.competence_month,
      'confirmado',
      month_row.opening_balance,
      month_row.closing_balance,
      false,
      month_row.source_label,
      now(),
      'finalizado',
      'realizado',
      now(),
      concat(
        'Balancete oficial carregado em 11/08/2026. ',
        'Receitas: R$ ', to_char(month_row.expected_revenue, 'FM999999990D00'), '. ',
        'Despesas: R$ ', to_char(month_row.expected_expense, 'FM999999990D00'), '.'
      ),
      now()
    )
    on conflict (organization_id, competence_month)
    do update set
      status = excluded.status,
      opening_balance = excluded.opening_balance,
      closing_balance = excluded.closing_balance,
      needs_update = excluded.needs_update,
      source_label = excluded.source_label,
      approved_at = excluded.approved_at,
      workflow_status = excluded.workflow_status,
      data_nature = excluded.data_nature,
      finalized_at = excluded.finalized_at,
      notes = excluded.notes,
      updated_at = now()
    returning id into period_id;

    for entry_row in
      select *
      from jsonb_to_recordset(month_row.rows) as balance_entry(
        entry_type text,
        category_slug text,
        amount numeric,
        description_internal text,
        description_public text,
        sort_order integer
      )
    loop
      select id
        into category_id
      from public.oh_financial_categories
      where organization_id = org_id
        and entry_type = entry_row.entry_type
        and slug = entry_row.category_slug
      limit 1;

      if category_id is null then
        raise exception
          'Categoria %/% não localizada.',
          entry_row.entry_type,
          entry_row.category_slug;
      end if;

      insert into public.oh_financial_entries (
        organization_id,
        period_id,
        category_id,
        entry_type,
        entry_date,
        competence_month,
        due_date,
        financial_date,
        financial_month,
        description_internal,
        description_public,
        amount,
        source_type,
        source_reference,
        status,
        workflow_status,
        data_nature,
        is_provisional,
        needs_update,
        public_visible,
        notes_internal,
        metadata,
        approved_at,
        updated_at
      )
      values (
        org_id,
        period_id,
        category_id,
        entry_row.entry_type,
        month_row.entry_date,
        month_row.competence_month,
        month_row.entry_date,
        month_row.entry_date,
        month_row.competence_month,
        entry_row.description_internal,
        entry_row.description_public,
        entry_row.amount,
        'balancete_pdf_2026',
        concat(
          'balancete_pdf_2026:',
          to_char(month_row.competence_month, 'YYYY-MM'),
          ':',
          entry_row.entry_type,
          ':',
          entry_row.category_slug
        ),
        'confirmado',
        'finalizado',
        'realizado',
        false,
        false,
        true,
        concat('Valor realizado conforme ', month_row.source_file, '.'),
        jsonb_build_object(
          'balanceteClientKey',
          concat(
            to_char(month_row.competence_month, 'YYYY-MM'),
            '-',
            entry_row.entry_type,
            '-',
            entry_row.category_slug
          ),
          'sortOrder',
          entry_row.sort_order,
          'sourceFile',
          month_row.source_file,
          'sourceLabel',
          month_row.source_label,
          'importedAt',
          now()
        ),
        now(),
        now()
      )
      on conflict (organization_id, source_type, source_reference)
      do update set
        period_id = excluded.period_id,
        category_id = excluded.category_id,
        entry_type = excluded.entry_type,
        entry_date = excluded.entry_date,
        competence_month = excluded.competence_month,
        due_date = excluded.due_date,
        financial_date = excluded.financial_date,
        financial_month = excluded.financial_month,
        description_internal = excluded.description_internal,
        description_public = excluded.description_public,
        amount = excluded.amount,
        status = excluded.status,
        workflow_status = excluded.workflow_status,
        data_nature = excluded.data_nature,
        is_provisional = excluded.is_provisional,
        needs_update = excluded.needs_update,
        public_visible = excluded.public_visible,
        notes_internal = excluded.notes_internal,
        metadata = excluded.metadata,
        approved_at = excluded.approved_at,
        updated_at = now();
    end loop;

    -- Validação transacional: qualquer divergência interrompe a migration.
    select
      coalesce(sum(amount) filter (
        where entry_type = 'receita'
          and status <> 'cancelado'
          and source_type = 'balancete_pdf_2026'
      ), 0),
      coalesce(sum(amount) filter (
        where entry_type = 'despesa'
          and status <> 'cancelado'
          and source_type = 'balancete_pdf_2026'
      ), 0)
    into actual_revenue, actual_expense
    from public.oh_financial_entries
    where organization_id = org_id
      and competence_month = month_row.competence_month;

    if round(actual_revenue, 2) <> round(month_row.expected_revenue, 2) then
      raise exception
        'Receitas divergentes em %: esperado %, encontrado %.',
        month_row.competence_month,
        month_row.expected_revenue,
        actual_revenue;
    end if;

    if round(actual_expense, 2) <> round(month_row.expected_expense, 2) then
      raise exception
        'Despesas divergentes em %: esperado %, encontrado %.',
        month_row.competence_month,
        month_row.expected_expense,
        actual_expense;
    end if;

    if round(month_row.opening_balance + actual_revenue - actual_expense, 2)
       <> round(month_row.closing_balance, 2) then
      raise exception
        'Saldo final divergente em %.',
        month_row.competence_month;
    end if;
  end loop;

  insert into public.oh_financial_audit_logs (
    organization_id,
    action,
    entity_type,
    after_data,
    justification
  )
  values (
    org_id,
    'balancetes_oficiais_jan_jun_2026_importados',
    'oh_financial_periods',
    jsonb_build_object(
      'periodoInicial', '2026-01-01',
      'periodoFinal', '2026-06-01',
      'mesesRealizados', 6,
      'saldoInicialJaneiro', -10966.98,
      'saldoFinalJunho', 1075.56,
      'origem', 'Balancetes oficiais PDF enviados em 11/08/2026'
    ),
    'Substituição dos valores provisórios de janeiro a junho de 2026 pelos balancetes oficiais.'
  );
end $$;
