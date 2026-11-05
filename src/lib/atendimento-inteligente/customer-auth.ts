import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed } from '@/lib/atendimento-inteligente/security';

type CustomerRow = {
  id: string; organization_id: string; auth_user_id: string; contact_id: string;
  full_name: string; portal_enabled: boolean; must_change_password: boolean;
  phone_verified_at: string | null;
};

export async function rmcActor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return null;
  const { data: org, error: orgError } = await supabaseAdmin
    .from('ae_ai_organizations').select('id').eq('slug', 'reparos-rmc').single();
  if (orgError || !org) throw orgError ?? new Error('Empresa nao encontrada');
  const scope = await aeScope(request);
  if (scope && allowed(scope, org.id)) {
    return { role: 'operator' as const, userId: auth.user.id, organizationId: org.id,
      name: String(auth.user.user_metadata?.full_name ?? auth.user.email ?? 'Equipe RMC'),
      customer: null };
  }
  const { data: customer, error } = await supabaseAdmin.from('ae_ai_customers')
    .select('id,organization_id,auth_user_id,contact_id,full_name,portal_enabled,must_change_password,phone_verified_at')
    .eq('organization_id', org.id).eq('auth_user_id', auth.user.id).maybeSingle();
  if (error) throw error;
  if (!customer) return null;
  return { role: 'customer' as const, userId: auth.user.id, organizationId: org.id,
    name: customer.full_name, customer: customer as CustomerRow };
}

export function customerIsActive(customer: CustomerRow) {
  return customer.portal_enabled && Boolean(customer.phone_verified_at);
}
