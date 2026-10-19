import Link from "next/link";
import { redirect } from "next/navigation";

// Bloqueio intencional: ainda não existe autorização de acesso ao domínio BNC
// integrada à autenticação do portal. Não consultar dados privados nesta rota.
export default function BingoTucxaAdminPage() {
  if (process.env.BNC_ADMIN_INTEGRATED !== "true") {
    redirect("/solucoes/bingo-no-controle/cliente/tucxa");
  }
  // Mesmo com flag, nenhuma operação privilegiada será exposta sem guardas de sessão.
  return <main className="mx-auto max-w-3xl p-8 text-[#153d2d]">
    <h1 className="text-3xl font-black">Administração do Bingo — integração pendente</h1>
    <p className="mt-4">O módulo será disponibilizado quando autenticação, permissões por organização e operações de banco forem homologadas.</p>
    <Link className="mt-6 inline-block underline" href="/solucoes/bingo-no-controle/cliente/tucxa">Voltar ao Bingo do TUCXA</Link>
  </main>;
}
