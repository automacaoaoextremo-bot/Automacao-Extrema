import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';
type Create = { organizationId?: string; fullName?: string; phone?: string; email?: string };

async function authorization(request: NextRequest, orgId: string) {
  const scope = await aeScope(request);
  return scope && allowed(scope, orgId) ? scope : null;
}

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId') || '';
    if (!isUuid(organizationId)) return NextResponse.json({ error: 'Empresa invalida.' }, { status: 400 });
    const scope = await authorization(request, organizationId);
    if (!scope) return NextResponse.json({ error: 'Sem autorizacao.' }, { status: 403 });
    const { data: customers, error } = await supabaseAdmin.from('ae_ai_customers')
      .select('id,contact_id,full_name,email,portal_enabled,created_at')
      .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(250);
    if (error) throw error;
    const contactIds = (customers ?? []).map(c => c.contact_id);
    const { data: contacts, error: contactError } = contactIds.length
      ? await supabaseAdmin.from('ae_ai_contacts').select('id,phone').eq('organization_id',organizationId).in('id',contactIds)
      : {data:[],error:null};
    if(contactError)throw contactError;
    const phoneById=new Map((contacts??[]).map(c=>[c.id,c.phone]));
    // A mensagem de primeira solicitacao deve depender dos pedidos, nao apenas dos enderecos.
    const customerIds = (customers ?? []).map(row => row.id);
    const { data: existingRequests, error: requestsError } = customerIds.length
      ? await supabaseAdmin.from('ae_ai_requests').select('customer_id')
          .eq('organization_id', organizationId).in('customer_id', customerIds).limit(5000)
      : { data: [], error: null };
    if (requestsError) throw requestsError;
    const customersWithRequests = new Set((existingRequests ?? []).map(row => row.customer_id));
    const { data: addresses, error: addressError } = await supabaseAdmin.from('ae_ai_customer_addresses')
      .select('id,contact_id,label,cep,street,number,complement,neighborhood,city,state')
      .eq('organization_id', organizationId).limit(600);
    if (addressError) throw addressError;
    return NextResponse.json({ customers: (customers ?? []).map(row => {
      return { id: row.id, contactId: row.contact_id, fullName: row.full_name,
        phone: phoneById.get(row.contact_id),
        email: row.email, portalEnabled: row.portal_enabled,
        hasRequests: customersWithRequests.has(row.id),
        addresses: (addresses ?? []).filter(item => item.contact_id === row.contact_id) };
    }) });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: 'Entre para cadastrar clientes.' }, { status: 401 });
    const body = await request.json() as Create;
    const organizationId = body.organizationId || '';
    if (!isUuid(organizationId) || !allowed(scope, organizationId))
      return NextResponse.json({ error: 'Empresa nao autorizada.' }, { status: 403 });
    const { data: organization, error: orgErr } = await supabaseAdmin.from('ae_ai_organizations')
      .select('id,slug').eq('id', organizationId).single();
    if (orgErr || organization?.slug !== 'reparos-rmc')
      return NextResponse.json({ error: 'Cadastro nesta etapa apenas para RMC.' }, { status: 400 });
    const phone = normalizeBRPhone(body.phone);
    const fullName = stringField(body.fullName, 120);
    const email = stringField(body.email, 180).toLowerCase();
    if (!phone || fullName.length < 3 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: 'Informe nome e WhatsApp valido. E-mail e opcional.' }, { status: 400 });
    }
    const { data: existingContact, error: contactErr } = await supabaseAdmin.from('ae_ai_contacts')
      .select('id').eq('organization_id', organizationId).eq('phone', phone).maybeSingle();
    if (contactErr) throw contactErr;
    if (existingContact) {
      const { data: existingCustomer, error: custErr } = await supabaseAdmin.from('ae_ai_customers')
        .select('id').eq('organization_id', organizationId).eq('contact_id', existingContact.id).maybeSingle();
      if (custErr) throw custErr;
      if (existingCustomer) return NextResponse.json({ error: 'Cliente ja cadastrado. Selecione-o na lista de solicitacoes.' }, { status: 409 });
    }
    // Cadastro sem credencial na Fase 0. A migracao 14 torna auth_user_id opcional.
    // Um telefone existente continua sendo identificado pela chave (empresa, telefone).
    const { data: contact, error: upErr } = await supabaseAdmin.from('ae_ai_contacts').upsert({
      organization_id: organizationId, phone, display_name: fullName, updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,phone' }).select('id').single();
    if (upErr || !contact) throw upErr ?? new Error('Contato nao criado');
    const { data: customer, error: insertError } = await supabaseAdmin.from('ae_ai_customers').insert({
      organization_id: organizationId, contact_id: contact.id,
      full_name: fullName, email: email || null, provisioned_by: scope.userId,
      portal_enabled: false, must_change_password: true,
      // auth_user_id permanece NULL ate verificacao de identidade/ativacao futura.
    }).select('id').single();
    if (insertError || !customer) {
      // Concorrencia: outra solicitacao pode ter criado este contato/cliente.
      if (insertError?.code === '23505') return NextResponse.json({ error: 'Cliente ja cadastrado. Selecione-o na lista de solicitacoes.' }, { status: 409 });
      throw insertError ?? new Error('Cadastro nao salvo');
    }
    return NextResponse.json({ id: customer.id, message: 'Cliente cadastrado sem senha. Portal nao liberado.' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
