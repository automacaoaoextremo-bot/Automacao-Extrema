import Image from 'next/image';
import Link from 'next/link';

export function AiBrandHeader({ showActions = true }: { showActions?: boolean }) {
  return (
    <header className="border-b border-[#e6ebed] bg-white text-[#16384b]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/solucoes/atendimento-inteligente" className="flex items-center gap-3" aria-label="Início Reparos RMC">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123e50] text-xl font-black tracking-tighter text-white">R<span className="text-[#eeb15b]">.</span></span>
          <span className="leading-tight"><span className="block text-lg font-black">Reparos RMC</span><span className="block text-[0.67rem] font-semibold uppercase tracking-widest text-[#5e747d]">Manutenção e reparos</span></span>
        </Link>
        {showActions && <nav aria-label="Navegação do atendimento" className="flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
          <Link className="rounded-full border border-[#cdd8dc] px-3 py-2 hover:bg-slate-50" href="/solucoes/atendimento-inteligente">Conheça</Link>
          <Link className="rounded-full bg-[#123e50] px-3 py-2 text-white hover:bg-[#235a6e]" href="/solucoes/atendimento-inteligente/solicitar">Solicitar serviço</Link>
          <Link className="rounded-full border border-[#cdd8dc] px-3 py-2 hover:bg-slate-50" href="/solucoes/atendimento-inteligente/entrar">Entrar</Link>
        </nav>}
      </div>
      <div className="border-t border-[#eef2f3] bg-[#f8fbfb] px-4 py-2 text-center text-[0.7rem] font-medium text-[#385b66]">
        Desenvolvido por <a className="inline-flex items-center gap-1 underline underline-offset-2" href="https://www.automacaoextrema.com/" rel="noopener noreferrer" target="_blank"><Image src="/ae-logo-horizontal.png" width={84} height={24} alt="Automação Extrema" className="h-5 w-auto object-contain" /></a>
      </div>
    </header>
  );
}
