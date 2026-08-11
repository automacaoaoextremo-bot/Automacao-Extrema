export const SEMENTINHA_COORDINATOR_SLUG = "coordenacao-sementinha";
export const SEMENTINHA_DESPENSA_MANAGER_SLUG = "gestor-despensa-viva";

export const SEMENTINHA_SUBFUNCTIONS = [
  {
    slug: SEMENTINHA_DESPENSA_MANAGER_SLUG,
    label: "Gestor Despensa Viva",
    description:
      "Pode acessar e atualizar estoque, lotes, validades, composição e entregas da Despensa Viva.",
  },
  {
    slug: "gestor-bazar-beneficente",
    label: "Gestor Bazar Beneficente",
    description: "Responsável pela gestão das atividades do Bazar Beneficente.",
  },
  {
    slug: "gestor-bingo-beneficente",
    label: "Gestor Bingo Beneficente",
    description: "Responsável pela gestão das atividades do Bingo Beneficente.",
  },
  {
    slug: "gestor-acoes-comunitarias",
    label: "Gestor Ações Comunitárias",
    description: "Responsável pela gestão das ações do Sementinha nas comunidades.",
  },
] as const;

const SEMENTINHA_SUBFUNCTION_SLUGS = new Set<string>(
  SEMENTINHA_SUBFUNCTIONS.map((item) => item.slug),
);

export function isSementinhaSubfunctionSlug(value: string) {
  return SEMENTINHA_SUBFUNCTION_SLUGS.has(value);
}

export function hasSementinhaCoordinator(functionSlugs: string[]) {
  return functionSlugs.includes(SEMENTINHA_COORDINATOR_SLUG);
}

export function hasDespensaVivaManagement(functionSlugs: string[]) {
  return (
    hasSementinhaCoordinator(functionSlugs) &&
    functionSlugs.includes(SEMENTINHA_DESPENSA_MANAGER_SLUG)
  );
}

export function selectedSementinhaSubfunctions(functionSlugs: string[]) {
  return SEMENTINHA_SUBFUNCTIONS.filter((item) =>
    functionSlugs.includes(item.slug),
  );
}
