import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeError } from '@/lib/atendimento-inteligente/security';
import { normalizeBRPhone, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';

type RegisterPayload = { fullName?: string; phone?: string };

/** Cadastro aberto a qualquer cliente com conta Auth e identidade confirmada. */
export async function POST(request: Request) {
  try {
    const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) return NextResponse.json({error:'Entre ou confirme sua conta antes de continuar.'},{status:401});
    const {data: auth,error: authError} = await supabaseAdmin.auth.getUser(bearer);
    const user = auth.user;
    if (authError || !user) return NextResponse.json({error:'Sessao invalida.'},{status:401});
    if (!user.email_confirmed_at && !user.phone_confirmed_at)
      return NextResponse.json({error:'Confirme seu e-mail ou celular para concluir o cadastro.'},{status:403});

    const {data:org,error:orgErr}=await supabaseAdmin.from('ae_ai_organizations')
      .select('id,status').eq('slug','reparos-rmc').single();
    if(orgErr || !org) throw orgErr ?? new Error('Empresa RMC nao encontrada');
    if(org.status!=='active')return NextResponse.json({error:'Cadastro temporariamente indisponivel.'},{status:503});

    // Primeiro confere um eventual cliente ja vinculado ao UID. A ativacao deste
    // proprio usuario nao pode transferir uma conta nem seus pedidos a terceiros.
    const {data:existing,error:existingErr}=await supabaseAdmin.from('ae_ai_customers')
      .select('id,contact_id,portal_enabled,must_change_password,portal_suspended_at')
      .eq('organization_id',org.id).eq('auth_user_id',user.id).maybeSingle();
    if(existingErr)throw existingErr;
    if(existing){
      if(existing.portal_suspended_at)
        return NextResponse.json({error:'Conta suspensa. Entre em contato com a equipe RMC.'},{status:403});
      if (!existing.portal_enabled) {
        const {error:updateErr}=await supabaseAdmin.from('ae_ai_customers')
          .update({portal_enabled:true,updated_at:new Date().toISOString()})
          .eq('id',existing.id).eq('organization_id',org.id).is('portal_suspended_at',null);
        if(updateErr)throw updateErr;
      }
      return NextResponse.json({ok:true,existing:true,mustChangePassword:existing.must_change_password});
    }

    // Conta Auth pode ser nova ou preexistente no site. Os dados do contato
    // sao autodeclarados, mas nunca conferem posse de um telefone nao verificado.
    let payload: RegisterPayload = {};
    try { payload = await request.json() as RegisterPayload; } catch { /* corpo opcional */ }
    const name=stringField(payload.fullName ?? user.user_metadata?.ae_ai_full_name ??
      user.user_metadata?.full_name,120);
    const phone=normalizeBRPhone(payload.phone ?? user.user_metadata?.ae_ai_phone ?? user.phone);
    const email=stringField(user.email,180).toLowerCase();
    if(name.length<3 || !phone)
      return NextResponse.json({error:'Informe seu nome e WhatsApp com DDD para cadastrar-se.'},{status:400});
    const verifiedPhone=Boolean(user.phone_confirmed_at && normalizeBRPhone(user.phone)===phone);

    const {data:contact,error:contactErr}=await supabaseAdmin.from('ae_ai_contacts')
      .select('id').eq('organization_id',org.id).eq('phone',phone).maybeSingle();
    if(contactErr)throw contactErr;
    if(contact){
      // Um telefone registrado anteriormente pode conter historico e enderecos;
      // e-mail confirmado por si so NAO comprova ser dono daquele telefone.
      const {data:bound,error:boundErr}=await supabaseAdmin.from('ae_ai_customers')
        .select('id,auth_user_id,email,portal_suspended_at').eq('organization_id',org.id)
        .eq('contact_id',contact.id).maybeSingle();
      if(boundErr)throw boundErr;
      const matchingVerifiedEmail=Boolean(email && bound?.email && bound.email.toLowerCase()===email);
      if(!verifiedPhone && !matchingVerifiedEmail)
        return NextResponse.json({error:'Este WhatsApp ja consta na RMC. Confirme a titularidade do numero ou do e-mail cadastrado para vincular o historico.'},{status:409});
      if(bound?.portal_suspended_at)
        return NextResponse.json({error:'Cadastro suspenso. Consulte a equipe.'},{status:403});
      if(bound?.auth_user_id && bound.auth_user_id!==user.id)
        return NextResponse.json({error:'Este WhatsApp ja pertence a outra conta. Confirme a titularidade com a equipe.'},{status:409});
      if(bound && !bound.auth_user_id){
        const {data:claimed,error:claimErr}=await supabaseAdmin.from('ae_ai_customers').update({
          auth_user_id:user.id,full_name:name,email:email||null,
          portal_enabled:true,must_change_password:false,
          phone_verified_at:verifiedPhone?user.phone_confirmed_at:null,
          updated_at:new Date().toISOString(),
        }).eq('id',bound.id).eq('organization_id',org.id).is('auth_user_id',null).is('portal_suspended_at',null).select('id').single();
        if(claimErr || !claimed)throw claimErr ?? new Error('Cadastro ja vinculado em outra sessao');
        return NextResponse.json({ok:true,linked:true});
      }
    }

    const {data:stored,error:storeErr}=contact
      ? {data:contact,error:null}
      : await supabaseAdmin.from('ae_ai_contacts').insert({
          organization_id:org.id,phone,display_name:name,
        }).select('id').single();
    if(storeErr || !stored) {
      if(storeErr?.code==='23505')return NextResponse.json({error:'WhatsApp ja cadastrado. Atualize a pagina e confirme a titularidade.'},{status:409});
      throw storeErr ?? new Error('Contato nao cadastrado');
    }
    const {error:insertErr}=await supabaseAdmin.from('ae_ai_customers').insert({
      organization_id:org.id,contact_id:stored.id,auth_user_id:user.id,
      full_name:name,email:email||null,portal_enabled:true,must_change_password:false,
      phone_verified_at:verifiedPhone?user.phone_confirmed_at:null,
    });
    if(insertErr){
      if(insertErr.code==='23505')return NextResponse.json({error:'Cadastro ja existente. Entre com sua conta ou confirme a titularidade do WhatsApp.'},{status:409});
      throw insertErr;
    }
    return NextResponse.json({ok:true,created:true});
  } catch(error){return NextResponse.json({error:safeError(error)},{status:500});}
}
