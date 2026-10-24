import type { Metadata } from "next";
import Image from "next/image";
import { hasLuPreviewAccess, luPreviewConfigured } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { LuMusicExperience } from "@/components/education/lu-music-experience";
import "./lu-music.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nosso Livro Musical — Homologação | Automação Extrema",
  description: "Experiência demonstrativa protegida do projeto de livro musical da turma.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function LuPilotPage({ searchParams }: Props) {
  const access = await hasLuPreviewAccess();
  const configured = luPreviewConfigured();
  const { erro } = await searchParams;

  if (!access) {
    return (
      <main className="lu-root lu-gate">
        <div className="lu-orb lu-orb-a" aria-hidden="true" />
        <div className="lu-orb lu-orb-b" aria-hidden="true" />
        <section className="lu-gate-card" aria-labelledby="lu-gate-heading">
          <Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={210} height={63} className="lu-logo" priority />
          <span className="lu-eyebrow">💛 Acesso de homologação</span>
          <h1 id="lu-gate-heading">Nosso Livro Musical <span>🎵</span></h1>
          <p>Uma prévia feita com carinho para a Lu e sua colega conferirem a experiência que acompanhará o livro das crianças.</p>
          {!configured ? (
            <div className="lu-alert" role="status">A demonstração está em preparação. O administrador precisa configurar as variáveis de acesso no ambiente Preview.</div>
          ) : (
            <form action={`${LU_BASE_PATH}/acesso`} method="post" className="lu-gate-form">
              <label htmlFor="codigo">Código de acesso recebido</label>
              <input id="codigo" name="codigo" type="password" minLength={8} maxLength={256} required autoComplete="off" placeholder="Digite o código enviado" />
              {erro === "1" && <span role="alert" className="lu-error">Código incorreto. Confira e tente novamente.</span>}
              <button type="submit" className="lu-button lu-button-primary">Entrar no livro musical <span aria-hidden="true">→</span></button>
            </form>
          )}
          <small>🔒 Prévia privada • Ainda não é a versão final das famílias.</small>
        </section>
      </main>
    );
  }
  return <LuMusicExperience />;
}
