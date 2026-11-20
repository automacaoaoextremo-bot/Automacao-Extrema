-- AE Atendimento Inteligente RMC - Ajustes 17.
-- APLICAR APENAS apos migracao 16, inicialmente no ambiente de homologacao.
-- Criacao idempotente de tipos de servico: sem valor de mao de obra ficticio.
-- Nao altera usuarios, acessos, contratos ou orcamentos existentes.

insert into public.ae_ai_rmc_catalog (organization_id, kind, name, details, is_default)
select org.id, 'service', category.title,
       jsonb_build_object('category',category.title), false
from public.ae_ai_organizations org
cross join (values
    ('Elétrica'), ('Hidráulica'), ('Vazamentos'), ('Portas e janelas'),
    ('Telhado'), ('Limpeza de caixa d’água'), ('Jardinagem'), ('Pintura'),
    ('Instalação de móveis'), ('Instalação de eletrodomésticos'),
    ('Quadros, suportes e prateleiras'), ('Outros serviços')
) as category(title)
where org.slug='reparos-rmc'
on conflict do nothing;
