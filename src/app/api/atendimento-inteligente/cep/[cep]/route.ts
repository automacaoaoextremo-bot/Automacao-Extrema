import { NextResponse } from 'next/server';
type Context = { params:Promise<{cep:string}> };
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:Context) {
  const { cep } = await params;
  if (!/^\d{8}$/.test(cep)) return NextResponse.json({error:'CEP invalido.'},{status:400});
  try {
    const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{
      signal:AbortSignal.timeout(4000),cache:'no-store',headers:{Accept:'application/json'}
    });
    if (!response.ok) throw new Error('CEP indisponivel');
    const raw=await response.json() as Record<string,unknown>;
    if (raw.erro) return NextResponse.json({error:'CEP nao encontrado.'},{status:404});
    return NextResponse.json({
      cep,street:String(raw.logradouro??'').slice(0,180),neighborhood:String(raw.bairro??'').slice(0,120),
      city:String(raw.localidade??'').slice(0,120),state:String(raw.uf??'').slice(0,2)
    });
  }catch {return NextResponse.json({error:'Consulta de CEP indisponivel; preencha manualmente.'},{status:503});}
}
