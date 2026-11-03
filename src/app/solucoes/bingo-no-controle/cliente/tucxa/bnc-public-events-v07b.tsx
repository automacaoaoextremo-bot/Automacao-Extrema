"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getBncClient } from "@/lib/bingo-no-controle/client";

const base = "/solucoes/bingo-no-controle/cliente/tucxa/evento";
type Round = {number:number;title:string};
type Prize = {round_number:number;label:string;image_url:string|null};
type Item = {category:string;title:string;description:string|null;price_cents:number;image_url:string|null};
type PublicEvent = {id:string;slug:string;title:string;description:string|null;venue:string|null;starts_at:string|null;status:string;group:string;rounds:Round[];prizes:Prize[];menu:Item[]};

function dateText(value:string|null) {
  if(!value)return "Data em confirmação";
  const d=new Date(value);
  return Number.isNaN(d.valueOf())?"Data em confirmação":new Intl.DateTimeFormat("pt-BR",{dateStyle:"full",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(d);
}

export function BncPublicEventsV07B({slug}:{slug?:string}) {
  const [events,setEvents]=useState<PublicEvent[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void Promise.resolve().then(async()=>{
      const client=getBncClient();
      if(!client) {if(active){setLoaded(true);setError("Programação indisponível neste ambiente.");}return;}
      const {data,error:rpcError}=await client.rpc("bnc_v07c_public_events");
      if(!active)return;
      if(rpcError)setError("Não foi possível consultar a programação agora.");
      else setEvents(Array.isArray(data)?data as PublicEvent[]:[]);
      setLoaded(true);
    });
    return()=>{active=false;};
  },[]);

  if(!loaded)return <p className="text-sm">Consultando a programação publicada...</p>;
  if(error)return <p role="status" className="text-sm">{error}</p>;
  const list=slug?events.filter(e=>e.slug===slug):events;
  if(!list.length)return <div className="rounded-xl bg-white/10 p-4 text-sm">{slug?"Evento não publicado ou não encontrado.":"Os próximos eventos serão divulgados assim que a organização confirmar a programação."}</div>;
  return <div className="space-y-4">{list.map(event=><article key={event.id} className="rounded-2xl border border-emerald-200 bg-white p-4 text-[#193e2e] shadow-sm">
    <p className="text-xs font-bold uppercase text-emerald-700">{event.group==="sementinha"?"Sementinha · TUCXA":"Bingo do TUCXA"} · Publicado</p>
    <h3 className="mt-1 text-xl font-black">{event.title}</h3>
    <p className="mt-2 text-sm">{dateText(event.starts_at)} · {event.venue??"Local a confirmar"}</p>
    {event.description&&<p className="mt-2 text-sm leading-relaxed">{event.description}</p>}
    <h4 className="mt-4 font-bold">Rodadas</h4>
    <div className="mt-2 flex flex-wrap gap-2">{event.rounds.map(r=><span key={r.number} className="rounded-full bg-emerald-50 px-3 py-1 text-xs">{r.number}. {r.title}</span>)}</div>
    {event.prizes.length>0&&<><h4 className="mt-4 font-bold">Prendas e premiações</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">{event.prizes.map((p,i)=><div key={`${p.round_number}-${i}`} className="rounded-xl border p-3 text-sm"><strong>Rodada {p.round_number}: {p.label}</strong>{p.image_url&&<Image unoptimized src={p.image_url} width={360} height={240} alt={`Prenda: ${p.label}`} className="mt-2 h-40 w-full rounded-lg object-contain"/>}</div>)}</div></>}
    {event.menu.length>0&&<><h4 className="mt-4 font-bold">Cardápio</h4><div className="mt-2 divide-y rounded-xl border">{event.menu.map((item,i)=><div key={i} className="flex justify-between gap-3 p-3 text-sm"><span className="flex items-center gap-3">{item.image_url&&<Image unoptimized src={item.image_url} width={72} height={72} alt={`Foto de ${item.title}`} className="h-[72px] w-[72px] rounded-lg object-cover"/>}<span><strong>{item.title}</strong> <span className="text-slate-500">· {item.category}</span></span></span><strong>{(item.price_cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></div>)}</div></>}
    {!slug&&<Link className="mt-4 inline-block rounded-xl bg-[#16573e] px-4 py-2 text-sm font-bold text-white" href={`${base}/${encodeURIComponent(event.slug)}`}>Ver detalhes do bingo</Link>}
    <Link className="mt-3 inline-block rounded-xl border border-emerald-300 px-4 py-2 text-sm font-bold text-[#14573d]" href="/solucoes/bingo-no-controle/cliente/tucxa/compras-antecipadas">Conhecer compras antecipadas (em preparação)</Link>
    <p className="mt-3 text-xs text-slate-500">Informações sujeitas a confirmação. Esta página não vende cartelas nem processa pagamentos.</p>
  </article>)}</div>;
}
