import { NextResponse } from 'next/server';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeError } from '@/lib/atendimento-inteligente/security';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await rmcActor(request);
    if (actor?.role !== 'customer' || !customerIsActive(actor.customer!) || actor.customer!.must_change_password)
      return NextResponse.json({ error: 'Acesso ao portal nao liberado.' }, { status: 403 });
    const { data: conversations, error: convError } = await supabaseAdmin.from('ae_ai_conversations')
      .select('id').eq('organization_id', actor.organizationId).eq('contact_id', actor.customer!.contact_id).limit(1);
    if (convError) throw convError;
    const conversationId = conversations?.[0]?.id;
    if (!conversationId) return NextResponse.json({ requests: [] });
    const { data, error } = await supabaseAdmin.from('ae_ai_requests')
      .select('id,category,description,status,awaiting_response_from,requested_at,created_at,property_address,on_behalf_of,beneficiary_name,beneficiary_phone,beneficiary_contact_channel')
      .eq('organization_id', actor.organizationId).eq('conversation_id', conversationId)
      .or(`on_behalf_of.eq.false,requested_by_user_id.eq.${actor.userId}`)
      .neq('intake_source', 'web_self_service') // pedidos publicos nao comprovam titularidade
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ requests: data ?? [] });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
