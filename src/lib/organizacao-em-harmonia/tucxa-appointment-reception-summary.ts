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
        return item.consulente_name || "Consulente não informado";
      });
      const name = input.entityNames.get(id) || "Entidade não informada";
      const line = input.entityLines?.get(id) || "";
      const cavalinho = input.cavalinhoNames?.get(id) || "";
      const capacity = input.entityCapacities?.get(id);
      const heading = `${name} (${line}) (${cavalinho}) (${sorted.length}/${capacity ?? "?"})`;
      return `${heading}\n${lines.map((item) => `- ${item}`).join("\n")}`;
    });
  return `TUCXA - Resumo de agendamentos\nTotal: ${input.appointments.length}\n\n${sections.join("\n\n")}`;
}
