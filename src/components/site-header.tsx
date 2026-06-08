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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link href={logged ? "/admin/ae" : "/"} className="flex items-center gap-3">
          <Image
            src="/ae-logo-horizontal.png"
            alt="Automação Extrema"
            width={200}
            height={60}
            className="h-10 w-auto object-contain min-[390px]:h-12 sm:h-14"
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
            <Link className="rounded-full bg-[#31C16B] px-3 py-2 font-bold text-[#00334E] hover:bg-[#48dc83]" href="/diagnostico">
              Diagnóstico
            </Link>
          )}
        </nav>
      </div>

      {isAdmin && (
        <nav className="border-t border-white/10 sm:hidden" aria-label="Menu de gestão mobile">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 text-sm font-bold">
            <MobileAdminLink href="/admin/ae" label="Gestão" pathname={pathname} />
            <MobileAdminLink href="/admin/ae/solucoes" label="Soluções" pathname={pathname} />
            <MobileAdminLink href="/admin/ae/relatorios" label="Relatórios" pathname={pathname} />
            <MobileAdminLink href="/admin/ae/funil" label="Funil" pathname={pathname} />
          </div>
        </nav>
      )}
    </header>
  );
}

function MobileAdminLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || (href !== "/admin/ae" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-2 ${active ? "bg-[#31C16B] text-[#00334E]" : "bg-white/10 text-white"}`}
    >
      {label}
    </Link>
  );
}
