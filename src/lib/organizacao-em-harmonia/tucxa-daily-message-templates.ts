/** Modelos operacionais TUCXA. Horário de referência não é horário de entrega. */
function datePtBrWithWeekday(isoDate: string): string {
  // UTC e data civil evitam o deslocamento de um dia entre ambientes.
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(date);
  const numeric = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${numeric}`;
}

export function tucxaReceptionOperationalMessage(input: {
  phase: "morning" | "afternoon";
  date: string;
  entitySummary: string;
}): string {
  const morning = input.phase === "morning";
  return [
    morning ? "🌿📅 TUCXA — PRÉVIA DOS ATENDIMENTOS" : "🌿📅 TUCXA — ATUALIZAÇÃO DOS ATENDIMENTOS",
    `📅 ${datePtBrWithWeekday(input.date)}`,
    morning ? "🕗 Referência: 08h" : "🕓 Referência: 16h",
    "",
    morning ? "Bom dia!" : "Boa tarde!",
    "",
    morning ? "Segue a prévia dos agendamentos de hoje, organizada por Entidade."
      : "Segue a relação atualizada dos atendimentos de hoje.",
    "",
    input.entitySummary.trim() || "Nenhum consulente agendado até o momento.",
    "",
    morning ? "⚠️ Esta é uma prévia. Os agendamentos ainda podem mudar durante o dia."
      : "ℹ️ Esta atualização substitui a prévia da manhã. Alterações posteriores ainda poderão ocorrer.",
    ...(morning ? ["📲 Você receberá uma atualização entre 16h e 17h.", "Um excelente trabalho a todos! 💚"] : []),
  ].join("\n");
}

export function tucxaCavalinhoOperationalMessage(input: {
  date: string;
  entities: ReadonlyArray<{ name: string; consulentes: ReadonlyArray<string> }>;
}): string {
  const withAppointments = input.entities.some((item) => item.consulentes.length > 0);
  const one = input.entities.length === 1;
  const sections = input.entities.map((item) => item.consulentes.length
    ? `${item.name}:\n${item.consulentes.map((name) => `- ${name}`).join("\n")}`
    : `${item.name}: até o momento não há consulentes agendados.`);
  return [
    "🌿📅 TUCXA — ATENDIMENTOS DE HOJE",
    `📅 ${datePtBrWithWeekday(input.date)}`,
    "🕓 Referência: 16h",
    "",
    "Olá!",
    "",
    one ? "Sua Entidade está prevista para atendimento hoje." : "Suas Entidades estão previstas para atendimento hoje.",
    "",
    ...(withAppointments ? ["Segue a relação atualizada dos atendimentos de hoje.", ""] : [
      "Até o momento desta atualização, não há consulentes agendados para a(s) Entidade(s).", "",
    ]),
    ...(withAppointments ? sections : input.entities.map((entity) => `Entidade: ${entity.name}`)),
    "",
    withAppointments ? "ℹ️ Alterações posteriores ainda poderão ocorrer."
      : "Caso ocorram novos agendamentos ou alterações, consulte a Recepção.",
    "Um ótimo trabalho! 💚",
  ].join("\n");
}
