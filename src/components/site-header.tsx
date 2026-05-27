"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function SiteHeader({ logged = false }: { logged?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#00334E]/95 text-white shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={logged ? "/admin/ae" : "/"} className="flex items-center gap-3">
          <Image
            src="/ae-logo-azul.png"
            alt="Automação Extrema"
            width={168}
            height={54}
            className="h-10 w-auto rounded-md object-contain"
            priority
          />
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          {isAdmin ? (
            <>
              <Link className="rounded-full px-3 py-2 hover:bg-white/10" href="/admin/ae">
                Gestão
              </Link>
              <Link className="hidden rounded-full px-3 py-2 hover:bg-white/10 sm:inline-flex" href="/admin/ae/solucoes">
                Soluções
              </Link>
              <Link className="hidden rounded-full px-3 py-2 hover:bg-white/10 sm:inline-flex" href="/admin/ae/relatorios">
                Relatórios
              </Link>
              <Link className="hidden rounded-full px-3 py-2 hover:bg-white/10 md:inline-flex" href="/admin/ae/funil">
                Funil
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full bg-[#31C16B] px-3 py-2 font-bold text-[#00334E] hover:bg-[#48dc83]"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link className="rounded-full px-3 py-2 hover:bg-white/10" href="/diagnostico">
                Diagnóstico
              </Link>
              <Link className="rounded-full bg-[#31C16B] px-3 py-2 font-bold text-[#00334E] hover:bg-[#48dc83]" href="/login">
                Gestão
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
