import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, PILOTO_CATEGORIES, RMC_CATEGORIES, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';

type NewRequestBody = {
  organizationSlug?: string; organizationId?: string;
  customerName?: string; phone?: string; category?: string;
  description?: string; neighborhood?: string; address?: string;
  urgency?: string; preferredContact?: string;
  consentConfirmed?: boolean; assisted?: boolean;
  turnstileToken?: string;
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
      .select('id,organization_id,conversation_id,customer_name,property_address,preferred_contact,intake_source,intake_by,consent_confirmed,category,description,neighborhood,urgency,status,created_at,updated_at')
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
    const hasAuthorization = !!request.headers.get('authorization');
    const scope = hasAuthorization ? await aeScope(request) : null;
    if (hasAuthorization && !scope) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    const assisted = body.assisted === true;
    if (assisted) {
      if (!scope) return NextResponse.json({ error: 'O atendimento N1 exige login.' }, { status: 401 });
      if (!allowed(scope, organization.id)) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    } else {
      if (process.env.AE_AI_PUBLIC_REQUESTS_ENABLED !== 'true' ||
        organization.public_intake_enabled !== true || organization.status !== 'active') {
        return NextResponse.json({ error: 'Formulário público ainda não habilitado. Entre em contato pelo WhatsApp.' }, { status: 403 });
      }
      if (!(await verifyTurnstile(body.turnstileToken, request.nextUrl.hostname))) {
        return NextResponse.json({ error: 'Não foi possível validar a proteção antispam. Atualize a página e tente novamente.' }, { status: 403 });
      }
    }
    const phone = normalizeBRPhone(body.phone);
    const name = stringField(body.customerName, 120);
    const neighborhood = stringField(body.neighborhood, 180);
    const category = stringField(body.category, 120);
    const description = stringField(body.description, 4000);
    const address = stringField(body.address, 300);
    const preferredContact = stringField(body.preferredContact, 200);
    const urgency = body.urgency === 'alta' ? 'alta' : 'normal';
    const categories: readonly string[] = organization.segment === 'automotivo' ? PILOTO_CATEGORIES : RMC_CATEGORIES;
    if (!phone || name.length < 2 || neighborhood.length < 2 || description.length < 12 ||
        !categories.includes(category) || body.consentConfirmed !== true) {
      return NextResponse.json({ error: 'Confira contato, categoria, descrição (mínimo 12 caracteres) e autorização.' }, { status: 400 });
    }
    const uploadSecret = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(uploadSecret).digest('hex');
    const expires = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const { data: requestId, error } = await supabaseAdmin.rpc('ae_ai_register_request_v2', {
      p_organization_id: organization.id, p_phone: phone, p_name: name,
      p_category: category, p_description: description, p_neighborhood: neighborhood,
      p_urgency: urgency, p_address: address, p_preferred_contact: preferredContact,
      p_intake_source: assisted ? 'assisted_n1' : 'web_self_service',
      p_intake_by: assisted ? scope!.userId : null,
      p_consent_confirmed: true, p_secret_hash: hash, p_secret_expires_at: expires,
    });
    if (error || !isUuid(requestId)) throw error ?? new Error('Falha ao registrar solicitação');
    return NextResponse.json({ requestId, uploadSecret, expiresAt: expires,
      message: 'Solicitação registrada para avaliação. Ainda não é um orçamento confirmado.' }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
