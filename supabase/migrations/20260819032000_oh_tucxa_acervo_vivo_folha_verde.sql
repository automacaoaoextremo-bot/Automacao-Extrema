-- Folha Verde 2025/2026 — índice/versionamento inicial a partir do ZIP fornecido.
-- Os arquivos permanecem externos ao banco; metadata registra o caminho original para posterior vínculo (Drive/Storage).
do $$
declare
  tucxa_id uuid;
  v_resource_id uuid;
begin
  select id into tucxa_id from public.oh_organizations where slug='tucxa' or name ilike '%tucxa%' order by created_at desc limit 1;
  if tucxa_id is null then return; end if;

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Fevereiro/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Fevereiro/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',2,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/2.Fevereiro/Jornal Folha Verd Fevereiro_2025.pdf','original_file_name','Jornal Folha Verd Fevereiro_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Março/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Março/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',3,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/3.Março/Folha_Verde_Março_2025.pdf','original_file_name','Folha_Verde_Março_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Abril/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Abril/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',4,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/4.Abril/FolhaVerde_Abril_Rev0_2025.pdf','original_file_name','FolhaVerde_Abril_Rev0_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Maio/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Maio/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',5,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/5.Maio/Folha Verde_Maio_2025.pdf','original_file_name','Folha Verde_Maio_2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/5.Maio/Folha Verde_Maio_2025_rev.1.pdf','original_file_name','Folha Verde_Maio_2025_rev.1.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/5.Maio/Folha Verde_Maio_2025_rev.2.pdf','original_file_name','Folha Verde_Maio_2025_rev.2.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 03') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 03',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/5.Maio/Folha Verde_Maio_2025_rev.3.pdf','original_file_name','Folha Verde_Maio_2025_rev.3.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 04') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 04',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/5.Maio/Folha Verde_Maio_Rev_04_2025.pdf','original_file_name','Folha Verde_Maio_Rev_04_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 04';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Junho/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Junho/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',6,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/6.Junho/Folha Verde_rev_0_Junho_2025.pdf','original_file_name','Folha Verde_rev_0_Junho_2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/6.Junho/Folha Verde_rev_1_Junho_2025.pdf','original_file_name','Folha Verde_rev_1_Junho_2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/6.Junho/Folha Verde_rev_2_Junho_2025.pdf','original_file_name','Folha Verde_rev_2_Junho_2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 03') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 03',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/6.Junho/Folha Verde_rev_3_Junho_2025.pdf','original_file_name','Folha Verde_rev_3_Junho_2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 04') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 04',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/6.Junho/Folha Verde_rev_4_Junho_2025.pdf','original_file_name','Folha Verde_rev_4_Junho_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 04';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Agosto/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Agosto/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',8,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/8.Agosto/Edição Folha Verde_Agosto _2025.pdf','original_file_name','Edição Folha Verde_Agosto _2025.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/8.Agosto/Edição Folha Verde_Agosto_2025_rev_02.pdf','original_file_name','Edição Folha Verde_Agosto_2025_rev_02.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 02';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Setembro/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Setembro/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',9,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/9.Setembro/Setembro_FolhaVerde_2025rev_01.pdf','original_file_name','Setembro_FolhaVerde_2025rev_01.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/9.Setembro/Setembro_FolhaVerde_2025rev_02.pdf','original_file_name','Setembro_FolhaVerde_2025rev_02.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 03') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 03',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/9.Setembro/Setembro_FolhaVerde_2025rev_03.pdf','original_file_name','Setembro_FolhaVerde_2025rev_03.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 03';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Outubro/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Outubro/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',10,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/10.Outubro/Outubro_FolhaVerde_2025rev_00.pdf','original_file_name','Outubro_FolhaVerde_2025rev_00.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/10.Outubro/Outubro_FolhaVerde_2025rev_01.pdf','original_file_name','Outubro_FolhaVerde_2025rev_01.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/10.Outubro/Outubro_FolhaVerde_2025rev_02.pdf','original_file_name','Outubro_FolhaVerde_2025rev_02.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 03') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 03',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/10.Outubro/Outubro_FolhaVerde_2025rev_03.pdf','original_file_name','Outubro_FolhaVerde_2025rev_03.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 04') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 04',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/10.Outubro/Outubro_FolhaVerde_2025rev_04.pdf','original_file_name','Outubro_FolhaVerde_2025rev_04.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 04';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Novembro/2025' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Novembro/2025','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2025,'month',11,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2025/11.Novembro/FolhaVerde_Novembro_2025.pdf','original_file_name','FolhaVerde_Novembro_2025.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Janeiro/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Janeiro/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',1,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/01_Janeiro/Folha Verde_Janeiro.pdf','original_file_name','Folha Verde_Janeiro.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Fevereiro/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Fevereiro/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',2,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/02_Fevereiro/Folha Verde_Fevereiro_2026_rev01.pdf','original_file_name','Folha Verde_Fevereiro_2026_rev01.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 01';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Março/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Março/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',3,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/03_Março/Folha Verde_Março_2026.pdf','original_file_name','Folha Verde_Março_2026.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 01') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 01',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/03_Março/Folha Verde_Março_2026_Rev_01.pdf','original_file_name','Folha Verde_Março_2026_Rev_01.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 02') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 02',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/03_Março/Folha Verde_Março_2026_Rev_02.pdf','original_file_name','Folha Verde_Março_2026_Rev_02.pdf'));
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 03') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 03',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/03_Março/Folha Verde_Março_2026_Rev_03.pdf','original_file_name','Folha Verde_Março_2026_Rev_03.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 03';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Abril/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Abril/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',4,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/04_Abril/Folha Verde_Abril2026.pdf','original_file_name','Folha Verde_Abril2026.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Maio/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Maio/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',5,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/05_Maio/Folha_Verde_Maio2026.pdf','original_file_name','Folha_Verde_Maio2026.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

  select id into v_resource_id from public.oh_acervo_resources where organization_id=tucxa_id and title='Folha Verde — Junho/2026' limit 1;
  if v_resource_id is null then
    insert into public.oh_acervo_resources (organization_id,resource_type,title,description,subjects,audience,governance_status,active,metadata) values (tucxa_id,'folha_verde','Folha Verde — Junho/2026','Edição mensal do Folha Verde. Histórico de revisões preservado no Acervo Vivo.',array['folha verde','formação','memória']::text[],array['filhos da corrente']::text[],'em_revisao',true,jsonb_build_object('year',2026,'month',6,'source','2025e2026.zip')) returning id into v_resource_id;
  end if;
  if not exists (select 1 from public.oh_acervo_resource_versions where resource_id=v_resource_id and version_label='Rev. 00') then
    insert into public.oh_acervo_resource_versions (organization_id,resource_id,version_label,is_current,notes,metadata) values (tucxa_id,v_resource_id,'Rev. 00',false,'Arquivo original ainda sem URL público; vincular na gestão do Acervo Vivo.',jsonb_build_object('original_zip_path','2026/06_Junho/Folha_verde_Junho2026.pdf','original_file_name','Folha_verde_Junho2026.pdf'));
  end if;
  update public.oh_acervo_resource_versions set is_current=false where resource_id=v_resource_id;
  update public.oh_acervo_resource_versions set is_current=true where resource_id=v_resource_id and version_label='Rev. 00';

end $$;
