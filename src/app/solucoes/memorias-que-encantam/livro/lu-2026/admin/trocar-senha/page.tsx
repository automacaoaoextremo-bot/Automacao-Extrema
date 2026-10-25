import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLuTeacherSession } from "@/lib/education/lu-teacher-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";
import { LuFirstAccessForm } from "@/components/education/lu-first-access-form";
import "../../lu-music.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Primeiro acesso — Nosso Livro Musical",
  robots: { index: false, follow: false },
};
type Props = { searchParams: Promise<{ erro?: string }> };

export default async function TrocarSenha({ searchParams }: Props) {
  const teacher = await getLuTeacherSession();
  if (!teacher) redirect(`${LU_BASE_PATH}/admin`);
  if (!teacher.must_change_password) redirect(`${LU_BASE_PATH}/admin`);
  const { erro } = await searchParams;

  return (
    <main className="lu-root lu-book lu-first-access">
      <LuHeader admin teacherName={teacher.name} />
      <div className="lu-container lu-first-access-container">
        <section className="lu-first-access-card" aria-labelledby="lu-first-access-heading">
          <div className="lu-first-access-head">
            <span className="lu-first-access-kicker">PRIMEIRO ACESSO</span>
            <h1 id="lu-first-access-heading">Confirme seus dados e troque a senha.</h1>
          </div>
          <LuFirstAccessForm
            name={teacher.name}
            phoneDigits={teacher.phone_digits}
            email={teacher.email || ""}
            erro={erro}
          />
        </section>
      </div>
    </main>
  );
}
