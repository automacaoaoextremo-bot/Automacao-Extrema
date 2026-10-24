import type { Metadata } from "next";
import Image from "next/image";
import { hasLuAdminAccess, luAdminConfigured } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { LuCuration } from "@/components/education/lu-curation";
import "../lu-music.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Curadoria do Livro Musical — Lu",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{erro?:string}>};
export default async function Page({searchParams}:Props) {
 const access=await hasLuAdminAccess();
 if(!access){const {erro}=await searchParams;return <main className="lu-root lu-gate"><section className="lu-gate-card"><Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={190} height={58} className="lu-logo"/><span className="lu-eyebrow">🔐 Área das professoras</span><h1>Escolha as gravações</h1><p>Compare as versões de cada música e selecione a preferida. O material não será publicado às famílias sem liberação.</p>{!luAdminConfigured()?<div className="lu-alert">Configure MEMORIAS_LU_ADMIN_CODE e MEMORIAS_LU_SESSION_SECRET.</div>:<form action={`${LU_BASE_PATH}/admin/acesso`} method="post" className="lu-gate-form"><label htmlFor="admcode">Código de curadoria</label><input id="admcode" name="codigo" type="password" required minLength={12} maxLength={256} autoComplete="off"/>{erro==="1"&&<span className="lu-error">Código inválido.</span>}<button className="lu-button lu-button-primary" type="submit">Entrar na curadoria</button></form>}<small>Área reservada • dados armazenados em bucket privado</small></section></main>}
 return <LuCuration/>;
}
