-- Automação Extrema / Impacto no Controle / Sementinha / InC-08
-- 1) Registra dados estruturados do pagamento/comprovante usados na conferência.
-- 2) Expõe esses dados na view administrativa para relatórios XLSX/PDF.
-- 3) Evolui a RPC de registro de comprovante pela Gestão para persistir a forma de pagamento.

begin;

alter table public.inc_contributions
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('pix', 'other')),
  add column if not exists payment_occurred_at timestamptz,
  add column if not exists payer_matches_participant boolean,
  add column if not exists payer_name text;

create or replace view public.inc_admin_contributions with (security_invoker = true) as
select
  con.id,
  con.campaign_id,
  con.participant_id,
  p.name as participant_name,
  p.phone,
  p.email,
  con.type,
  con.status,
  con.amount_cents,
  con.selected_numbers,
  con.selected_quotas,
  con.proof_file_path,
  con.acompanhamento_token,
  con.rejected_reason,
  con.approved_at,
  con.created_at,
  con.reservation_expires_at,
  con.proof_file_hash,
  con.payment_method,
  con.payment_occurred_at,
  con.payer_matches_participant,
  con.payer_name
from public.inc_contributions con
join public.inc_participants p on p.id = con.participant_id;

create or replace function public.inc_admin_register_contribution_proof(
  p_contribution_id uuid,
  p_actor_user_id uuid,
  p_proof_file_path text,
  p_proof_file_hash text,
  p_payment_method text,
  p_admin_note text,
  p_reserved_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.inc_contributions%rowtype;
  v_client_id uuid;
  v_method text;
  v_method_label text;
  v_note text;
begin
  select *
  into v_contribution
  from public.inc_contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Reserva/participação não encontrada.' using errcode = 'P0001';
  end if;

  if v_contribution.status not in ('awaiting_payment', 'pending_approval') then
    raise exception 'O comprovante só pode ser registrado enquanto a reserva aguarda pagamento/comprovante ou conferência.' using errcode = 'P0001';
  end if;

  select client_id
  into v_client_id
  from public.inc_campaigns
  where id = v_contribution.campaign_id;

  v_method := case
    when lower(coalesce(p_payment_method, 'pix')) = 'other' then 'other'
    else 'pix'
  end;

  v_method_label := case
    when v_method = 'other' then 'outra forma combinada com o Suporte'
    else 'Pix'
  end;

  v_note := concat_ws(
    E'\n',
    nullif(v_contribution.note, ''),
    'Comprovante registrado pela Gestão. Forma de pagamento: ' || v_method_label || '.',
    case
      when nullif(trim(coalesce(p_admin_note, '')), '') is not null
        then 'Observação da Gestão: ' || trim(p_admin_note)
      else null
    end
  );

  update public.inc_contributions
  set
    status = 'pending_approval',
    proof_file_path = p_proof_file_path,
    proof_file_hash = p_proof_file_hash,
    payment_method = v_method,
    note = v_note,
    rejected_reason = null,
    updated_at = now()
  where id = p_contribution_id;

  update public.inc_campaign_numbers
  set
    status = 'pending_approval',
    reserved_until = p_reserved_until,
    updated_at = now()
  where contribution_id = p_contribution_id
    and status in ('reserved', 'pending_approval');

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
    'contribution_proof_registered_by_admin',
    jsonb_build_object(
      'contribution_id', p_contribution_id,
      'payment_method', v_method,
      'proof_file_path', p_proof_file_path,
      'note', nullif(trim(coalesce(p_admin_note, '')), '')
    )
  );

  return jsonb_build_object(
    'status', 'pending_approval',
    'previous_proof_file_path', v_contribution.proof_file_path
  );
end;
$$;

revoke all on function public.inc_admin_register_contribution_proof(uuid, uuid, text, text, text, text, timestamptz) from public;
grant execute on function public.inc_admin_register_contribution_proof(uuid, uuid, text, text, text, text, timestamptz) to service_role;


create or replace function public.inc_admin_approve_contribution(
  p_contribution_id uuid,
  p_actor_user_id uuid,
  p_payment_occurred_at timestamptz,
  p_payer_matches_participant boolean,
  p_payer_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.inc_contributions%rowtype;
  v_client_id uuid;
  v_now timestamptz := now();
  v_payer_name text;
begin
  select *
  into v_contribution
  from public.inc_contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Participação não encontrada.' using errcode = 'P0001';
  end if;

  if v_contribution.status <> 'pending_approval' then
    raise exception 'Somente participações aguardando conferência podem ser aprovadas.' using errcode = 'P0001';
  end if;

  if v_contribution.proof_file_path is null then
    raise exception 'A participação ainda não possui comprovante registrado.' using errcode = 'P0001';
  end if;

  if p_payment_occurred_at is null then
    raise exception 'Informe a data e o horário que constam no comprovante.' using errcode = 'P0001';
  end if;

  if p_payer_matches_participant is null then
    raise exception 'Confirme se o pagador é o mesmo do participante.' using errcode = 'P0001';
  end if;

  v_payer_name := nullif(trim(coalesce(p_payer_name, '')), '');
  if v_payer_name is null then
    raise exception 'Informe o nome do pagador.' using errcode = 'P0001';
  end if;

  select client_id
  into v_client_id
  from public.inc_campaigns
  where id = v_contribution.campaign_id;

  update public.inc_contributions
  set
    status = 'approved',
    approved_by = p_actor_user_id,
    approved_at = v_now,
    payment_occurred_at = p_payment_occurred_at,
    payer_matches_participant = p_payer_matches_participant,
    payer_name = v_payer_name,
    rejected_reason = null,
    updated_at = v_now
  where id = p_contribution_id;

  update public.inc_campaign_numbers
  set
    status = 'confirmed',
    confirmed_at = v_now,
    reserved_until = null,
    updated_at = v_now
  where contribution_id = p_contribution_id;

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
    'contribution_approved',
    jsonb_build_object(
      'contribution_id', p_contribution_id,
      'payment_method', v_contribution.payment_method,
      'payment_occurred_at', p_payment_occurred_at,
      'payer_matches_participant', p_payer_matches_participant,
      'payer_name', v_payer_name,
      'previous_status', v_contribution.status
    )
  );

  return jsonb_build_object(
    'ok', true,
    'approved_at', v_now,
    'payment_occurred_at', p_payment_occurred_at,
    'payer_name', v_payer_name
  );
end;
$$;

revoke all on function public.inc_admin_approve_contribution(uuid, uuid, timestamptz, boolean, text) from public;
grant execute on function public.inc_admin_approve_contribution(uuid, uuid, timestamptz, boolean, text) to service_role;

commit;
