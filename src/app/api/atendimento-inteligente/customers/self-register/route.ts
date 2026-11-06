import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, stringField } from '@/lib/atendimento-inteligente/intake';
export const dynamic='force-dynamic';

// Fase 0: desabilitado. Para permitir o cadastro futuro, habilitar este controle
// SOMENTE depois de testar o provedor SMS e a verificação de celular do Supabase.
export async function POST(request: Request) {
 if (process.env.AE_AI_SELF_REGISTRATION_ENABLED !== 'true') {
  return NextResponse.json({error:'Cadastro direto ainda indisponivel.'},{status:403});
 }
 try {
  const bearer=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!bearer)return NextResponse.json({error:'Confirme o celular antes de continuar.'},{status:401});
  const {data:auth,error:authError}=await supabaseAdmin.auth.getUser(bearer);
  if(authError||!auth.user||!auth.user.phone_confirmed_at) return NextResponse.json({error:'Celular nao verificado.'},{status:403});
  const user=auth.user;
  const phone=normalizeBRPhone(user.phone);
  const name=stringField(user.user_metadata?.ae_ai_full_name,120);
  const email=stringField(user.user_metadata?.ae_ai_contact_email,180).toLowerCase();
  if(!phone||name.length<3 || (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
   return NextResponse.json({error:'Dados de cadastro incompletos.'},{status:400});
  if(user.user_metadata?.ae_ai_rmc_candidate!==true)
   return NextResponse.json({error:'Cadastro nao iniciado pelo portal RMC.'},{status:403});
  const {data:org,error:orgError}=await supabaseAdmin.from('ae_ai_organizations').select('id')
   .eq('slug','reparos-rmc').single();
  if(orgError||!org)throw orgError??new Error('Empresa nao encontrada');
  const {data:existing,error:existingError}=await supabaseAdmin.from('ae_ai_customers')
   .select('id').eq('organization_id',org.id).eq('auth_user_id',user.id).maybeSingle();
  if(existingError)throw existingError;
  if(existing)return NextResponse.json({ok:true,existing:true});
  const {data:registered,error:regError}=await supabaseAdmin.from('ae_ai_contacts')
   .select('id').eq('organization_id',org.id).eq('phone',phone).maybeSingle();
  if(regError)throw regError;
  if(registered){
   const {data:other,error:otherError}=await supabaseAdmin.from('ae_ai_customers')
     .select('id').eq('organization_id',org.id).eq('contact_id',registered.id).maybeSingle();
   if(otherError)throw otherError;
   if(other) return NextResponse.json({error:'Cadastro ja existente. Solicite apoio da equipe para validar a identidade.'},{status:409});
  }
  const {data:contact,error:contactError}=await supabaseAdmin.from('ae_ai_contacts').upsert({
   organization_id:org.id,phone,display_name:name,updated_at:new Date().toISOString(),
  },{onConflict:'organization_id,phone'}).select('id').single();
  if(contactError||!contact)throw contactError??new Error('Contato nao salvo');
  const {error:insertError}=await supabaseAdmin.from('ae_ai_customers').insert({
   organization_id:org.id,contact_id:contact.id,auth_user_id:user.id,full_name:name,
   email:email||null,portal_enabled:true,must_change_password:false,
   phone_verified_at:user.phone_confirmed_at,
  });
  if(insertError)throw insertError;
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:500});}
}
