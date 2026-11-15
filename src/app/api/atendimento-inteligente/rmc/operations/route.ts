import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, safeError, isUuid } from '@/lib/atendimento-inteligente/security';
export const dynamic = 'force-dynamic';

const kinds = ['service','material','tool','address','vehicle','supplier','contract'] as const;
type Kind = typeof kinds[number];
type Body = { id?:string;kind?:string;name?:string;details?:Record<string,unknown>;isDefault?:boolean };
const numericKeys = new Set(['laborCost','estimatedHours','price','kmPerLiter','fuelPrice','otherCostKm','contractValue']);

async function owner(request: Request): Promise<{error?:NextResponse;orgId?:string;userId?:string}> {
  const scope=await aeScope(request);
  if(!scope) return { error:NextResponse.json({error:'Sessão necessária.'},{status:401}) };
  const {data:org,error}=await supabaseAdmin.from('ae_ai_organizations').select('id,slug').eq('slug','reparos-rmc').single();
  if(error || !org) throw error ?? new Error('RMC indisponível');
  if(!scope.platformAdmin){
    const {data:member,error:memberError}=await supabaseAdmin.from('ae_ai_memberships')
      .select('role').eq('organization_id',org.id).eq('user_id',scope.userId).maybeSingle();
    if(memberError)throw memberError;
    if(member?.role!=='owner')return {error:NextResponse.json({error:'Acesso N2 exclusivo do proprietário RMC.'},{status:403})};
  }
  return {orgId:org.id,userId:scope.userId};
}
function parse(body:Body) {
  const kind=body.kind;
  const name=typeof body.name==='string'?body.name.trim():'';
  if(!kinds.some(k=>k===kind)||name.length<2||name.length>120) throw new Error('Dados incompletos.');
  const details=body.details;
  if(!details||typeof details!=='object'||Array.isArray(details))throw new Error('Dados inválidos.');
  const clean:Record<string,string|number>={};
  for(const [key,value] of Object.entries(details)){
    if(!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key))continue;
    if(numericKeys.has(key)){
      if(value===''||value===null||value===undefined)continue;
      const n=Number(value);
      if(!Number.isFinite(n)||n<0||n>10000000)throw new Error('Valor numérico inválido.');
      if(key==='kmPerLiter'&&n===0)throw new Error('Consumo km/L deve ser maior que zero.');
      clean[key]=n;
    }else if(typeof value==='string')clean[key]=value.trim().slice(0,1000);
  }
  if(kind==='address' && (!clean.cep || !clean.street || !clean.number || !clean.city || !clean.state))throw new Error('Informe CEP, rua, número, cidade e UF da origem.');
  if(kind==='vehicle' && (!clean.kmPerLiter || !clean.fuelPrice))throw new Error('Informe consumo km/L e preço médio do combustível.');
  return {kind:kind as Kind,name,details:clean};
}
export async function GET(request:NextRequest){
  try{
    const access=await owner(request);if(access.error)return access.error;
    const {data,error}=await supabaseAdmin.from('ae_ai_rmc_catalog')
      .select('id,kind,name,details,is_default,updated_at')
      .eq('organization_id',access.orgId!).order('kind').order('name');
    if(error)throw error;
    return NextResponse.json({items:data??[]});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:500});}
}
export async function POST(request:NextRequest){
  try{
    const access=await owner(request);if(access.error)return access.error;
    const raw=await request.json() as Body;
    let body:ReturnType<typeof parse>;
    try{body=parse(raw);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dados inválidos'},{status:400});}
    if(raw.id && !isUuid(raw.id))return NextResponse.json({error:'Identificador inválido.'},{status:400});
    const {data,error}=await supabaseAdmin.rpc('ae_ai_rmc_save_catalog_v16',{
      p_organization_id:access.orgId,p_id:raw.id??null,p_kind:body.kind,p_name:body.name,
      p_details:body.details,p_is_default:raw.isDefault===true,p_actor:access.userId,
    });
    if(error)throw error;
    return NextResponse.json({ok:true,id:data});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:500});}
}
export async function DELETE(request:NextRequest){
  try{
    const access=await owner(request);if(access.error)return access.error;
    const id=request.nextUrl.searchParams.get('id');
    if(!isUuid(id))return NextResponse.json({error:'Identificador inválido.'},{status:400});
    const {data:row,error:rerr}=await supabaseAdmin.from('ae_ai_rmc_catalog')
      .select('id,kind,is_default').eq('organization_id',access.orgId!).eq('id',id).maybeSingle();
    if(rerr)throw rerr;
    if(!row)return NextResponse.json({error:'Registro não encontrado.'},{status:404});
    if(row.kind==='address'&&row.is_default){
      const {count,error:cErr}=await supabaseAdmin.from('ae_ai_rmc_catalog')
        .select('id',{head:true,count:'exact'}).eq('organization_id',access.orgId!).eq('kind','address');
      if(cErr)throw cErr;
      if((count??0)>1)return NextResponse.json({error:'Escolha outra origem padrão antes de excluir.'},{status:409});
    }
    const {error}=await supabaseAdmin.from('ae_ai_rmc_catalog').delete()
      .eq('organization_id',access.orgId!).eq('id',id);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:500});}
}
