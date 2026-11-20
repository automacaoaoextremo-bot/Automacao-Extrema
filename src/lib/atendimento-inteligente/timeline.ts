import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid } from '@/lib/atendimento-inteligente/security';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
export function isValidISODate(x: unknown): x is string {
  return typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)
    && Number.isFinite(Date.parse(x));
}
/** Permission scoped to a single request. No client-provided org/customer id is trusted. */
export async function timelineAccess(request: Request, requestId: string) {
  if(!isUuid(requestId))return null;
  const {data:record,error}=await supabaseAdmin.from('ae_ai_requests')
    .select('id,organization_id,customer_id,on_behalf_of,requested_by_user_id').eq('id',requestId).maybeSingle();
  if(error)throw error;
  if(!record)return null;
  const {data:org,error:orgErr}=await supabaseAdmin.from('ae_ai_organizations')
    .select('slug').eq('id',record.organization_id).single();
  if(orgErr)throw orgErr;
  if(org?.slug!=='reparos-rmc')return null;
  const actor=await rmcActor(request);
  if(!actor||actor.organizationId!==record.organization_id)return null;
  if(actor.role==='customer'){
    if(!actor.customer||!record.customer_id||record.customer_id!==actor.customer.id||
      !customerIsActive(actor.customer)||actor.customer.must_change_password||
      (record.on_behalf_of && record.requested_by_user_id!==actor.userId))return null;
    return {record,actor,canImport:false};
  }
  const scope=await aeScope(request);
  if(!scope||!allowed(scope,record.organization_id))return null;
  if(scope.platformAdmin)return {record,actor,canImport:true};
  const {data:member,error:memberError}=await supabaseAdmin.from('ae_ai_memberships')
   .select('role').eq('user_id',scope.userId).eq('organization_id',record.organization_id).maybeSingle();
  if(memberError)throw memberError;
  return {record,actor,canImport:member?.role==='owner'};
}
