import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, PILOTO_CATEGORIES, RMC_CATEGORIES, stringField } from '@/lib/atendimento-inteligente/intake';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';

export const dynamic = 'force-dynamic';

type NewRequestBody = {
  organizationSlug?: string; organizationId?: string;
  customerName?: string; phone?: string; category?: string;
  description?: string; neighborhood?: string; address?: string;
  urgency?: string; preferredContact?: string;
  consentConfirmed?: boolean; assisted?: boolean;
  turnstileToken?: string;
  customerId?: string; addressId?: string; addressData?: Record<string,string>;
  services?: {category?: string;description?:string;answers?:Record<string,string>}[];
};

async function verifyTurnstile(token: unknown, expectedHost: string): Promise<boolean> {
  const secret = process.env.AE_AI_TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== 'string' || !token.trim()) return false;
  try {
    const body = new FormData();
    body.set('secret', secret);
    body.set('response', token);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(7000), cache: 'no-store',
    });
    if (!res.ok) return false;
    const result = await res.json() as { success?: boolean; hostname?: string };
    return result.success === true && (!!result.hostname && result.hostname === expectedHost);
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: 'Entre como operador para consultar pedidos.' }, { status: 401 });
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 });
    if (!allowed(scope, organizationId)) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    const { data, error } = await supabaseAdmin.from('ae_ai_requests')
      .select('id,organization_id,conversation_id,customer_name,property_address,preferred_contact,public_contact_email,intake_source,intake_by,consent_confirmed,category,description,neighborhood,urgency,status,created_at,updated_at')
      .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(150);
    if (error) throw error;
    const ids = Array.from(new Set((data ?? []).map(row => row.conversation_id)));
    const { data: conversations, error: convError } = ids.length
      ? await supabaseAdmin.from('ae_ai_conversations').select('id,contact_id').eq('organization_id', organizationId).in('id', ids)
      : { data: [], error: null };
    if (convError) throw convError;
    const contactIds = Array.from(new Set((conversations ?? []).map(row => row.contact_id)));
    const { data: contacts, error: contactError } = contactIds.length
      ? await supabaseAdmin.from('ae_ai_contacts').select('id,phone,display_name').eq('organization_id', organizationId).in('id', contactIds)
      : { data: [], error: null };
    if (contactError) throw contactError;
    const cids = new Map((conversations ?? []).map(x => [x.id, x.contact_id]));
    const byId = new Map((contacts ?? []).map(x => [x.id, x]));
    return NextResponse.json({ requests: (data ?? []).map(row => ({
      ...row, contact: byId.get(cids.get(row.conversation_id) ?? '') ?? null,
    })) });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    // Nunca aceitar nome de operador informado pelo navegador: vem da sessao Auth.
    const body = await request.json() as NewRequestBody;
    if (request.headers.get('content-type')?.includes('application/json') !== true) {
      return NextResponse.json({ error: 'Envie os dados como JSON.' }, { status: 415 });
    }
    const orgSlug = stringField(body.organizationSlug, 60);
    const { data: organization, error: orgError } = await supabaseAdmin.from('ae_ai_organizations')
      .select('id,slug,segment,status,public_intake_enabled').eq('slug', orgSlug).maybeSingle();
    if (orgError) throw orgError;
    if (!organization) return NextResponse.json({ error: 'Empresa indisponível.' }, { status: 404 });
    if (body.organizationId && body.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Identificação de empresa inválida.' }, { status: 400 });
    }
    const scope = await aeScope(request);
    const assisted = body.assisted === true;
    let effectiveCustomerId: string | null = null;
    let effectiveName = stringField(body.customerName,120);
    let effectivePhone = normalizeBRPhone(body.phone);

    if (assisted) {
      if (!scope || !allowed(scope,organization.id))
        return NextResponse.json({error:'Apenas a equipe autorizada registra solicitacoes assistidas.'},{status:403});
    } else if (orgSlug === 'reparos-rmc' && scope) {
      const actor = await rmcActor(request);
      if (actor?.role !== 'customer' || !customerIsActive(actor.customer!) ||
          actor.customer!.must_change_password || process.env.AE_AI_CUSTOMER_REQUESTS_ENABLED !== 'true') {
        return NextResponse.json({error:'Autoatendimento nao habilitado.'},{status:403});
      }
      effectiveCustomerId=actor.customer!.id;
      effectiveName=actor.customer!.full_name;
      const {data: contact, error: contactErr}=await supabaseAdmin.from('ae_ai_contacts')
        .select('phone').eq('organization_id',actor.organizationId)
        .eq('id',actor.customer!.contact_id).single();
      if(contactErr || !contact) throw contactErr ?? new Error('Contato nao encontrado');
      effectivePhone=contact.phone;
    } else {
      if (orgSlug === 'reparos-rmc' || process.env.AE_AI_PUBLIC_REQUESTS_ENABLED !== 'true' ||
         !organization.public_intake_enabled || organization.status !== 'active' ||
         !(await verifyTurnstile(body.turnstileToken,request.nextUrl.hostname))) {
        return NextResponse.json({error:'Cadastro publico ainda nao habilitado.'},{status:403});
      }
    }
    const uploadSecret=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(uploadSecret).digest('hex');
    const expires=new Date(Date.now()+90*60*1000).toISOString();

    if(orgSlug==='reparos-rmc') {
      if(assisted) {
        if(!isUuid(body.customerId)) return NextResponse.json({error:'Cadastre e selecione um cliente antes do pedido.'},{status:400});
        effectiveCustomerId=body.customerId;
      }
      if (!isUuid(effectiveCustomerId) || !effectivePhone || effectiveName.length < 2 || body.consentConfirmed!==true)
        return NextResponse.json({error:'Identificacao do cliente ou autorizacao invalida.'},{status:400});
      const services=Array.isArray(body.services)?body.services:[];
      if(services.length<1 || services.length>5) return NextResponse.json({error:'Informe de 1 a 5 servicos.'},{status:400});
      const items: {category:string;description:string;answers:Record<string,string>}[]=[];
      for (const item of services) {
        const category=stringField(item.category,120), description=stringField(item.description,4000);
        if(!(RMC_CATEGORIES as readonly string[]).includes(category) || description.length<12)
          return NextResponse.json({error:'Cada servico precisa de categoria e descricao detalhada.'},{status:400});
        const answers:Record<string,string>={};
        if(item.answers && typeof item.answers==='object' && !Array.isArray(item.answers)) {
          for(const [key,value] of Object.entries(item.answers).slice(0,10)) {
            if(typeof value==='string') answers[key.slice(0,64)]=value.slice(0,500);
          }
        }
        items.push({category,description,answers});
      }
      const addr=body.addressData;
      const addressId=body.addressId && isUuid(body.addressId)?body.addressId:null;
      const normalizedAddress= !addressId && addr ? {
        label: stringField(addr.label,50)||'Principal',cep:stringField(addr.cep,20).replace(/\D/g,''),
        street:stringField(addr.street,180),number:stringField(addr.number,30),
        complement:stringField(addr.complement,100),neighborhood:stringField(addr.neighborhood,120),
        city:stringField(addr.city,120),state:stringField(addr.state,2).toUpperCase(),
      }:null;
      if(!addressId && (!normalizedAddress || !/^\d{8}$/.test(normalizedAddress.cep) ||
        !/^[A-Z]{2}$/.test(normalizedAddress.state) || !normalizedAddress.street ||
        !normalizedAddress.number || !normalizedAddress.city || !normalizedAddress.neighborhood)) {
        return NextResponse.json({error:'Endereco completo com CEP, rua, numero, bairro, cidade e UF e obrigatorio.'},{status:400});
      }
      const {data: requestId,error}=await supabaseAdmin.rpc('ae_ai_register_request_v4',{
        p_organization_id:organization.id,p_customer_id:effectiveCustomerId,
        p_phone:effectivePhone,p_name:effectiveName,p_items:items,
        p_urgency:body.urgency==='alta'?'alta':'normal',
        p_address_id:addressId,p_address:normalizedAddress,
        p_preferred_contact:stringField(body.preferredContact,200),
        p_intake_source:assisted?'assisted_n1':'customer_portal',
        p_intake_by:assisted?scope!.userId:null,p_consent_confirmed:true,
        p_secret_hash:hash,p_secret_expires_at:expires,
      });
      if(error||!isUuid(requestId)) throw error ?? new Error('Registro nao concluido');
      return NextResponse.json({requestId,uploadSecret,expiresAt:expires,
        message:'Solicitacao registrada para avaliacao; nao confirma preco ou data.'},{status:201});
    }
    // Preserva o fluxo legado do centro automotivo durante a Fase 0.
    const phone=effectivePhone;
    const name=effectiveName;
    const neighborhood=stringField(body.neighborhood,180);
    const category=stringField(body.category,120);
    const description=stringField(body.description,4000);
    if(!phone||name.length<2||neighborhood.length<2||description.length<12||
       !(PILOTO_CATEGORIES as readonly string[]).includes(category)||body.consentConfirmed!==true)
      return NextResponse.json({error:'Confira os dados da solicitacao.'},{status:400});
    const {data:requestId,error}=await supabaseAdmin.rpc('ae_ai_register_request_v2',{
      p_organization_id:organization.id,p_phone:phone,p_name:name,
      p_category:category,p_description:description,p_neighborhood:neighborhood,
      p_urgency:body.urgency==='alta'?'alta':'normal',
      p_address:stringField(body.address,300),p_preferred_contact:stringField(body.preferredContact,200),
      p_intake_source:assisted?'assisted_n1':'web_self_service',
      p_intake_by:assisted?scope!.userId:null,p_consent_confirmed:true,
      p_secret_hash:hash,p_secret_expires_at:expires,
    });
    if(error||!isUuid(requestId))throw error ?? new Error('Falha ao registrar');
    return NextResponse.json({requestId,uploadSecret,expiresAt:expires,
      message:'Solicitacao registrada para avaliacao.'},{status:201});
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
