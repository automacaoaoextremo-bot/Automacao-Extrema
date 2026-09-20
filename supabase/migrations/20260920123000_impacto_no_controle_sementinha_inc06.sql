-- Automação Extrema / Impacto no Controle / Sementinha / InC-06
-- 1) Garante 1440 minutos de reserva para a campanha atual do Sementinha.
-- 2) Cria exclusão administrativa transacional de qualquer pagamento/participação,
--    preservando snapshot em auditoria e liberando somente os números realmente
--    vinculados à contribuição excluída.

begin;

update public.inc_campaigns
set
  reservation_minutes = 1440,
  updated_at = now()
where slug = 'rifa-bike-seminova-sementinha'
  and reservation_minutes is distinct from 1440;

-- Recalcula também as reservas ainda aguardando pagamento desta campanha,
-- sempre a partir de created_at + reservation_minutes. Assim os testes/reservas
-- já abertos passam a refletir a mesma regra usada nas novas reservas.
update public.inc_contributions con
set
  reservation_expires_at = con.created_at + make_interval(mins => ca.reservation_minutes),
  updated_at = now()
from public.inc_campaigns ca
where con.campaign_id = ca.id
  and ca.slug = 'rifa-bike-seminova-sementinha'
  and con.status = 'awaiting_payment';

update public.inc_campaign_numbers n
set
  reserved_until = con.reservation_expires_at,
  updated_at = now()
from public.inc_contributions con,
     public.inc_campaigns ca
where n.contribution_id = con.id
  and con.campaign_id = ca.id
  and ca.slug = 'rifa-bike-seminova-sementinha'
  and con.status = 'awaiting_payment'
  and n.status = 'reserved';

create or replace function public.inc_admin_delete_contribution(
  p_contribution_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.inc_contributions%rowtype;
  v_client_id uuid;
  v_numbers_before jsonb;
  v_released_numbers integer[];
  v_payload jsonb;
begin
  select *
  into v_contribution
  from public.inc_contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Pagamento/participação não encontrado.' using errcode = 'P0001';
  end if;

  select client_id
  into v_client_id
  from public.inc_campaigns
  where id = v_contribution.campaign_id;

  select
    coalesce(jsonb_agg(to_jsonb(n) order by n.number), '[]'::jsonb),
    coalesce(array_agg(n.number order by n.number), '{}'::integer[])
  into v_numbers_before, v_released_numbers
  from public.inc_campaign_numbers n
  where n.contribution_id = p_contribution_id;

  v_payload := jsonb_build_object(
    'contribution', to_jsonb(v_contribution),
    'numbers_before', v_numbers_before,
    'deleted_at', now()
  );

  update public.inc_campaign_numbers
  set
    status = 'available',
    participant_id = null,
    contribution_id = null,
    buyer_display_name = null,
    reserved_until = null,
    confirmed_at = null,
    updated_at = now()
  where contribution_id = p_contribution_id;

  delete from public.inc_contributions
  where id = p_contribution_id;

  insert into public.inc_audit_logs (
    actor_user_id,
    client_id,
    campaign_id,
    action,
    payload
  )
  values (
    p_actor_user_id,
    v_client_id,
    v_contribution.campaign_id,
    'contribution_deleted_by_admin',
    v_payload
  );

  return jsonb_build_object(
    'ok', true,
    'previous_status', v_contribution.status,
    'proof_file_path', v_contribution.proof_file_path,
    'released_numbers', to_jsonb(v_released_numbers)
  );
end;
$$;

revoke all on function public.inc_admin_delete_contribution(uuid, uuid) from public;
grant execute on function public.inc_admin_delete_contribution(uuid, uuid) to service_role;

commit;
