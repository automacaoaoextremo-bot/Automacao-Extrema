"use client";

import { FormEvent, Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

type FormErrors = Record<string, string>;

const fieldLabels: Record<string, string> = {
  fullName: "Nome",
  whatsapp: "WhatsApp",
  email: "E-mail",
  profileType: "Perfil",
  mainArea: "Área principal",
  mainPain: "Motivo da dor",
  urgency: "Urgência",
  businessStage: "Fase atual",
  ideaDescription: "Descrição da situação",
  consentLgpd: "Consentimento do diagnóstico",
};

export default function DiagnosticoPage() {
  return (
    <Suspense fallback={<DiagnosticoLoading />}>
      <DiagnosticoContent />
    </Suspense>
  );
}

function DiagnosticoLoading() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10">
          <p className="text-slate-200">Carregando diagnóstico...</p>
        </section>
      </main>
    </>
  );
}

function DiagnosticoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origem") ?? "landing_page";
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const missingMessage = useMemo(() => {
    const keys = Object.keys(errors);
    if (keys.length === 0) return "";
    return `Falta responder: ${keys.map((key) => fieldLabels[key] ?? key).join(", ")}.`;
  }, [errors]);

  function validate(formData: FormData) {
    const nextErrors: FormErrors = {};
    const required = ["fullName", "whatsapp", "email", "profileType", "mainArea", "mainPain", "urgency", "businessStage", "ideaDescription"];

    for (const field of required) {
      const value = String(formData.get(field) || "").trim();
      if (!value) nextErrors[field] = "Campo obrigatório.";
    }

    const description = String(formData.get("ideaDescription") || "").trim();
    if (description && description.length < 30) {
      nextErrors.ideaDescription = "Descreva a situação com pelo menos 30 caracteres.";
    }

    const email = String(formData.get("email") || "").trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Informe um e-mail válido.";
    }

    const whatsapp = String(formData.get("whatsapp") || "").replace(/\D/g, "");
    if (whatsapp && whatsapp.length < 10) {
      nextErrors.whatsapp = "Informe um WhatsApp válido com DDD.";
    }

    if (formData.get("consentLgpd") !== "on") {
      nextErrors.consentLgpd = "É necessário aceitar o uso das respostas para enviar.";
    }

    return nextErrors;
  }

  function scrollToFirstError(nextErrors: FormErrors) {
    const firstKey = Object.keys(nextErrors)[0];
    if (!firstKey || !formRef.current) return;

    const element = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus?.();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const formData = new FormData(event.currentTarget);
    const nextErrors = validate(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    setLoading(true);

    const payload = {
      fullName: String(formData.get("fullName") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      email: String(formData.get("email") || ""),
      origin,
      profileType: String(formData.get("profileType") || ""),
      mainArea: String(formData.get("mainArea") || ""),
      mainPain: String(formData.get("mainPain") || ""),
      urgency: String(formData.get("urgency") || ""),
      hasBusiness: String(formData.get("hasBusiness") || "") === "sim",
      businessStage: String(formData.get("businessStage") || ""),
      ideaDescription: String(formData.get("ideaDescription") || ""),
      consentContact: formData.get("consentContact") === "on",
      consentLgpd: formData.get("consentLgpd") === "on",
    };

    const response = await fetch("/api/diagnosticos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.fields) {
        setErrors(result.fields);
        scrollToFirstError(result.fields);
      }
      setServerError(result.error || "Não foi possível enviar.");
      setLoading(false);
      return;
    }

    router.push(`/obrigado?solucao=${encodeURIComponent(result.recommendedSolution)}&score=${result.score}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] px-4 py-8 text-white">
        <section className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white/10 p-5 shadow-xl ring-1 ring-white/10 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#31C16B]">Automação Extrema</p>

            <h1 className="mt-3 text-3xl font-bold">Diagnóstico AE — Mapa de Dores e Oportunidades</h1>

            <p className="mt-4 text-white/85">
              Responda algumas perguntas rápidas para identificarmos onde tecnologia, automação ou organização simples
              podem economizar tempo, reduzir retrabalho ou revelar uma oportunidade.
            </p>

            <div className="mt-5 rounded-2xl border border-[#00A8CC]/40 bg-[#00263A] p-4 text-sm text-white/90">
              <p className="font-bold text-[#31C16B]">Antes de responder</p>
              <p className="mt-2">
                Este diagnóstico serve para entender dificuldades e sugerir possíveis caminhos de melhoria. O preenchimento
                não é obrigatório, não solicita senha, cartão, dados bancários, pagamento, instalação ou download.
              </p>
            </div>

            <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              {missingMessage && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {missingMessage}
                </div>
              )}

              <Field name="fullName" label="Nome" error={errors.fullName}>
                <input name="fullName" data-field="fullName" className={inputClass(errors.fullName)} />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field name="whatsapp" label="WhatsApp" error={errors.whatsapp}>
                  <input name="whatsapp" data-field="whatsapp" placeholder="(19) 99999-9999" className={inputClass(errors.whatsapp)} />
                </Field>

                <Field name="email" label="E-mail" error={errors.email}>
                  <input name="email" data-field="email" type="email" className={inputClass(errors.email)} />
                </Field>
              </div>

              <Select
                name="profileType"
                label="Qual perfil mais combina com você hoje?"
                error={errors.profileType}
                options={[
                  ["pessoa_fisica", "Pessoa física querendo organizar melhor a vida"],
                  ["profissional", "Profissional autônomo ou prestador de serviço"],
                  ["negocio", "Tenho um negócio ou participo de um negócio"],
                  ["voluntario", "Participo de escola, grupo, comunidade ou ação voluntária"],
                  ["empreendedor_ideia", "Tenho uma ideia e talvez queira empreender"],
                  ["outro", "Outro"],
                ]}
              />

              <Select
                name="mainArea"
                label="Onde você sente mais perda de tempo, confusão ou retrabalho?"
                error={errors.mainArea}
                options={[
                  ["financeiro", "Vida financeira, contas, gastos ou planilhas"],
                  ["trabalho_clientes", "Trabalho, clientes, agenda ou atendimento"],
                  ["eventos", "Eventos, escola, comunidade ou voluntariado"],
                  ["familia_idosos", "Família, idosos, rotina ou apoio digital"],
                  ["negocio_ideia", "Negócio próprio ou ideia de negócio"],
                  ["catalogo_acervo", "Produtos, catálogo, coleção ou acervo"],
                  ["pesquisa_decisao", "Pesquisas, opiniões, decisões ou prioridades"],
                  ["outro", "Outro"],
                ]}
              />

              <Select
                name="mainPain"
                label="Isso incomoda mais por quê?"
                error={errors.mainPain}
                options={[
                  ["perco_tempo", "Perco tempo demais"],
                  ["perco_dinheiro", "Perco dinheiro ou oportunidade"],
                  ["papel_planilha", "Dependo de papel, planilha, WhatsApp ou memória"],
                  ["confusao_pessoas", "Dá confusão com outras pessoas"],
                  ["sem_clareza", "Não tenho clareza para decidir"],
                  ["tirar_ideia_papel", "Tenho uma ideia, mas não sei tirar do papel"],
                ]}
              />

              <Select
                name="urgency"
                label="Qual a urgência para resolver ou melhorar isso?"
                error={errors.urgency}
                options={[
                  ["agora", "Agora / o quanto antes"],
                  ["30_dias", "Nos próximos 30 dias"],
                  ["90_dias", "Nos próximos 90 dias"],
                  ["sem_pressa", "Sem pressa, estou apenas avaliando"],
                ]}
              />

              <Select
                name="hasBusiness"
                label="Você tem negócio, atende clientes ou pretende empreender?"
                options={[
                  ["sim", "Sim"],
                  ["nao", "Não"],
                ]}
              />

              <Select
                name="businessStage"
                label="Em que fase está?"
                error={errors.businessStage}
                options={[
                  ["nao_aplica", "Não se aplica"],
                  ["so_ideia", "Só ideia"],
                  ["comecando", "Começando"],
                  ["ja_funciona", "Já funciona, mas é desorganizado"],
                  ["crescendo", "Crescendo e precisando de processo"],
                ]}
              />

              <Field name="ideaDescription" label="Descreva rapidamente a situação, dor ou ideia" error={errors.ideaDescription}>
                <textarea
                  name="ideaDescription"
                  data-field="ideaDescription"
                  rows={5}
                  className={inputClass(errors.ideaDescription)}
                  placeholder="Exemplo: organizo uma festa na escola e tudo fica no WhatsApp, papel e planilha..."
                />
              </Field>

              <label className="flex gap-3 rounded-2xl bg-white/10 p-4 text-sm text-white/90">
                <input name="consentContact" type="checkbox" className="mt-1" />
                Aceito receber uma devolutiva da Automação Extrema sobre este diagnóstico.
              </label>

              <label
                data-field="consentLgpd"
                className={`flex gap-3 rounded-2xl p-4 text-sm ${errors.consentLgpd ? "bg-red-50 text-red-800 ring-2 ring-red-300" : "bg-white/10 text-white/90"}`}
              >
                <input name="consentLgpd" type="checkbox" className="mt-1" />
                Concordo com o uso das respostas para análise do diagnóstico e contato relacionado.
              </label>
              {errors.consentLgpd && <p className="text-sm font-semibold text-red-200">{errors.consentLgpd}</p>}

              {serverError && <p className="rounded-xl bg-red-500/20 p-3 text-sm text-red-100">{serverError}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] hover:bg-[#48dc83] disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Receber sugestão de oportunidade"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-3 ${error ? "bg-red-50 text-red-900 ring-2 ring-red-300" : "bg-transparent text-white"}`}>
      <label htmlFor={name} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  error,
}: {
  name: string;
  label: string;
  options: [string, string][];
  error?: string;
}) {
  return (
    <Field name={name} label={label} error={error}>
      <select name={name} data-field={name} className={inputClass(error)} defaultValue="">
        <option value="">Selecione...</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-white p-3 text-slate-900 outline-none ${
    error ? "border-red-400 ring-2 ring-red-200" : "border-white/10 focus:ring-2 focus:ring-[#00A8CC]"
  }`;
}
