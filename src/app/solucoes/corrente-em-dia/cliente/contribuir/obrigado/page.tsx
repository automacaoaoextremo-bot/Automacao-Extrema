import Link from "next/link";
import { CorrenteClientHeader } from "@/components/corrente-client-header";

export default function CorrenteComprovanteObrigadoPage() {
  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Comprovante recebido</p>
          <h1 className="mt-2 text-4xl font-black text-[#00334E]">Obrigado. Seu comprovante será revisado.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Fizemos uma pré-validação inicial, mas a aprovação final será feita por um responsável da organização. Assim a casa mantém clareza, segurança e transparência sem depender de conferências soltas no WhatsApp.
          </p>
          <Link href="/solucoes/corrente-em-dia/cliente/contribuir" className="mt-6 inline-flex rounded-2xl bg-[#31C16B] px-6 py-4 font-black text-[#00334E] shadow-lg">
            Voltar para minha contribuição
          </Link>
        </div>
      </section>
    </main>
  );
}
