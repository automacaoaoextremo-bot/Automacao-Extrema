import {
  ACERVO_VIVO_SUPPORT_NAME,
  acervoVivoSupportWhatsappUrl,
  acervoVivoTestFeedbackWhatsappUrl,
} from "@/lib/organizacao-em-harmonia/acervo-vivo-support";

type Props = {
  showTestFeedback?: boolean;
};

export function AcervoVivoSupportCard({ showTestFeedback = true }: Props) {
  return (
    <section
      id="apoio-acervo"
      className="mt-3 rounded-[1.5rem] border border-[#CFE2C7] bg-white p-4 shadow-sm ring-1 ring-[#123D2C]/5 sm:p-5"
      aria-labelledby="apoio-acervo-titulo"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Apoio humano</p>
          <h2 id="apoio-acervo-titulo" className="mt-1 text-lg font-black text-[#123D2C]">
            Precisa de ajuda para usar o Acervo Vivo?
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
            O celular continua sendo o caminho principal, mas você não precisa usar o Acervo sozinho.
            Se tiver dificuldade, pouca familiaridade com tecnologia ou preferir orientação, fale com {ACERVO_VIVO_SUPPORT_NAME}.
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
            Ela pode orientar você para encontrar um livro, entender o código da lombada, acompanhar o empréstimo e combinar a melhor forma de usar o Acervo.
          </p>
        </div>

        <a
          href={acervoVivoSupportWhatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-[#2F6B43]"
          aria-label={`Falar com ${ACERVO_VIVO_SUPPORT_NAME} pelo WhatsApp`}
        >
          Falar com a Mariana
        </a>
      </div>

      {showTestFeedback ? (
        <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
          <p className="text-xs font-bold leading-5 text-[#123D2C]">
            Participando do teste do Acervo Vivo? Você também pode enviar seu feedback por texto ou áudio.
          </p>
          <a
            href={acervoVivoTestFeedbackWhatsappUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 transition hover:bg-[#E9F2E7]"
          >
            Enviar feedback do teste
          </a>
        </div>
      ) : null}
    </section>
  );
}
