import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';
type Create = { organizationId?: string; fullName?: string; phone?: string; email?: string; password?: string };
const strongPassword = (s: string) => s.length >= 8 && s.length <= 72 &&
  [/[A-Z]/, /[a-z]/, /\d/, /[^\w]/].filter(re => re.test(s)).length >= 3 &&
  !['12345678', '123456789', 'Password123!', 'Senha123!', 'Qwerty123!'].includes(s);

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
    const { data: addresses, error: addressError } = await supabaseAdmin.from('ae_ai_customer_addresses')
      .select('id,contact_id,label,cep,street,number,complement,neighborhood,city,state')
      .eq('organization_id', organizationId).limit(600);
    if (addressError) throw addressError;
    return NextResponse.json({ customers: (customers ?? []).map(row => {
      return { id: row.id, contactId: row.contact_id, fullName: row.full_name,
        phone: phoneById.get(row.contact_id),
        email: row.email, portalEnabled: row.portal_enabled,
        addresses: (addresses ?? []).filter(item => item.contact_id === row.contact_id) };
    }) });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;
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
    const password = typeof body.password === 'string' ? body.password : '';
    if (!phone || fullName.length < 3 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !strongPassword(password)) {
      return NextResponse.json({ error: 'Informe nome, celular valido e senha individual forte (minimo 8 caracteres). E-mail e opcional.' }, { status: 400 });
    }
    const { data: existingContact, error: contactErr } = await supabaseAdmin.from('ae_ai_contacts')
      .select('id').eq('organization_id', organizationId).eq('phone', phone).maybeSingle();
    if (contactErr) throw contactErr;
    if (existingContact) {
      const { data: existingCustomer, error: custErr } = await supabaseAdmin.from('ae_ai_customers')
        .select('id').eq('organization_id', organizationId).eq('contact_id', existingContact.id).maybeSingle();
      if (custErr) throw custErr;
      if (existingCustomer) return NextResponse.json({ error: 'Cliente ja cadastrado. Nao alteramos a senha existente.' }, { status: 409 });
    }
    // O telefone permanece NAO confirmado. Portal bloqueado ate verificar posse do numero.
    // Nao registrar ou retornar a senha em logs, banco ou resposta da API.
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone: `+${phone}`, password, phone_confirm: false,
      ...(email ? { email, email_confirm: false } : {}),
      user_metadata: { full_name: fullName, ae_ai_provisioned: true },
    });
    if (authError || !created.user) {
      return NextResponse.json({ error: 'Nao foi possivel criar credencial. Confira se o numero ja possui conta.' }, { status: 409 });
    }
    createdUserId = created.user.id;
    const { data: contact, error: upErr } = await supabaseAdmin.from('ae_ai_contacts').upsert({
      organization_id: organizationId, phone, display_name: fullName, updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,phone' }).select('id').single();
    if (upErr || !contact) throw upErr ?? new Error('Contato nao criado');
    const { data: customer, error: insertError } = await supabaseAdmin.from('ae_ai_customers').insert({
      organization_id: organizationId, contact_id: contact.id, auth_user_id: createdUserId,
      full_name: fullName, email: email || null, provisioned_by: scope.userId,
      portal_enabled: false, must_change_password: true,
    }).select('id').single();
    if (insertError || !customer) throw insertError ?? new Error('Cadastro nao salvo');
    createdUserId = null;
    return NextResponse.json({ id: customer.id, message: 'Cliente cadastrado para triagem assistida. Portal nao liberado.' }, { status: 201 });
  } catch (err) {
    if (createdUserId) await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => null);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
