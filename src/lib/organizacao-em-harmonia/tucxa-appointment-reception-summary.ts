/** Texto único do resumo de Recepção: WhatsApp e e-mail recebem exatamente o mesmo conteúdo. */
export type ReceptionSummaryAppointment = {
  id: string;
  entity_id: string | null;
  consulente_name: string | null;
  metadata: unknown;
};

function appointmentNumber(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).order;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function formatTucxaReceptionSummary(input: {
  date: string;
  appointments: ReceptionSummaryAppointment[];
  entityNames: ReadonlyMap<string, string>;
}): string {
  const byEntity = new Map<string, ReceptionSummaryAppointment[]>();
  for (const item of input.appointments) {
    const entityId = item.entity_id ?? "";
    const group = byEntity.get(entityId) ?? [];
    group.push(item);
    byEntity.set(entityId, group);
  }
  const sections = [...byEntity.entries()]
    .sort(([idA], [idB]) => (input.entityNames.get(idA) || "Entidade não informada")
      .localeCompare(input.entityNames.get(idB) || "Entidade não informada", "pt-BR"))
    .map(([id, appointments]) => {
      const sorted = [...appointments].sort((a, b) =>
        (a.consulente_name ?? "").localeCompare(b.consulente_name ?? "", "pt-BR", { sensitivity: "base" })
        || a.id.localeCompare(b.id));
      const lines = sorted.map((item) => {
        const number = appointmentNumber(item.metadata);
        return `${number === null ? "Nº não informado" : `Nº ${number}`} - ${item.consulente_name || "Consulente não informado"}`;
      });
      return `${input.entityNames.get(id) || "Entidade não informada"} (${sorted.length})\n${lines.join("\n")}`;
    });
  return `TUCXA - Resumo de agendamentos\nData: ${input.date}\nTotal: ${input.appointments.length}\n\n${sections.join("\n\n")}`;
}
