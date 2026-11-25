-- Somente leitura: verifique após o SQL 03. Não imprime chaves dos eventos.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='presenca-querida-fotos';
select schemaname, tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('pq_event_photo_settings','pq_event_photos');
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='storage' and tablename='objects' and policyname='pq_photos_private_only';
select routine_name, grantee, privilege_type from information_schema.routine_privileges
where specific_schema='public' and routine_name='pq_reserve_event_photo' order by grantee;
select e.slug, s.uploads_open, s.album_open, count(p.id) as tentativas,
       coalesce(sum(p.byte_size),0) as bytes_reservados,
       count(p.id) filter (where p.status in ('uploading','failed','deleting')) as pendencias_tecnicas
from public.pq_event_photo_settings s join public.pq_events e on e.id=s.event_id
left join public.pq_event_photos p on p.event_id=s.event_id
group by e.slug,s.uploads_open,s.album_open order by e.slug;
