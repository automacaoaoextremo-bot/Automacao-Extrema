import type { Metadata } from "next";
import { LuMusicExperience } from "@/components/education/lu-music-experience";
import "./lu-music.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Nosso Livro Musical — Projeto da Lu | Automação Extrema",description:"Músicas e lembranças do livro musical da turma.",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{musica?:string}>};
export default async function LuPilotPage({searchParams}:Props) {const {musica}=await searchParams;return <LuMusicExperience initialTrackId={musica}/>;}
