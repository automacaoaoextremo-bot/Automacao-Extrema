-- Opcional. Execute apenas depois de conferir o diagnóstico e identificar recados reais.
-- Preencha o array com os UUIDs revisados. Array vazio = não altera nada.
-- NÃO publica nem envia e-mail, NÃO modifica respostas ou tokens.
begin;
with reviewed as (select unnest(array[]::uuid[]) as guest_id)
insert into public.pq_guest_messages (event_id, guest_id, message_phase, channel, template_label, message_text, status, approval_status, is_active, sort_order, created_at)
select g.event_id,g.id,'recado_convidado','landing_page','Recado enviado pelo convidado',trim(g.notes),'aguardando_aprovacao','pendente',true,30,coalesce(g.confirmed_at,g.updated_at,g.created_at,now())
from reviewed r join public.pq_guests g on g.id=r.guest_id join public.pq_events e on e.id=g.event_id
where e.slug='daniela-50-anos' and g.is_active=true and nullif(trim(g.notes),'') is not null
and not exists (select 1 from public.pq_guest_messages m where m.event_id=g.event_id and m.guest_id=g.id and m.message_phase='recado_convidado' and trim(m.message_text)=trim(g.notes));
commit;
