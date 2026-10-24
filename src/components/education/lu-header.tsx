import Image from "next/image";
import Link from "next/link";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export function LuHeader({admin=false,login=false}:{admin?:boolean;login?:boolean}) {
 return <header className="lu-brandhead">
   <div className="lu-brandtop"><div className="lu-brandidentity"><span className="lu-brandicon" aria-hidden="true">📖</span><div><strong>Nosso Livro Musical</strong><span>{admin?"Curadoria das professoras • Projeto da Lu":"Projeto da Lu • 2026"}</span></div></div>
    {admin?<form method="post" action={`${LU_BASE_PATH}/admin/sair`}><button className="lu-teacher-link" type="submit">Sair</button></form>:<Link className="lu-teacher-link" href={login?LU_BASE_PATH:`${LU_BASE_PATH}/admin`}>{login?"Voltar ao livro":"Professor(a)"}</Link>}
   </div>
   <div className="lu-brandbottom"><strong>Desenvolvido por</strong><a href="https://www.automacaoextrema.com/" target="_blank" rel="noopener noreferrer" aria-label="Conheça a Automação Extrema"><Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={165} height={50} priority className="lu-sponsor-logo"/></a><span>Clique no logo e nos conheça</span></div>
 </header>;
}
