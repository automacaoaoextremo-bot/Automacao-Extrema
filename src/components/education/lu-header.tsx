import Image from "next/image";
import Link from "next/link";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";

type Props = { admin?: boolean; login?: boolean; teacherName?: string };
export function LuHeader({ admin = false, login = false, teacherName }: Props) {
  return (
    <header className="lu-brandhead">
      <div className="lu-brandtop">
        <div className="lu-brandidentity">
          <span className="lu-brandicon" aria-hidden="true">📖</span>
          <div><strong>Nosso Livro Musical</strong><span>Projeto da Lu • 2026</span></div>
        </div>
        {admin ? (
          <div className="lu-account-actions">
            {teacherName && <span className="lu-account-name" title={teacherName}>{teacherName}</span>}
            <form method="post" action={`${LU_BASE_PATH}/admin/sair`}>
              <button className="lu-teacher-link" type="submit">Sair</button>
            </form>
          </div>
        ) : (
          <Link className="lu-teacher-link" href={login ? LU_BASE_PATH : `${LU_BASE_PATH}/admin`}>
            {login ? "Voltar ao livro" : <><strong>Docentes</strong><small>CLIQUE PARA ACESSAR</small></>}
          </Link>
        )}
      </div>
      <div className="lu-brandbottom">
        <strong>Desenvolvido por</strong>
        <a href="https://www.automacaoextrema.com/" target="_blank" rel="noopener noreferrer" aria-label="Conheça a Automação Extrema">
          <Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={165} height={50} priority className="lu-sponsor-logo" />
        </a>
        <span>Clique no logo e nos conheça</span>
      </div>
    </header>
  );
}
