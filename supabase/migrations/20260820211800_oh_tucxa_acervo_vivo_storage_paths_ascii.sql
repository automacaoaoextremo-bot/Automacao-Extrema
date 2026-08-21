-- TUCXA / Acervo Vivo
-- Hotfix Ajustes 16: normaliza storage_path de edicoes do Folha Verde
-- cujos nomes originais possuem caracteres fora do conjunto aceito
-- pelo Supabase Storage (ex.: ç, ã).
--
-- IMPORTANTE:
-- - Nao altera original_zip_path nem original_file_name.
-- - Apenas storage_path passa a apontar para a chave ASCII-safe usada no bucket.
-- - Idempotente: pode ser reaplicada sem efeito colateral.

begin;

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2025/3.Marco/Folha_Verde_Marco_2025.pdf'
where metadata ->> 'original_zip_path' = '2025/3.Março/Folha_Verde_Março_2025.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2025/8.Agosto/Edicao Folha Verde_Agosto _2025.pdf'
where metadata ->> 'original_zip_path' = '2025/8.Agosto/Edição Folha Verde_Agosto _2025.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2025/8.Agosto/Edicao Folha Verde_Agosto_2025_rev_02.pdf'
where metadata ->> 'original_zip_path' = '2025/8.Agosto/Edição Folha Verde_Agosto_2025_rev_02.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2026/03_Marco/Folha Verde_Marco_2026.pdf'
where metadata ->> 'original_zip_path' = '2026/03_Março/Folha Verde_Março_2026.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2026/03_Marco/Folha Verde_Marco_2026_Rev_01.pdf'
where metadata ->> 'original_zip_path' = '2026/03_Março/Folha Verde_Março_2026_Rev_01.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2026/03_Marco/Folha Verde_Marco_2026_Rev_02.pdf'
where metadata ->> 'original_zip_path' = '2026/03_Março/Folha Verde_Março_2026_Rev_02.pdf';

update public.oh_acervo_resource_versions
set storage_path = 'folha-verde/2026/03_Marco/Folha Verde_Marco_2026_Rev_03.pdf'
where metadata ->> 'original_zip_path' = '2026/03_Março/Folha Verde_Março_2026_Rev_03.pdf';

commit;

-- Conferencia:
select
  metadata ->> 'original_zip_path' as original_zip_path,
  storage_path
from public.oh_acervo_resource_versions
where metadata ->> 'original_zip_path' in (
  '2025/3.Março/Folha_Verde_Março_2025.pdf',
  '2025/8.Agosto/Edição Folha Verde_Agosto _2025.pdf',
  '2025/8.Agosto/Edição Folha Verde_Agosto_2025_rev_02.pdf',
  '2026/03_Março/Folha Verde_Março_2026.pdf',
  '2026/03_Março/Folha Verde_Março_2026_Rev_01.pdf',
  '2026/03_Março/Folha Verde_Março_2026_Rev_02.pdf',
  '2026/03_Março/Folha Verde_Março_2026_Rev_03.pdf'
)
order by original_zip_path;
