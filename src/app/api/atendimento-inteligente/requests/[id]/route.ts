import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { REQUEST_STAGES, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: 'Sessão necessária.' }, { status: 401 });
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    const payload = await request.json() as { status?: string; note?: string };
    const status = stringField(payload.status, 40);
    const note = stringField(payload.note, 1500);
    if (!(status in REQUEST_STAGES)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    const { data: record, error: readError } = await supabaseAdmin.from('ae_ai_requests')
      .select('organization_id,status').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!record || !allowed(scope, record.organization_id)) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (!scope.platformAdmin) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('ae_ai_memberships').select('role')
        .eq('user_id', scope.userId).eq('organization_id', record.organization_id).maybeSingle();
      if (membershipError) throw membershipError;
      if (membership?.role !== 'owner')
        return NextResponse.json({ error: 'A etapa N2 é exclusiva do proprietário ou administrador AE.' }, { status: 403 });
    }
    if (status === record.status && !note) return NextResponse.json({ error: 'Sem alterações.' }, { status: 400 });
    const { data: updated, error: updateError } = await supabaseAdmin.rpc('ae_ai_set_request_stage_v2', {
      p_organization_id: record.organization_id, p_request_id: id,
      p_actor_id: scope.userId, p_status: status, p_note: note,
    });
    if (updateError) throw updateError;
    if (!updated) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: 'Sessão necessária.' }, { status: 401 });
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    const { data: record, error } = await supabaseAdmin.from('ae_ai_requests').select('id,organization_id,conversation_id,category,description,neighborhood,urgency,status,created_at,updated_at,customer_name,property_address,preferred_contact,intake_source,intake_by,consent_confirmed').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!record || !allowed(scope, record.organization_id)) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
    const { data: events, error: eventError } = await supabaseAdmin.from('ae_ai_request_history')
      .select('id,status,note,created_at').eq('request_id', id).eq('organization_id', record.organization_id)
      .order('created_at', { ascending: true });
    if (eventError) throw eventError;
    const { data: items, error: itemError } = await supabaseAdmin.from('ae_ai_request_items')
      .select('id,position,category,description,answers')
      .eq('organization_id',record.organization_id).eq('request_id',id)
      .order('position',{ascending:true});
    if(itemError)throw itemError;
    return NextResponse.json({ request: record, events: events ?? [], items: items ?? [] });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
