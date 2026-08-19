-- Catálogo legado da Biblioteca do Tucxa (planilha 2011) — importação inicial do Acervo Vivo v1
-- Gerado a partir de 'Bibliotecan - Tucxa - 2011.xls'. Duplicidades de código+título entre abas foram removidas.
do $$
declare
  tucxa_id uuid;
  current_title_id uuid;
begin
  select id into tucxa_id from public.oh_organizations where slug='tucxa' or name ilike '%tucxa%' order by created_at desc limit 1;
  if tucxa_id is null then return; end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='50 anos depois' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'50 Anos Depois','50 anos depois',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 2 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 2 - 1','ACV-R-2-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 2 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 2 - 2','ACV-R-2-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 2 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 2 - 3','ACV-R-2-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='52 licoes de catecismo espirita' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'52 Lições de Catecismo Espírita','52 licoes de catecismo espirita',array['Eliseu Rigonatti']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -10' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -10','ACV-T-10','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a caminho da luz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A caminho da Luz','a caminho da luz',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 28' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 28','ACV-T-28','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a caminho do abismo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Caminho do Abismo','a caminho do abismo',array['Antônio de Lima']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 41' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 41','ACV-R-41','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a casa assombrada' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Casa Assombrada','a casa assombrada',array['Dr. Adolfo Bezerra de Menezes']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 177' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 177','ACV-R-177','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a casa do escritor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Casa do Escritor','a casa do escritor',array['Espírito Patrícia - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 11 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 11 - 1','ACV-R-11-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 11 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 11 - 2','ACV-R-11-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 11 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 11 - 3','ACV-R-11-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a dor do meu destino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Dor do Meu Destino','a dor do meu destino',array['Fernando do Ó']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 37' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 37','ACV-R-37','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 37 -1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 37 -1','ACV-R-37-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a dor que nao tem nome' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A dor que não tem nome','a dor que nao tem nome',array['Maria Eugênia de Azevedo']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 17' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 17','ACV-D-17','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a extincao do desejo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Extinção do Desejo','a extincao do desejo',array['Michael Boylan']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 191' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 191','ACV-R-191','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a forca da bondade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Força da Bondade','a forca da bondade',array['Espírito de Lucius - André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 74' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 74','ACV-R-74','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 74 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 74 - 1','ACV-R-74-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a granja do silencio' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A granja do Silêncio','a granja do silencio',array['Paul Bodier']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 33' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 33','ACV-R-33','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a gruta das orquidias' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Gruta das Orquídias','a gruta das orquidias',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 109 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 109 - 1','ACV-R-109-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a genese' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Gênese','a genese','{}'::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 4 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 4 - 1','ACV-K-4-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 4 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 4 - 2','ACV-K-4-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a gondola prateada' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A gôndola Prateada','a gondola prateada',array['Mário T. Tamassia']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 64' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 64','ACV-R-64','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a imensidao dos sentidos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A imensidão dos sentidos','a imensidao dos sentidos',array['Espírito de Hammed - Espírito Santo Neto']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 66' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 66','ACV-M-66','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a indigente' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A indigente','a indigente',array['Armando Fernandes de Oliveira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 22' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 22','ACV-R-22','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 135' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 135','ACV-R-135','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a janela do meio' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Janela do meio','a janela do meio',array['Elisabeth Goudge']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 23 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 23 - 1','ACV-R-23-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 23 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 23 - 2','ACV-R-23-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a lenda do castelo de montinhoso' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Lenda do castelo de Montinhoso','a lenda do castelo de montinhoso',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 16','ACV-R-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a mansao renoir' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Mansão Renoir','a mansao renoir',array['Espírito de Alfredo - Dolores Bacelar']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 55' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 55','ACV-R-55','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a mediunidade sem lagrimas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Mediunidade sem Lágrimas','a mediunidade sem lagrimas',array['Eliseu Rigonatti']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -12 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -12 - 1','ACV-T-12-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -12 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -12 - 2','ACV-T-12-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a mae que desistiu do ceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Mãe que desistiu do Céu','a mae que desistiu do ceu',array['Mário T. Tamassia']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 65' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 65','ACV-R-65','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a passagem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Passagem','a passagem',array['Ricky Medeiros']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 105' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 105','ACV-R-105','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a prece segundo o evangelho' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A prece segundo o Evangelho','a prece segundo o evangelho','{}'::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 8 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 8 - 1','ACV-K-8-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a reencarnacao sem misterios' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Reencarnação sem Mistérios','a reencarnacao sem misterios',array['José Carlos de Camargo Ferraz']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -24' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -24','ACV-T-24','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a sabedoria de socrates e o cristianismo redivivo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Sabedoria de Sócrates e o Cristianismo Redivivo','a sabedoria de socrates e o cristianismo redivivo',array['Leonardo Machado']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 61' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 61','ACV-T-61','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a trajetoria dos goes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Trajetória dos Góes','a trajetoria dos goes',array['Espírito Emílio S. Góes - Hilda C. de Lima']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 83' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 83','ACV-R-83','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a verdade de cada um' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A verdade de cada um','a verdade de cada um',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 11 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 11 - 1','ACV-Z-11-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 11 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 11 - 2','ACV-Z-11-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a vida de maria das dores' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A vida de Maria das Dores','a vida de maria das dores',array['Amaury Fonseca']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 137' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 137','ACV-R-137','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a vidente de prevorst' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A Vidente de Prevorst','a vidente de prevorst',array['Dr Justinus kerner']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 36' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 36','ACV-T-36','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='a vinganca do judeu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'A vingança do Judeu','a vinganca do judeu',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 13' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 13','ACV-R-13','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='abadia dos beneditinos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Abadia dos Beneditinos','abadia dos beneditinos',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 17' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 17','ACV-R-17','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='agenda crista' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Agenda Cristã','agenda crista','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 6 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 6 - 1','ACV-A-6-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 6 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 6 - 2','ACV-A-6-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 6 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 6 - 3','ACV-A-6-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ala dezoito' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ala Dezoito','ala dezoito',array['Wilson Frungilo Júnior']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 43' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 43','ACV-R-43','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='algemas abertas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Algemas Abertas','algemas abertas',array['Armando Fernandes de Oliveira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 134' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 134','ACV-R-134','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='alguem chorou por mim' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Alguém chorou por mim','alguem chorou por mim',array['Fernando do Ó']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 35 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 35 - 1','ACV-R-35-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 35 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 35 - 2','ACV-R-35-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='almas crucificadas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Almas Crucificadas','almas crucificadas',array['Zilda Gama']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 29' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 29','ACV-R-29','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='amai os inimigos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'amai os inimigos','amai os inimigos',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 95' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 95','ACV-R-95','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='amor e sabedoria de emmanuel' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Amor e Sabedoria de Emmanuel','amor e sabedoria de emmanuel',array['Clovis Tavares']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 32' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 32','ACV-T-32','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='anjos da caridade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Anjos da Caridade','anjos da caridade',array['Espírito Irmão Virgílio - Antonio Demarchi']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 130' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 130','ACV-R-130','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='antenas de luz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Antenas de Luz','antenas de luz',array['Espírito de Laurinho - P. Basile, F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 9','ACV-D-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='apenas uma sombra de mulher' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Apenas uma Sombra de Mulher','apenas uma sombra de mulher',array['Fernando do Ó']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 36' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 36','ACV-R-36','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='as casas mal assombradas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'As Casas Mal Assombradas','as casas mal assombradas',array['Camille Flammarion']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 45' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 45','ACV-R-45','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='as dores da alma' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'As Dores da Alma','as dores da alma',array['Espírito de Hammed - Espírito Santo Neto']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 42' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 42','ACV-M-42','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='as forcas do bem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'As forças do bem','as forcas do bem',array['Diamantino Coelho Fernandes']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 40' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 40','ACV-T-40','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='as virtudes divinas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'As Virtudes Divinas','as virtudes divinas',array['Ken O'' Donnell']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 70' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 70','ACV-M-70','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ave cristo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ave, Cristo','ave cristo',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 3 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 3 - 1','ACV-R-3-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='acao e reacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ação e Reação','acao e reacao','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 10' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 10','ACV-A-10','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 10 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 10 - 1','ACV-A-10-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='bairro dos estranhos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Bairro dos Estranhos','bairro dos estranhos',array['Wilson Frungilo Júnior']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 44' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 44','ACV-R-44','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='bastidores da mediunidade cronicas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Bastidores da Mediunidade - crônicas','bastidores da mediunidade cronicas',array['Espírito de Nora - Emanuel Cristiano']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 97' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 97','ACV-R-97','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='boa nova' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Boa Nova','boa nova',array['Espírito de Humberto de Campos - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 23 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 23 - 3','ACV-M-23-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='brasil coracao do mundo patria do evangelho' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Brasil Coração do Mundo, Pátria do Evangelho','brasil coracao do mundo patria do evangelho',array['Espírito Humberto de Campos - F. C. Xavier']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 27' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 27','ACV-T-27','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='busca e acharas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Busca e Acharás','busca e acharas',array['Espírito de André Luiz, Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 6 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 6 - 1','ACV-M-6-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 6 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 6 - 2','ACV-M-6-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='cabana de sonhos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Cabana de Sonhos','cabana de sonhos',array['Espírito Luiz Sérgio-Irene Pacheco Machado']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 114' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 114','ACV-R-114','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='cabocla' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Cabocla','cabocla',array['Espírito de Jussara - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 10' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 10','ACV-R-10','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='calvario redentor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Calvário Redentor','calvario redentor',array['Espírito José Euclides - Antonieta V Meyer']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 25' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 25','ACV-R-25','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='caminho verdade e vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Caminho, Verdade e Vida','caminho verdade e vida',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 10 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 10 - 1','ACV-M-10-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='catecismo de umbanda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Catecismo de Umbanda','catecismo de umbanda',array['Lex Umbanda']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 9','ACV-U-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='cinzas do passado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Cinzas do Passado','cinzas do passado',array['Espírito Lucius - Sandra Carneiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 140' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 140','ACV-R-140','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='claramente vivos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Claramente vivos','claramente vivos',array['Espíritos Diversos - E. Barbosa, F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 4','ACV-D-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='colonia capela' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Colònia Capela','colonia capela',array['Espírito Yehoshua bem Nun - Pedro de Campos']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 195' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 195','ACV-R-195','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='com o amor nao se brinca' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Com o amor não se brinca','com o amor nao se brinca',array['Espírito Leonel - Mônica de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 163' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 163','ACV-R-163','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='como vivem os espiritos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Como Vivem os Espíritos','como vivem os espiritos',array['Antonio F. Rodrigues']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -23' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -23','ACV-T-23','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='conduta espirita' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Conduta Espírita','conduta espirita','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 13 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 13 - 1','ACV-A-13-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 13 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 13 - 2','ACV-A-13-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 13 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 13 - 3','ACV-A-13-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='construir o homem e o futuro' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Construir o Homem e o Futuro','construir o homem e o futuro',array['Michel Quoist']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 43' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 43','ACV-T-43','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='contos que a vida conta' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Contos que a vida conta','contos que a vida conta',array['Henrique Rodrigues']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 37' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 37','ACV-T-37','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='conversando com deus' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Conversando com Deus','conversando com deus',array['Neale Donald Walsch']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 190' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 190','ACV-R-190','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='conversando com os espiritos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Conversando com os Espíritos','conversando com os espiritos',array['James Van Praagh']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 201' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 201','ACV-R-201','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='conversando contigo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Conversando contigo','conversando contigo',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 20' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 20','ACV-Z-20','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='coracoes sem destino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Corações sem Destino','coracoes sem destino',array['Espírito Schellida - Eliana Machado Coelho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 161' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 161','ACV-R-161','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='corpo fechado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Corpo Fechado','corpo fechado',array['Espírito W. Voltz - Robson Pinheiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 176' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 176','ACV-R-176','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='correntes do destino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Correntes do Destino','correntes do destino',array['Espírito M. Cecília Alves - Célia X. Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 160' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 160','ACV-R-160','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='cultura umbandistica' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Cultura Umbandística','cultura umbandistica',array['B. de Freitas, R. T. Soares, W. C. Oliveira']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 5','ACV-U-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='curso basico de espiritismo 2 ano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Curso Básico de Espiritismo 2 ano','curso basico de espiritismo 2 ano',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -8' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -8','ACV-T-8','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='curso de educacao mediunica 1ano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Curso de Educação Mediúnica 1ano','curso de educacao mediunica 1ano',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -6','ACV-T-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='curso de educacao mediunica 2ano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Curso de Educação Mediúnica 2ano','curso de educacao mediunica 2ano',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -7' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -7','ACV-T-7','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ceu azul' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Céu Azul','ceu azul',array['Espírito Cesar A. Melero - Célia X. Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 133' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 133','ACV-R-133','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='da terra para o ceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Da Terra Para o Céu','da terra para o ceu',array['Espírito Públio, H de Campos- André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 182' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 182','ACV-R-182','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='de volta ao passado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'De volta ao passado','de volta ao passado',array['Espírito Cesar A. Melero - Célia X. Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 94' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 94','ACV-R-94','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='deficiente mental por que fui um' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Deficiente mental - Por que fui um?','deficiente mental por que fui um',array['Espíritos Diversos - Vera Lúcia M Carvalho']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 15' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 15','ACV-D-15','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='depende de nos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Depende De Nós','depende de nos',array['Espírito Eça de Queirós- Wanda A. Canutti']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 166' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 166','ACV-R-166','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='desobsessao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Desobsessão','desobsessao','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 15 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 15 - 1','ACV-A-15-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 15 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 15 - 2','ACV-A-15-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='despertar para a vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Despertar para a vida','despertar para a vida',array['Epírito de Schellida- Eliana Machado Coelho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 117' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 117','ACV-R-117','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='deus estava com ele' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Deus estava com ele','deus estava com ele',array['Elisa Masselli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 87' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 87','ACV-R-87','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='deus por testemunha' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Deus Por Testemunha','deus por testemunha',array['Espírito Blande - Maria Aparecida C. Sales']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 142' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 142','ACV-R-142','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='devassando o invisivel' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'devassando o invisível','devassando o invisivel',array['Yvonne A. Pereira']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 30' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 30','ACV-T-30','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='dicionario de umbanda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Dicionário de Umbanda','dicionario de umbanda',array['G. A. Pepe']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 10' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 10','ACV-U-10','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='do calvario ao infinito' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Do Calvário ao Infinito','do calvario ao infinito',array['Zilda Gama']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 26 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 26 - 2','ACV-R-26-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='do outro lado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Do Outro Lado','do outro lado',array['Wilson Frungilo Júnior']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 42' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 42','ACV-R-42','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='do outro lado da cruz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Do Outro Lado da Cruz','do outro lado da cruz',array['Espírito Fénelon - Dario Sandri Jr']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 151' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 151','ACV-R-151','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='do outro lado da vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Do Outro Lado da Vida','do outro lado da vida',array['Ricardo Magalhães']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 18' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 18','ACV-D-18','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='do outro lado do espelho' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Do Outro Lado Do Espelho','do outro lado do espelho',array['Espírito Inácio Ferreira - Carlos A. Baccelli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 116' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 116','ACV-R-116','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='doce entardecer' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Doce entardecer','doce entardecer',array['Espírito Margarida da Cunha- Sulamita Santos']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 138' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 138','ACV-R-138','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='dr fritz o medico e sua missao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Dr Fritz O Médico e sua Missão','dr fritz o medico e sua missao',array['Maurício da Silva Magalhães']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 38' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 38','ACV-T-38','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='dramas da paixao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Dramas da Paixão','dramas da paixao',array['Espírito José Antônio - Ana Cristina Vargas']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 175' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 175','ACV-R-175','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='duas vidas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Duas Vidas','duas vidas',array['Espírito de Virgínia - Antonieta V. Meyer']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 79' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 79','ACV-R-79','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='e a vida continua' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'E a Vida Continua','e a vida continua','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 16','ACV-A-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 16 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 16 - 1','ACV-A-16-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='educacao mediunica tomo i' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Educação Mediúnica Tomo I','educacao mediunica tomo i',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -2','ACV-T-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='educacao mediunica tomo ii' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Educação Mediúnica Tomo II','educacao mediunica tomo ii',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -3','ACV-T-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='educacao mediunica tomo iii' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Educação Mediúnica Tomo III','educacao mediunica tomo iii',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -4','ACV-T-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='educacao mediunica tomo iv' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Educação Mediúnica Tomo IV','educacao mediunica tomo iv',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -5','ACV-T-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='em busca da ilusao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Em Busca da Ilusão','em busca da ilusao',array['Espírito Jesus Gonçalves - Célia X. Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 92' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 92','ACV-R-92','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='emmanuel' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Emmanuel','emmanuel',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 29' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 29','ACV-T-29','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='encontro marcado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Encontro marcado','encontro marcado',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 15' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 15','ACV-M-15','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='enderecos da paz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Endereços da Paz','enderecos da paz',array['Espírito de André Luiz - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 2','ACV-M-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='entre a terra e o ceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Entre a Terra e o Céu','entre a terra e o ceu','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 8' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 8','ACV-A-8','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='entre o amor e a guerra' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Entre o Amor e a Guerra','entre o amor e a guerra',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 9','ACV-Z-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='enxugando lagrimas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Enxugando Lágrimas','enxugando lagrimas',array['Espíritos Diversos - E. Barbosa, F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 3 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 3 - 1','ACV-D-3-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 3 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 3 - 2','ACV-D-3-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='esmeralda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Esmeralda','esmeralda',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 3 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 3 - 1','ACV-Z-3-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='espinhos do tempo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Espinhos do Tempo','espinhos do tempo',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 25' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 25','ACV-Z-25','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='estamos todos reencarnados' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Estamos Todos Reencarnados','estamos todos reencarnados',array['Maria Augusta Ferreira Puhlmann']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 178' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 178','ACV-R-178','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='estela' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Estela','estela',array['Camille Flammarion']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 46' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 46','ACV-R-46','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='estrada de damasco' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Estrada de Damasco','estrada de damasco',array['Antônio Lima']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 39' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 39','ACV-R-39','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='estudo e vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Estudo e Vida','estudo e vida',array['Espírito André Luiz, Emmanuel - W.Vieira, FC Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 5 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 5 - 2','ACV-M-5-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='evolucao em dois mundos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Evolução em Dois Mundos','evolucao em dois mundos','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 11 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 11 - 1','ACV-A-11-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 11 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 11 - 2','ACV-A-11-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='evolucao para o terceiro milenio' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Evolução Para o Terceiro Milênio','evolucao para o terceiro milenio',array['Carlos Toledo Rizzini']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 47 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 47 - 2','ACV-T-47-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='exilados por amor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Exilados por Amor','exilados por amor',array['Espírito Lucius - Sandra Carneiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 148' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 148','ACV-R-148','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='expiacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Expiação','expiacao',array['Areolino Gurjão']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 50' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 50','ACV-R-50','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='falando a terra' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Falando à Terra','falando a terra',array['Espíritos diversos - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 28' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 28','ACV-M-28','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='favos de luz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Favos de Luz','favos de luz',array['Espírito Miramez - João Nunes Maia']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 62' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 62','ACV-T-62','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='faz parte do meu show' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Faz Parte do Meu Show','faz parte do meu show',array['Espírito Ângelo Inácio - Robson Pinheiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 155' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 155','ACV-R-155','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='filho adotivo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Filho Adotivo','filho adotivo',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 9','ACV-R-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='fisiologia da alma' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Fisiologia da Alma','fisiologia da alma',array['idem']::text[],array['RAMATIS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 5','ACV-RA-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 5 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 5 - 1','ACV-RA-5-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='fluidos passes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Fluidos & Passes','fluidos passes',array['Centro Espírita Allan Kardec - Campinas']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -14' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -14','ACV-T-14','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='forca para recomecar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Força Para Recomeçar','forca para recomecar',array['Espírito Schellida - Eliana Machado Coelho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 139' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 139','ACV-R-139','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='gaveta de esperanca' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Gaveta de Esperança','gaveta de esperanca',array['Espírito de Laurinho - Priscila P. S. Basile']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 8' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 8','ACV-D-8','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='herculanum' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Herculanum','herculanum',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 15 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 15 - 1','ACV-R-15-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 15 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 15 - 2','ACV-R-15-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='herdeiros do novo mundo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Herdeiros do Novo Mundo','herdeiros do novo mundo',array['Espírito de Lucius - André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 181' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 181','ACV-R-181','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='historias animais que as pessoas contam' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Histórias Animais que as Pessoas Contam','historias animais que as pessoas contam',array['Marcel Benedeti']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 189' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 189','ACV-R-189','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ha 2000 anos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Há 2000 Anos...','ha 2000 anos',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 1 - 2','ACV-R-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 1 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 1 - 3','ACV-R-1-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 1 - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 1 - 4','ACV-R-1-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 1 - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 1 - 5','ACV-R-1-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='imagens do alem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Imagens do Além','imagens do alem',array['Espírito de Lucius - Heigorina Cunha']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 25' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 25','ACV-T-25','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='incenso' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Incenso','incenso',array['Leo Vinci']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 12' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 12','ACV-U-12','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='infinitas moradas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Infinitas Moradas','infinitas moradas',array['Espírito Inácio Ferreira - Carlos A. Baccelli']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 66' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 66','ACV-T-66','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='instrumentos do tempo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Instrumentos do Tempo','instrumentos do tempo',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 7' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 7','ACV-M-7','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='jerusa' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Jerusa','jerusa',array['Olympia S Belém']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 136' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 136','ACV-R-136','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='joana d arc' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Joana D Arc','joana d arc',array['Léon Denis']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 32 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 32 - 1','ACV-R-32-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 32 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 32 - 2','ACV-R-32-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='kardecistas e umbandistas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Kardecistas e Umbandistas','kardecistas e umbandistas',array['Paulo de Deus']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 6','ACV-U-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lacos eternos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Laços Eternos','lacos eternos',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 1 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 1 - 1','ACV-Z-1-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 1 - 2','ACV-Z-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 1 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 1 - 3','ACV-Z-1-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lembrancas que o vento traz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Lembranças Que o Vento Traz','lembrancas que o vento traz',array['Espírito Leonel - Mônica de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 185' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 185','ACV-R-185','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='libertacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Libertação','libertacao','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 1','ACV-A-7-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 2','ACV-A-7-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 3','ACV-A-7-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 4','ACV-A-7-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 5','ACV-A-7-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 7 - 6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 7 - 6','ACV-A-7-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lindos casos da mediunidade gloriosa' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Lindos Casos da Mediunidade Gloriosa','lindos casos da mediunidade gloriosa',array['Ramiro Gama']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 6','ACV-D-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lindos casos de bezerra de menezes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Lindos casos de Bezerra de Menezes','lindos casos de bezerra de menezes',array['Ramiro Gama']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 34' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 34','ACV-T-34','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='livre para voar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Livre para Voar','livre para voar',array['Wilson Frungilo Jr.']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 76' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 76','ACV-R-76','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='loucura e obsessao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Loucura e Obsessão','loucura e obsessao',array['Divaldo P. Franco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -18' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -18','ACV-T-18','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='luta redentora' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Luta Redentora','luta redentora',array['José Thomás da Silva Sobrinho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 53' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 53','ACV-R-53','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lazaro redivivo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Lázaro Redivivo','lazaro redivivo',array['Espírito Irmão X - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 43' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 43','ACV-M-43','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='lirios de esperanca' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Lírios de Esperança','lirios de esperanca',array['Espírito Ermance Dufaux - Wanderley S Oliveira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 173' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 173','ACV-R-173','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mais alem do meu ollhar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mais Além do Meu Ollhar','mais alem do meu ollhar',array['Espírito de Luiz Sérgio - Irene P. Machado']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 67' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 67','ACV-M-67','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mais uma vez e preciso recomecar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mais uma vez é preciso Recomeçar','mais uma vez e preciso recomecar',array['Espírito Sofia - Marise Ceban']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 156' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 156','ACV-R-156','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mansao dos lilazes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mansão dos Lilazes','mansao dos lilazes',array['Célia Xavier de Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 186' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 186','ACV-R-186','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='manual do passista' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Manual do Passista','manual do passista',array['Jacob Melo']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 50' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 50','ACV-T-50','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='marcas do passado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Marcas do Passado','marcas do passado',array['Armando Fernandes de Oliveira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 84' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 84','ACV-R-84','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='marta' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Marta','marta',array['Fernando do Ó']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 38' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 38','ACV-R-38','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mecanismos da mediunidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mecanismos da Mediunidade','mecanismos da mediunidade','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 12 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 12 - 1','ACV-A-12-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 12 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 12 - 2','ACV-A-12-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 12 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 12 - 3','ACV-A-12-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='medida drastica' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Medida Drástica','medida drastica',array['Espírito Eça de Queirós- Wanda A. Canutti']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 127' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 127','ACV-R-127','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mediunidade de cura' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mediunidade de Cura','mediunidade de cura',array['Ramatis - Psicografia Hercílio Maes']::text[],array['RAMATIS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 1 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 1 - 1','ACV-RA-1-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mediunismo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mediunismo','mediunismo',array['Ramatis - Psicografia Hercílio Maes']::text[],array['RAMATIS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 7' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 7','ACV-RA-7','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='memorias de um suicida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Memórias de um Suicida','memorias de um suicida',array['Yonne A. Pereira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 49' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 49','ACV-R-49','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mensagem de esperanca' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mensagem de Esperança','mensagem de esperanca',array['Celso Martins']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 42' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 42','ACV-T-42','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='meu filho voltou' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Meu Filho Voltou!','meu filho voltou',array['Anna Louzada']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 159' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 159','ACV-R-159','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='meu filho minha escolha' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Meu Filho, Minha Escolha','meu filho minha escolha',array['Glauco Damas']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 126' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 126','ACV-R-126','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='missionarios da luz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Missionários da Luz','missionarios da luz','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 3','ACV-A-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='missao do espiritismo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Missão do Espiritismo','missao do espiritismo',array['Ramatis - Psicografia Hercílio Maes']::text[],array['RAMATIS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 2','ACV-RA-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='morrer nao e o fim' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Morrer não é o Fim','morrer nao e o fim',array['Admir Serrano']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 59' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 59','ACV-T-59','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='morte e vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Morte é Vida','morte e vida',array['Zilda G. Rosin']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 10' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 10','ACV-D-10','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='muitas vidas muitos mestres' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Muitas Vidas, Muitos Mestres','muitas vidas muitos mestres',array['Brian L. Weiss, M.D.']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 89' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 89','ACV-R-89','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='muitos sao os chamados' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Muitos são os Chamados','muitos sao os chamados',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 8' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 8','ACV-R-8','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mulheres fascinantes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mulheres Fascinantes','mulheres fascinantes',array['Espírito Léon Tolstoi - Cirinéia Iolanda Maffei']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 174' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 174','ACV-R-174','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='mulheres valentes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mulheres Valentes','mulheres valentes',array['Espírito de Júlio - Anita Godoy']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 122' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 122','ACV-R-122','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='maos unidas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Mãos Unidas','maos unidas',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 57' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 57','ACV-M-57','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na estrada da vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na estrada da vida','na estrada da vida',array['H. A. Annes']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 39' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 39','ACV-T-39','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na fronteira' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na Fronteira','na fronteira',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 69' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 69','ACV-R-69','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na maior das perdas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na Maior Das Perdas','na maior das perdas',array['Regis de Moraes']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 64' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 64','ACV-M-64','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na ponta dos pes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na Ponta dos Pés','na ponta dos pes',array['Espírito José Antônio - Ana Cristina Vargas']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 125' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 125','ACV-R-125','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na proxima dimensao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na Próxima Dimensão','na proxima dimensao',array['Espírito Inácio Ferreira - Carlos A. Baccelli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 184' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 184','ACV-R-184','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='na sombra e na luz' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Na Sombra e na Luz','na sombra e na luz',array['Zilda Gama']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 27' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 27','ACV-R-27','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nada fica sem resposta' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nada Fica Sem Resposta','nada fica sem resposta',array['Elisa Masselli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 171' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 171','ACV-R-171','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nada e como parece' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nada é como parece','nada e como parece',array['Espírito Marco Aurélio - Marcelo Cezar']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 119' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 119','ACV-R-119','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nada e por acaso' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nada é por acaso','nada e por acaso',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 27' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 27','ACV-Z-27','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nas fronteiras da loucura' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nas Fronteiras da Loucura','nas fronteiras da loucura',array['Espírito Manoel P de Miranda - D. P. Franco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -19' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -19','ACV-T-19','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ninguem lucra com o mal' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ninguém Lucra com o Mal','ninguem lucra com o mal',array['Espírito Hermes - Maurício de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 158' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 158','ACV-R-158','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ninguem e de ninguem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'ninguém é de ninguém','ninguem e de ninguem',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 13 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 13 - 1','ACV-Z-13-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 13 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 13 - 2','ACV-Z-13-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='no mundo da mediunidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'No Mundo da Mediunidade','no mundo da mediunidade',array['Espírito Odilon Fernandes - Carlos A. Baccelli']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 65' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 65','ACV-T-65','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='no mundo maior' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'No Mundo Maior','no mundo maior','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 5','ACV-A-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='no pais das sombras' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'No País das Sombras','no pais das sombras',array['E. D Espérance']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 35' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 35','ACV-T-35','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nos caminhos da vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nos Caminhos da Vida','nos caminhos da vida',array['Benedito G. do Nascimento']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 41' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 41','ACV-T-41','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nos dominios da mediunidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nos Domínios da Mediunidade','nos dominios da mediunidade','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 9 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 9 - 1','ACV-A-9-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 9 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 9 - 2','ACV-A-9-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 9 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 9 - 3','ACV-A-9-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nos horizontes da espiritualidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nos Horizontes da Espiritualidade','nos horizontes da espiritualidade',array['João Duarte de Castro']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 54' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 54','ACV-T-54','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nosso lar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Nosso Lar','nosso lar',array['Espírito de André Luiz - F. C. Xavier']::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 1 - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 1 - 5','ACV-A-1-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='novo testamento' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Novo Testamento','novo testamento','{}'::text[],array['EVANGELHO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='E - 1 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'E - 1 - 1','ACV-E-1-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','EVANGELHO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='E - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'E - 1 - 2','ACV-E-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','EVANGELHO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='E - 1 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'E - 1 - 3','ACV-E-1-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','EVANGELHO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nao te canses de amar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Não te canses de Amar','nao te canses de amar',array['Espírito de Elias - Cláudia Marum']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 131' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 131','ACV-R-131','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='nao e preciso dizer adeus' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Não é preciso dizer adeus','nao e preciso dizer adeus',array['Allison DuBois']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 179' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 179','ACV-R-179','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o abridor de latas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Abridor de Latas','o abridor de latas',array['Wilson Frungilo Jr.']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 170' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 170','ACV-R-170','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o amanha a deus pertence' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O amanhã a Deus Pertence','o amanha a deus pertence',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 18' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 18','ACV-Z-18','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o amor jamais te esquece' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Amor Jamais Te Esquece','o amor jamais te esquece',array['Espírito de Lucius - André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 101' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 101','ACV-R-101','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o amor me trouxe de volta' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O amor me trouxe de volta','o amor me trouxe de volta',array['Carol Bowman']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 180' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 180','ACV-R-180','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 180 -1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 180 -1','ACV-R-180-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o amor venceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O amor venceu','o amor venceu',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 22' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 22','ACV-Z-22','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o ateu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Ateu','o ateu',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 168' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 168','ACV-R-168','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o beijo da morta' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Beijo da Morta','o beijo da morta',array['Celestina Arruda Lanza']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 34' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 34','ACV-R-34','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o camafeu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Camafeu','o camafeu',array['Wilson Frungilo Jr.']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 198' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 198','ACV-R-198','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o castelo das aves feridas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Castelo das Aves Feridas','o castelo das aves feridas',array['Nancy Puhlmann']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 67' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 67','ACV-R-67','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o cavaleiro de numiers' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Cavaleiro de Numiers','o cavaleiro de numiers',array['Yonne A. Pereira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 48' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 48','ACV-R-48','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o chanceler de ferro' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Chanceler de Ferro','o chanceler de ferro',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 12' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 12','ACV-R-12','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o clamor das almas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O clamor das Almas','o clamor das almas',array['Richard Simonetti']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 58' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 58','ACV-T-58','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o cravo na lapela' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O cravo na lapela','o cravo na lapela',array['Espírito Antonio Carlos-Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 192' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 192','ACV-R-192','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o drama da bretanha' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Drama da Bretanha','o drama da bretanha',array['Yonne A. Pereira']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 47' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 47','ACV-R-47','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o enigma da fazenda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Enigma da Fazenda','o enigma da fazenda',array['Espírito Antonio Carlos-Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 193' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 193','ACV-R-193','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o espiritismo aplicado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Espiritismo Aplicado','o espiritismo aplicado',array['Eliseu Rigonatti']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -11' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -11','ACV-T-11','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o espiritismo e as igrejas reformadas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Espiritismo e as Igrejas Reformadas','o espiritismo e as igrejas reformadas',array['Jayme Andrade']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 46' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 46','ACV-T-46','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o evangelho segundo o espiritismo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Evangelho segundo o Espiritismo','o evangelho segundo o espiritismo','{}'::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 3 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 3 - 1','ACV-K-3-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 3 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 3 - 2','ACV-K-3-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 3 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 3 - 3','ACV-K-3-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 3 - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 3 - 4','ACV-K-3-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 3 - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 3 - 5','ACV-K-3-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o evangelho a luz do cosmo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Evangelho à Luz do Cosmo','o evangelho a luz do cosmo',array['Ramatis - Psicografia Hercílio Maes']::text[],array['RAMATIS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Ra - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Ra - 3','ACV-RA-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','RAMATIS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o farao de mernephtah' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Faraó de Mernephtah','o farao de mernephtah',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 19' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 19','ACV-R-19','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o fio do destino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Fio Do Destino','o fio do destino',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 19' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 19','ACV-Z-19','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 19 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 19 - 1','ACV-Z-19-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o livro dos espiritos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Livro dos Espíritos','o livro dos espiritos',array['Allan Kardec']::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 1 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 1 - 1','ACV-K-1-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 1 - 2','ACV-K-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o livro dos espiritos para a juventude' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Livro dos Espíritos para a juventude','o livro dos espiritos para a juventude',array['Eliseu Rigonatti']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 55' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 55','ACV-T-55','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o matuto' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Matuto','o matuto',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 21' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 21','ACV-Z-21','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o morro das ilusoes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Morro das Ilusões','o morro das ilusoes',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 2 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 2 - 2','ACV-Z-2-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 2 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 2 - 3','ACV-Z-2-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o mosteiro de sao jeronimo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Mosteiro de São Jerônimo','o mosteiro de sao jeronimo',array['Espírito Monsenhor Eusébio Sintra - Valter Turini']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 144' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 144','ACV-R-144','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o mundo em que eu vivo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O mundo em que eu vivo','o mundo em que eu vivo',array['Espírito de Siveira Sampaio']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 4 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 4 - 1','ACV-Z-4-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 4 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 4 - 2','ACV-Z-4-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o outro lado da vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Outro lado da Vida','o outro lado da vida',array['Sylvia Browne']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 56' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 56','ACV-T-56','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o passe' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Passe','o passe',array['Jacob Melo']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -15' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -15','ACV-T-15','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o peregrino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Peregrino','o peregrino',array['Régis Estevez']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 55 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 55 - 2','ACV-M-55-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o pescador de almas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Pescador de Almas','o pescador de almas',array['Espírito Monsenhor Eusébio Sintra - Valter Turini']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 145' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 145','ACV-R-145','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o preco de ser diferente' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O preço de ser diferente','o preco de ser diferente',array['Espírito Leonel - Mônica de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 200' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 200','ACV-R-200','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o profeta da montanha azul' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Profeta da Montanha Azul','o profeta da montanha azul',array['Mário T. Tamassia']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 66' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 66','ACV-R-66','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o que e espiritismo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O que é Espiritismo','o que e espiritismo','{}'::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 7 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 7 - 1','ACV-K-7-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 7 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 7 - 2','ACV-K-7-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o retorno' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Retorno','o retorno',array['Espírito Schellida - Eliana Machado Coelho','Espírito de Schellida - Eliana Machado Coelho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 162' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 162','ACV-R-162','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 172' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 172','ACV-R-172','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o retrato de sabrina' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Retrato de Sabrina','o retrato de sabrina',array['Espírito José Florêncio - Antonio Demarchi']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 157' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 157','ACV-R-157','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o rochedo dos amantes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Rochedo dos Amantes','o rochedo dos amantes',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 6','ACV-R-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o sexo alem da morte' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Sexo Além da Morte','o sexo alem da morte',array['R. A. Ranieri - Orientação Esp. de André Luiz']::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 17 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 17 - 1','ACV-A-17-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o vale dos girassois' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Vale dos Girassóis','o vale dos girassois',array['Sebastião de Lima']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 24' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 24','ACV-R-24','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o valor terapeutico do perdao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O valor Terapêutico do Perdão','o valor terapeutico do perdao',array['Francisco Cajazeiras']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 52' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 52','ACV-T-52','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='o voo da gaivota' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'O Vôo da Gaivota','o voo da gaivota',array['Espírito Patrícia - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 194' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 194','ACV-R-194','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='obras postumas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Obras Póstumas','obras postumas','{}'::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 5 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 5 - 1','ACV-K-5-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='obreiros da vida eterna' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Obreiros da Vida Eterna','obreiros da vida eterna','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 4','ACV-A-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='obsessao desobsessao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Obsessão / Desobsessão','obsessao desobsessao',array['Suely Caldas Schubert']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -16','ACV-T-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='onde esta teresa' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Onde está Teresa?','onde esta teresa',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 24' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 24','ACV-Z-24','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='orientacao ao centro espirita' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Orientação Ao Centro Espírita','orientacao ao centro espirita',array['FEB']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 0' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 0','ACV-T-0','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os amantes da galileia' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Amantes da Galiléia','os amantes da galileia',array['Marjorie Holmes']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 58' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 58','ACV-R-58','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os exilados da capela' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Exilados da Capela','os exilados da capela',array['Edgard Armond']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 44' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 44','ACV-T-44','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os fios do tear' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Fios do Tear','os fios do tear',array['Wilson Frungilo Jr.']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 199' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 199','ACV-R-199','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os luminares techos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Luminares Techos','os luminares techos',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 197' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 197','ACV-R-197','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os mensageiros' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Mensageiros','os mensageiros','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 2 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 2 - 1','ACV-A-2-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 2 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 2 - 2','ACV-A-2-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 2 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 2 - 3','ACV-A-2-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 2 - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 2 - 4','ACV-A-2-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os prazeres da alma' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os prazeres da alma','os prazeres da alma',array['Espírito de Hammed - Espírito Santo Neto']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 68' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 68','ACV-M-68','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os rochedos sao de areia' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Rochedos são de Areia','os rochedos sao de areia',array['Espírito de Lucius - André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 104 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 104 - 1','ACV-R-104-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os sacramentos na umbanda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os sacramentos na Umbanda','os sacramentos na umbanda',array['Hilton de Paiva Tupinambá']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 11' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 11','ACV-U-11','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='os ultimos lagidios' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Os Últimos Lagídios','os ultimos lagidios',array['Espírito Nathanael - Helaine C Sabbadini']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 152' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 152','ACV-R-152','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='paineis da obsessao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Painéis da Obsessão','paineis da obsessao',array['Espírito Manoel P de Miranda - D. P. Franco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -17' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -17','ACV-T-17','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='palavras da vida eterna' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Palavras da Vida Eterna','palavras da vida eterna',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 8 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 8 - 2','ACV-M-8-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='paraguacu a flor selvagem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Paraguaçu, A Flor Selvagem','paraguacu a flor selvagem',array['Luiz Carlos Carneiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 52' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 52','ACV-R-52','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='pare de sofrer' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Pare de Sofrer','pare de sofrer',array['Espírito de Siveira Sampaio']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 14 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 14 - 1','ACV-Z-14-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='passes e curas espirituais' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Passes e Curas Espirituais','passes e curas espirituais',array['Wenefledo de Toledo']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 51' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 51','ACV-T-51','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='paulo e estevao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Paulo e Estevão','paulo e estevao',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 91 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 91 - 2','ACV-R-91-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 91 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 91 - 3','ACV-R-91-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='pedacos do cotidiano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Pedaços do Cotidiano','pedacos do cotidiano',array['Espíritos diversos']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 6' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 6','ACV-Z-6','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='pelas portas do coracao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Pelas portas do coração','pelas portas do coracao',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 7 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 7 - 1','ACV-Z-7-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='perdoa' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Perdoa! ...','perdoa',array['Célia Xavier de Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 20' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 20','ACV-R-20','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='perturbacao espiritual' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Perturbação Espiritual','perturbacao espiritual',array['Roque Jacinto']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -21' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -21','ACV-T-21','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ponto de encontro' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ponto de Encontro','ponto de encontro',array['Celso Martins, Deolindo Amorim']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 45' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 45','ACV-T-45','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='pontos da escola de mediuns' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Pontos da Escola de Médiuns','pontos da escola de mediuns',array['FEESP']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -9','ACV-T-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='por que comigo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Por que Comigo?','por que comigo',array['Espírito Antonio Carlos-Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 146' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 146','ACV-R-146','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='por que estou assim' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Por que estou assim?','por que estou assim',array['Espírito Dizzi Akibah _ Pedro Santiago']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 141' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 141','ACV-R-141','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='porto de alegria' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Porto de Alegria','porto de alegria',array['Espíritos Diversos - H. Arantes - F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 14' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 14','ACV-D-14','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='preces espiritas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Preces Espíritas','preces espiritas',array['Cairbar Schutel']::text[],array['ALLAN KARDEC']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='K - 9' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'K - 9','ACV-K-9','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','ALLAN KARDEC'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='preciso de ajuda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Preciso de Ajuda','preciso de ajuda',array['Célia Xavier de Camargo','Espírito de Eduardo - Célia X. Camargo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 21' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 21','ACV-R-21','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 93' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 93','ACV-R-93','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='presenca de laurinho' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Presença de Laurinho','presenca de laurinho',array['Priscila P. S. Basile']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 7' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 7','ACV-D-7','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='pao nosso' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Pão Nosso','pao nosso',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 16','ACV-M-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando a vida escolhe' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando a vida Escolhe','quando a vida escolhe',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 16','ACV-Z-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 16 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 16 - 1','ACV-Z-16-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 16 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 16 - 2','ACV-Z-16-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando chega a hora' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando chega a hora','quando chega a hora',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 23' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 23','ACV-Z-23','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando chegam as respostas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando Chegam as Respostas','quando chegam as respostas',array['Espirito Irmão Ivo - Sonia Tozzi']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 149' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 149','ACV-R-149','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando o passado nao passa' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando o Passado não Passa','quando o passado nao passa',array['Elisa Masselli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 86' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 86','ACV-R-86','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando os sonhos realizam' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando os Sonhos realizam','quando os sonhos realizam',array['Espírito de Irmã Maria - Herman Poliakoff']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 132' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 132','ACV-R-132','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando se pretende falar da vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando se pretende falar da vida','quando se pretende falar da vida',array['Roberto e David Muszkat - F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 11' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 11','ACV-D-11','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='quando e preciso voltar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Quando é Preciso Voltar','quando e preciso voltar',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 17 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 17 - 1','ACV-Z-17-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 17 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 17 - 2','ACV-Z-17-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='recados do ceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Recados do Céu','recados do ceu',array['Célia Marcondes']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 16' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 16','ACV-D-16','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='redencao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Redenção','redencao',array['Zilda Gama']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 28' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 28','ACV-R-28','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='renasceu por amor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Renasceu por Amor','renasceu por amor',array['Hernani Guimaraes']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 60' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 60','ACV-R-60','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='reparando erros' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Reparando Erros','reparando erros',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 4 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 4 - 1','ACV-R-4-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 4 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 4 - 2','ACV-R-4-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='retornaram contando' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Retornaram Contando','retornaram contando',array['Espíritos Diversos - H. Arantes - F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 12' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 12','ACV-D-12','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='santo evangelho' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Santo Evangelho','santo evangelho','{}'::text[],array['EVANGELHO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='E - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'E - 2','ACV-E-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','EVANGELHO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='se eu nao te amasse tanto assim' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Se eu não te amasse tanto assim','se eu nao te amasse tanto assim',array['Espírito Monsenhor Eusébio Sintra - Valter Turini']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 143' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 143','ACV-R-143','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 143 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 143 - 1','ACV-R-143-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='seara dos mediuns' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Seara dos Médiuns','seara dos mediuns',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 14' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 14','ACV-M-14','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='segredos da magia de umbanda e quimbanda' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Segredos da Magia de Umbanda e Quimbanda','segredos da magia de umbanda e quimbanda',array['W. W. da Matta e Silva']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 3','ACV-U-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='seitas espiritas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Seitas espíritas','seitas espiritas',array['Tácito Gama Leite F, Ursula R Gama Leite']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -1','ACV-T-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sem medo de amar' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sem Medo de Amar','sem medo de amar',array['Espírito Hermes - Maurício de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 188' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 188','ACV-R-188','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sem o veu das ilusoes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sem o Véu das Ilusões','sem o veu das ilusoes',array['Espírito Basílio - Roberto de Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 153' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 153','ACV-R-153','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sempre ha uma chance' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sempre há uma chance','sempre ha uma chance',array['Espíritos Hermes e Lucius - Lucimara Breve']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 118' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 118','ACV-R-118','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sempre e tempo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sempre é Tempo','sempre e tempo',array['Espírito Eça de Queirós- Wanda A. Canutti']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 167' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 167','ACV-R-167','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='senda de espinhos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Senda de Espinhos','senda de espinhos',array['Antônio Lima']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 40' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 40','ACV-R-40','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='senhor deus' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Senhor Deus!','senhor deus',array['Luiz Carlos Carneiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 62' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 62','ACV-R-62','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sentindo na propria pele' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sentindo na própria pele','sentindo na propria pele',array['Espírito Leonel - Mônica de Castro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 164' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 164','ACV-R-164','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='ser medico e ser humano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Ser Médico e Ser Humano','ser medico e ser humano',array['Décio Iandoli Jr.']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 53' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 53','ACV-T-53','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sexo e destino' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sexo e Destino','sexo e destino','{}'::text[],array['SÉRIE ANDRÉ LUIZ']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='A - 14 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'A - 14 - 1','ACV-A-14-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan1','section','SÉRIE ANDRÉ LUIZ'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sexo e evolucao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sexo e Evolução','sexo e evolucao',array['Walter Barcelos']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 49' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 49','ACV-T-49','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sinal de vitoria' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sinal de Vitória','sinal de vitoria',array['J. W. Rochester']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 14 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 14 - 1','ACV-R-14-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sinal verde' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sinal Verde','sinal verde',array['Espírito de André Luiz - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M -1- 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M -1- 3','ACV-M-1-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sob as cinzas do tempo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sob as Cinzas do Tempo','sob as cinzas do tempo',array['Espírito Inácio Ferreira - Carlos A. Baccelli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 115' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 115','ACV-R-115','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sob as maos da misericordia' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sob as Mãos da Misericordia','sob as maos da misericordia',array['Espírito de Lucius - André Luiz Ruiz']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 147' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 147','ACV-R-147','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sob o signo de aquario' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sob o Signo de Aquário','sob o signo de aquario',array['Roger Bottini Paranhos']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 64' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 64','ACV-T-64','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sol nas almas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sol nas Almas','sol nas almas',array['Espírito de André Luiz - Waldo Vieira']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 3','ACV-M-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sombras no horizonte' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sombras no Horizonte','sombras no horizonte',array['Espírito William - Dauny Fritsch']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 154' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 154','ACV-R-154','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='somos seis' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Somos Seis','somos seis',array['Espíritos Diversos - F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 1 - 2','ACV-D-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='somos todos aprendizes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Somos todos Aprendizes','somos todos aprendizes',array['Espirito Irmão Ivo - Sonia Tozzi']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 150' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 150','ACV-R-150','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='somos todos inocentes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Somos todos inocentes','somos todos inocentes',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 29' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 29','ACV-Z-29','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sublimando emocoes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sublimando Emoções','sublimando emocoes',array['Espírito Pinheiro Ortiz - Maria C Valenti']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 112' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 112','ACV-R-112','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='sublime expiacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Sublime Expiação','sublime expiacao',array['Divaldo Pereira Franco']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 56' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 56','ACV-R-56','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='tambores de angola' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Tambores de Angola','tambores de angola',array['Espírito de Ângelo Inácio - Robson Pinheiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 88' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 88','ACV-R-88','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 88 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 88 - 1','ACV-R-88-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='temas do amor imortal' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Temas do Amor Imortal','temas do amor imortal',array['Mário T. Tamassia']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 63' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 63','ACV-R-63','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='terceira revelacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Terceira Revelação','terceira revelacao',array['Armando Fernandes de Oliveira']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 26' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 26','ACV-T-26','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='terra prometida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Terra Prometida','terra prometida',array['Espírito Inácio Ferreira - Carlos A. Baccelli']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 183' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 183','ACV-R-183','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='tormentos da obsessao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Tormentos da Obsessão','tormentos da obsessao',array['Espírito Manoel P de Miranda - D. P. Franco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 48' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 48','ACV-T-48','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='traicao e misterio' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Traição e Mistério','traicao e misterio',array['Espírito João maria - Assis Azevedo']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 169' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 169','ACV-R-169','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='transplante de amor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Transplante de Amor','transplante de amor',array['Espírito de Roboels - Eurípedes Kühl']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 123' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 123','ACV-R-123','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='trilhas da libertacao' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Trilhas da Libertação','trilhas da libertacao',array['Divaldo P. Franco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -20' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -20','ACV-T-20','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='tudo pelo melhor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Tudo pelo melhor','tudo pelo melhor',array['Espírito de Calunga - Luiz Gasparetto']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 111' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 111','ACV-R-111','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='tudo tem seu preco' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Tudo tem seu preço','tudo tem seu preco',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 26' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 26','ACV-Z-26','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 26 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 26 - 1','ACV-Z-26-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 26 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 26 - 2','ACV-Z-26-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='tudo valeu a pena' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Tudo valeu a Pena','tudo valeu a pena',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 28' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 28','ACV-Z-28','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='um amor de verdade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Um Amor de Verdade','um amor de verdade',array['Espírito de Lúcius']::text[],array['ZÍBIA GASPARETTO']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='Z - 30' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'Z - 30','ACV-Z-30','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan5','section','ZÍBIA GASPARETTO'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='um diario no tempo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Um Diário no Tempo','um diario no tempo',array['Espírito Schellida - Eliana Machado Coelho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 187' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 187','ACV-R-187','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='um jardim de esperancas' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Um Jardim de Esperanças','um jardim de esperancas',array['Espírito de Luiz Sérgio - Irene P Machado']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 120' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 120','ACV-R-120','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='uma longa espera' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Uma Longa Espera','uma longa espera',array['Espírito Alexandre Villas - Fátima Arnolde']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 196' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 196','ACV-R-196','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan10','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='uma luz ate a eternidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Uma Luz Até a Eternidade','uma luz ate a eternidade',array['Espírito Blande - Maria Ap. Caetano Sales']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 165' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 165','ACV-R-165','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan9','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='umbanda a proto sintese cosmica' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Umbanda - A Proto-Síntese Cósmica','umbanda a proto sintese cosmica',array['F. Rivas Neto']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 4','ACV-U-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='umbanda de todos nos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Umbanda de Todos Nós','umbanda de todos nos',array['W. W. da Matta e Silva']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 1 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 1 - 1','ACV-U-1-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 1 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 1 - 2','ACV-U-1-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='umbanda dos pretos velhos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Umbanda dos Pretos Velhos','umbanda dos pretos velhos',array['Antonio Alves Teixeira']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 13' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 13','ACV-U-13','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='umbanda e o poder da mediunidade' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Umbanda e o Poder da Mediunidade','umbanda e o poder da mediunidade',array['W. W. da Matta e Silva']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 2','ACV-U-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='umbanda guia para organizacao de terreiro' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Umbanda guia para organização de terreiro','umbanda guia para organizacao de terreiro',array['T. Silva Pinto, B. T. de Freitas']::text[],array['UMBANDA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='U - 7' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'U - 7','ACV-U-7','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan2','section','UMBANDA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='universalismo cristico' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Universalismo Crístico','universalismo cristico',array['Roger Bottini Paranhos']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 63' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 63','ACV-T-63','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='universo de amor' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Universo de amor','universo de amor',array['Espírito de Luiz Sérgio - Irene P Machado']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 121' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 121','ACV-R-121','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vida e atos dos apostolos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vida e Atos dos Apóstolos','vida e atos dos apostolos',array['Cairbar Schutel']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 39 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 39 - 2','ACV-M-39-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vida e obra de bezerra de menezes' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vida e Obra de Bezerra de Menezes','vida e obra de bezerra de menezes',array['Sylvio Brito Soares']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 33 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 33 - 1','ACV-T-33-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 33 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 33 - 2','ACV-T-33-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vida e sexo' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vida e Sexo','vida e sexo',array['Espírito de Emmanuel - F. C. Xavier']::text[],array['MENSAGENS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='M - 71' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'M - 71','ACV-M-71','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan11','section','MENSAGENS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vida transicao vida' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vida Transiçao Vida','vida transicao vida',array['Joel L Whitton - Joe Fisher']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 57' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 57','ACV-T-57','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vidas passadas de chico xavier' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vidas passadas de Chico Xavier','vidas passadas de chico xavier',array['Lúcia R. Mello']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 31' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 31','ACV-T-31','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='violetas na janela' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Violetas na Janela','violetas na janela',array['Espírito Patrícia - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 73-2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 73-2','ACV-R-73-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 73-3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 73-3','ACV-R-73-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vivendo no mundo dos espiritos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vivendo no Mundo dos Espíritos','vivendo no mundo dos espiritos',array['Espírito Patrícia - Vera Lúcia Marinzeck Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 5 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 5 - 1','ACV-R-5-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 5 - 3' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 5 - 3','ACV-R-5-3','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 5 - 4' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 5 - 4','ACV-R-5-4','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='voce e o passe' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Você e o Passe','voce e o passe',array['Wilson Garcia, Wilson Francisco']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -13' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -13','ACV-T-13','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='voce e os espiritos' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Você e os Espíritos','voce e os espiritos',array['Wilson Garcia']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T -22' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T -22','ACV-T-22','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T- 22 - 1' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T- 22 - 1','ACV-T-22-1','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan3','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='voce e espirito' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Você é Espírito','voce e espirito',array['Espíritos Diversos - Rose dos Anjos']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 5' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 5','ACV-D-5','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='voltei' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Voltei','voltei',array['Espírito Irmão Jacob - F. Cândido Xavier']::text[],array['TEORIA']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='T - 60' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'T - 60','ACV-T-60','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan4','section','TEORIA'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='voltou mas esqueceu' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Voltou mas, Esqueceu','voltou mas esqueceu',array['Florence L. Barclay']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 31 - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 31 - 2','ACV-R-31-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan6','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='vozes da outra margem' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Vozes da Outra Margem','vozes da outra margem',array['Espíritos Diversos - F. C. Xavier']::text[],array['DEPOIMENTOS']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='D - 2' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'D - 2','ACV-D-2','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan12','section','DEPOIMENTOS'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='veu do passado' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Véu do passado','veu do passado',array['Espírito Antonio Carlos - Vera Lúcia M Carvalho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 124' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 124','ACV-R-124','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan8','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='zana no reduto romano' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'Zana no Reduto Romano','zana no reduto romano',array['Luiz Carlos Carneiro']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 61' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 61','ACV-R-61','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
  select id into current_title_id from public.oh_acervo_titles where organization_id=tucxa_id and normalized_title='e melhor colher flores' order by created_at limit 1;
  if current_title_id is null then
    insert into public.oh_acervo_titles (organization_id,title,normalized_title,authors,subjects,cover_match_status,active,metadata) values (tucxa_id,'É Melhor Colher Flores','e melhor colher flores',array['José Antônio Castilho']::text[],array['ROMANCES']::text[],'pendente',true,jsonb_build_object('source','biblioteca-legado-2011')) returning id into current_title_id;
  end if;
  if not exists (select 1 from public.oh_acervo_copies where organization_id=tucxa_id and legacy_code='R - 57' and title_id=current_title_id) then
    insert into public.oh_acervo_copies (organization_id,title_id,legacy_code,asset_code,condition,status,acquisition_type,active,metadata) values (tucxa_id,current_title_id,'R - 57','ACV-R-57','bom','disponivel','acervo_historico',true,jsonb_build_object('source','biblioteca-legado-2011','sheet','Plan7','section','ROMANCES'));
  end if;
end $$;\n\n-- Curadoria inicial baseada nos títulos efetivamente encontrados na planilha legada.\n-- As trilhas permanecem como sugestões (official=false) até validação dos responsáveis do Tucxa.\ndo $$\ndeclare\n  tucxa_id uuid;\n  trail_id uuid;\nbegin\n  select id into tucxa_id from public.oh_organizations where slug='tucxa' or name ilike '%tucxa%' order by created_at desc limit 1;\n  if tucxa_id is null then return; end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='comecando-no-tucxa';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Leitura sugerida a partir do acervo existente; validar com os responsáveis.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('o evangelho segundo o espiritismo','o que e espiritismo','agenda crista','conduta espirita')\n    on conflict do nothing;\n  end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='mediunidade-e-desenvolvimento';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Leitura sugerida a partir do acervo existente; validar com professores e Grupo de Estudos.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('nos dominios da mediunidade','mecanismos da mediunidade','mediunidade de cura','a mediunidade sem lagrimas','umbanda e o poder da mediunidade','no mundo da mediunidade','curso de educacao mediunica 1ano','curso de educacao mediunica 2ano','educacao mediunica tomo i','educacao mediunica tomo ii','educacao mediunica tomo iii','educacao mediunica tomo iv')\n    on conflict do nothing;\n  end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='cambonagem-atendimento-responsabilidade';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Apoio ao estudo sobre atendimento, passes e conduta; validar com coordenação.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('voce e o passe','fluidos passes','o passe','passes e curas espirituais','conduta espirita','sinal verde')\n    on conflict do nothing;\n  end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='fundamentos-de-umbanda';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Curadoria inicial sobre Umbanda; validar com professores e Grupo de Estudos.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('umbanda de todos nos','umbanda e o poder da mediunidade','cultura umbandistica','catecismo de umbanda','dicionario de umbanda','umbanda dos pretos velhos')\n    on conflict do nothing;\n  end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='vida-espiritual-e-evolucao';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Curadoria inicial para aprofundamento e reflexão.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('nosso lar','os mensageiros','missionarios da luz','entre a terra e o ceu','acao e reacao','evolucao em dois mundos','e a vida continua')\n    on conflict do nothing;\n  end if;\n\n  select id into trail_id from public.oh_acervo_trails where organization_id=tucxa_id and slug='caridade-etica-vida-na-casa';\n  if trail_id is not null then\n    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, title_id, sort_order, required, note)\n    select tucxa_id, trail_id, 'title', id, 100 + row_number() over (order by title), false, 'Leitura sugerida sobre ética, convivência e caridade.'\n    from public.oh_acervo_titles\n    where organization_id=tucxa_id and normalized_title in ('agenda crista','conduta espirita','sinal verde','o valor terapeutico do perdao')\n    on conflict do nothing;\n  end if;\nend $$;\n