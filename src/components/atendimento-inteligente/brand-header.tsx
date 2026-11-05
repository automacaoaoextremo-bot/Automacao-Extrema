import Image from 'next/image';
import Link from 'next/link';

const root = '/solucoes/atendimento-inteligente/rmc';
export function AiBrandHeader({ showActions = true }: { showActions?: boolean }) {
  return <header className="border-b border-[#e8e8e8] bg-white text-[#252525]">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-5">
      <Link href={root} aria-label="Reparos RMC - início" className="flex min-w-0 items-center gap-2">
        <Image src="/atendimento-inteligente/logo-rmc.png" alt="Reparos RMC" width={153} height={81} priority className="h-12 w-auto object-contain sm:h-16" />
        <span className="hidden text-xs font-extrabold uppercase tracking-wider text-[#294f6d] sm:inline">Manutenção e reparos</span>
      </Link>
      {showActions && <nav aria-label="Navegação RMC" className="flex gap-1.5 text-xs font-bold sm:gap-2 sm:text-sm">
        <Link className="rounded-full border px-3 py-2 hover:bg-slate-50" href={root}>Conheça</Link>
        <Link className="rounded-full bg-[#ef8924] px-3 py-2 text-[#222] hover:bg-[#f8a54b]" href={`${root}/solicitar`}>Solicitar</Link>
        <Link className="rounded-full border px-3 py-2 hover:bg-slate-50" href={`${root}/entrar`}>Entrar</Link>
      </nav>}
    </div>
    <div className="flex min-h-9 items-center justify-center gap-2 border-t bg-[#fafafa] px-2 text-[11px] font-semibold text-[#455f6c]">
      Desenvolvido por <a href="https://www.automacaoextrema.com/" target="_blank" rel="noopener noreferrer" aria-label="Conheça a Automação Extrema"><Image src="/ae-logo-horizontal.png" width={110} height={27} alt="Automação Extrema" className="h-6 w-auto object-contain" /></a>
      <span className="hidden sm:inline">Clique no logo e nos conheça</span>
    </div>
  </header>;
}
