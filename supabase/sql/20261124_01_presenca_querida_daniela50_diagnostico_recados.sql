-- Somente leitura. Execute no SQL Editor; não envie o resultado com dados pessoais.
-- pq_guests.notes também contém observações internas: valide cada registro antes de importar.
select g.id as guest_id, g.full_name, g.notes, g.confirmed_at,
       exists (select 1 from public.pq_guest_messages m where m.event_id=g.event_id
         and m.guest_id=g.id and m.message_phase='recado_convidado' and trim(m.message_text)=trim(g.notes)) as ja_registrado,
       (select string_agg(distinct m.approval_status || case when m.is_active then ' (ativo)' else ' (inativo)' end, ', ')
        from public.pq_guest_messages m where m.event_id=g.event_id and m.guest_id=g.id
        and m.message_phase='recado_convidado' and trim(m.message_text)=trim(g.notes)) as status_recado
from public.pq_guests g join public.pq_events e on e.id=g.event_id
where e.slug='daniela-50-anos' and g.is_active=true and nullif(trim(g.notes),'') is not null
order by g.full_name;
