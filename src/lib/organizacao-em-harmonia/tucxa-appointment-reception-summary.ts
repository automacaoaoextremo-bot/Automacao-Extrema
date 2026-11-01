/** Texto único do resumo de Recepção: WhatsApp e e-mail recebem exatamente o mesmo conteúdo. */
export type ReceptionSummaryAppointment = {
  id: string;
  entity_id: string | null;
  consulente_name: string | null;
  metadata: unknown;
};

export function formatTucxaReceptionSummary(input: {
  date: string;
  appointments: ReceptionSummaryAppointment[];
  entityNames: ReadonlyMap<string, string>;
  entityLines?: ReadonlyMap<string, string>;
  entityCapacities?: ReadonlyMap<string, number>;
  cavalinhoNames?: ReadonlyMap<string, string>;
  /** Inclui entidades escaladas sem reservas, sem inferir uma identidade por nome. */
  scheduledEntityIds?: readonly string[];
  /** Evita repetir o título nos textos formatados do WhatsApp. */
  includeTitle?: boolean;
}): string {
  const byEntity = new Map<string, ReceptionSummaryAppointment[]>();
  for (const item of input.appointments) {
    const entityId = item.entity_id ?? "";
    const group = byEntity.get(entityId) ?? [];
    group.push(item);
    byEntity.set(entityId, group);
  }
  for (const id of input.scheduledEntityIds ?? []) {
    if (!byEntity.has(id)) byEntity.set(id, []);
  }
  const sections = [...byEntity.entries()]
    .sort(([idA], [idB]) => (input.entityNames.get(idA) || "Entidade não informada")
      .localeCompare(input.entityNames.get(idB) || "Entidade não informada", "pt-BR"))
    .map(([id, appointments]) => {
      const sorted = [...appointments].sort((a, b) =>
        (a.consulente_name ?? "").localeCompare(b.consulente_name ?? "", "pt-BR", { sensitivity: "base" })
        || a.id.localeCompare(b.id));
      const lines = sorted.map((item) => {
        return item.consulente_name || "Consulente não informado";
      });
      const name = input.entityNames.get(id) || "Entidade não informada";
      const line = input.entityLines?.get(id) || "";
      const cavalinho = input.cavalinhoNames?.get(id) || "";
      const capacity = input.entityCapacities?.get(id);
      const extra = [line, cavalinho].filter(Boolean).map((value) => `(${value})`).join(" ");
      const heading = `${name}${extra ? ` ${extra}` : ""} (${sorted.length}/${capacity ?? "?"})`;
      return `${heading}\n${lines.length ? lines.map((item) => `- ${item}`).join("\n") : "Sem consulentes agendados até o momento."}`;
    });
  const details = sections.join("\n\n") || "Nenhuma Entidade com atendimento previsto.";
  return input.includeTitle === false ? details
    : `TUCXA - Resumo de agendamentos\nTotal: ${input.appointments.length}\n\n${details}`;
}
