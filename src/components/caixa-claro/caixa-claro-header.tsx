"use client";

import Image from "next/image";

export function CaixaClaroHeader({
  familyName,
  memberName,
  onHome,
  onHelp,
  onAccess,
  onSignOut,
}: {
  familyName: string;
  memberName: string;
  onHome: () => void;
  onHelp: () => void;
  onAccess: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-[#00334E] text-white shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/caixa-claro/logo-caixa-claro.svg"
            alt="Caixa Claro"
            width={220}
            height={62}
            className="h-11 w-auto rounded-xl bg-white px-2 py-1 sm:h-12"
            priority
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#31C16B]">Família</p>
            <p className="truncate text-sm font-black">{familyName}</p>
          </div>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs text-white/70">Olá,</p>
          <p className="max-w-32 truncate text-sm font-black sm:max-w-52">{memberName}</p>
        </div>
      </div>

      <nav className="border-t border-white/10" aria-label="Navegação Caixa Claro">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 py-1.5 text-[11px] font-black sm:flex sm:justify-end sm:gap-2 sm:px-4 sm:text-sm">
          <button type="button" onClick={onHome} className="rounded-xl bg-white/10 px-2 py-2 hover:bg-white/20">Início</button>
          <button type="button" onClick={onHelp} className="rounded-xl bg-white/10 px-2 py-2 hover:bg-white/20">Dúvidas?</button>
          <button type="button" onClick={onAccess} className="rounded-xl bg-white/10 px-2 py-2 hover:bg-white/20">Meu acesso</button>
          <button type="button" onClick={onSignOut} className="rounded-xl bg-[#31C16B] px-2 py-2 text-[#00334E] hover:bg-[#48dc83]">Sair</button>
        </div>
      </nav>
    </header>
  );
}
