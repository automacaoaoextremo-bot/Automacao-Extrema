-- Automação Extrema / Impacto no Controle / Sementinha / InC-04
-- 1) Atualiza a comunicação da campanha para destacar o propósito do Dia das Crianças,
--    pagamento por Pix ou outra forma combinada com o Suporte e transparência do sorteio.
-- 2) Cria RPCs transacionais, restritas ao service_role, para a Gestão:
--    - registrar/substituir comprovante;
--    - excluir com segurança uma reserva ainda aguardando pagamento/comprovante.

begin;

update public.inc_campaigns
set
  story = 'Cada participação ajuda o Sementinha a arrecadar recursos para as ações do Dia das Crianças. A reserva é feita pelo celular e o pagamento pode ser realizado por Pix ou por outra forma combinada com o Suporte. Depois do pagamento, o comprovante é enviado para conferência da organização.',
  regulation_text = 'O sorteio será realizado em data a confirmar. A organização fará uma gravação em vídeo com as evidências do número ganhador, e o vídeo será disponibilizado junto com a prestação de contas desta ação.',
  intro_modal_enabled = true,
  intro_modal_title = 'Participe da rifa e ajude o Sementinha no Dia das Crianças',
  intro_modal_body = 'Cada número escolhido ajuda o Sementinha a arrecadar recursos para as ações do Dia das Crianças. Você concorre à bicicleta seminova e pode acompanhar a confirmação da participação e a prestação de contas da ação.',
  updated_at = now()
where slug = 'rifa-bike-seminova-sementinha';

update public.inc_message_templates mt
set body = $$🚲 Rifa da Bicicleta Seminova — Sementinha

Cada número escolhido ajuda o Sementinha a arrecadar recursos para as ações do Dia das Crianças.

Escolha seus números pelo link abaixo. O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte. Depois, envie o comprovante pela própria página:

[LINK_ACAO]

A participação é confirmada após a conferência do pagamento/comprovante pela organização. Compartilhe com quem também quiser participar e apoiar o Sementinha!$$
where mt.purpose = 'launch'
  and mt.campaign_id = (
    select id from public.inc_campaigns
    where slug = 'rifa-bike-seminova-sementinha'
  );

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

  v_method_label := case
    when lower(coalesce(p_payment_method, 'pix')) = 'other'
      then 'outra forma combinada com o Suporte'
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
      'payment_method', case when lower(coalesce(p_payment_method, 'pix')) = 'other' then 'other' else 'pix' end,
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

create or replace function public.inc_admin_delete_awaiting_reservation(
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
  v_payload jsonb;
begin
  select *
  into v_contribution
  from public.inc_contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.' using errcode = 'P0001';
  end if;

  if v_contribution.status <> 'awaiting_payment' then
    raise exception 'Somente reservas aguardando pagamento/comprovante podem ser excluídas.' using errcode = 'P0001';
  end if;

  if v_contribution.proof_file_path is not null then
    raise exception 'A reserva já possui comprovante e deve ser conferida ou rejeitada, não excluída.' using errcode = 'P0001';
  end if;

  select client_id
  into v_client_id
  from public.inc_campaigns
  where id = v_contribution.campaign_id;

  v_payload := jsonb_build_object(
    'contribution_id', v_contribution.id,
    'participant_id', v_contribution.participant_id,
    'amount_cents', v_contribution.amount_cents,
    'selected_numbers', to_jsonb(v_contribution.selected_numbers),
    'acompanhamento_token', v_contribution.acompanhamento_token,
    'previous_status', v_contribution.status
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
    'reservation_deleted_before_payment',
    v_payload
  );

  return jsonb_build_object(
    'ok', true,
    'released_numbers', to_jsonb(v_contribution.selected_numbers)
  );
end;
$$;

revoke all on function public.inc_admin_delete_awaiting_reservation(uuid, uuid) from public;
grant execute on function public.inc_admin_delete_awaiting_reservation(uuid, uuid) to service_role;

commit;
