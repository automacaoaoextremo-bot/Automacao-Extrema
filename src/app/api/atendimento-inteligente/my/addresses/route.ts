import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
import { safeError } from '@/lib/atendimento-inteligente/security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request){
 try{
  const actor=await rmcActor(request);
  if(actor?.role!=='customer'||!customerIsActive(actor.customer!)||actor.customer!.must_change_password)
    return NextResponse.json({error:'Acesso nao autorizado.'},{status:403});
  const {data,error}=await supabaseAdmin.from('ae_ai_customer_addresses')
   .select('id,label,cep,street,number,complement,neighborhood,city,state')
   .eq('organization_id',actor.organizationId).eq('contact_id',actor.customer!.contact_id)
   .order('created_at',{ascending:false}).limit(50);
  if(error)throw error;
  return NextResponse.json({addresses:data??[]});
 }catch(err){return NextResponse.json({error:safeError(err)},{status:500});}
}
