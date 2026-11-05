import Image from 'next/image';
import Link from 'next/link';
import { AiUserMenu } from './user-menu';
import { AiHeaderActions } from './header-actions';
const root='/solucoes/atendimento-inteligente/rmc';
export function AiBrandHeader({showActions=true,backHref}:{showActions?:boolean;backHref?:string}){
 return <header className="border-b border-[#e6e6e6] bg-white text-[#253b47]">
   <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-5">
     <Link href={root} aria-label="Reparos RMC, inicio" className="flex shrink-0 items-center gap-2">
       <Image src="/atendimento-inteligente/logo-rmc.png" width={153} height={81} priority alt="Reparos RMC" className="h-12 w-auto object-contain sm:h-16"/>
     </Link>
     <div className="flex min-w-0 items-center justify-end gap-2">
       <AiUserMenu/>
       {showActions&&<AiHeaderActions backHref={backHref}/>}
     </div>
   </div>
   <div className="flex min-h-10 flex-wrap items-center justify-center gap-2 border-t bg-[#fdfdfb] px-3 py-1 text-center text-[11px] font-semibold text-[#455f6c]">
     <span>Desenvolvido por</span>
     <a href="https://www.automacaoextrema.com/" target="_blank" rel="noopener noreferrer" aria-label="Conheca Automacao Extrema">
       <Image src="/ae-logo-horizontal.png" width={110} height={27} alt="Automacao Extrema" className="h-7 w-auto object-contain"/>
     </a><span>Clique no logo e nos conheça</span>
   </div>
 </header>;
}
