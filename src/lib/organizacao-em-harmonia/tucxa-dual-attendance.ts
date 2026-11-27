// AG34: labels are based on canonical person/date, never names or phone.
export type DualAttendance = { id: string; personId: string; entityId: string; appointmentDate: string; status: string };
export type DualEntity = { id: string; name: string; line: string };
const active = new Set(["solicitado", "confirmado", "aprovado", "presente", "concluido"]);
const medical = (line: string) => /\bmedic[ao]\b/.test(line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
export function dualAttendanceLabels(rows: DualAttendance[], entities: DualEntity[]) {
  const groups = new Map<string, DualAttendance[]>();
  const catalog = new Map(entities.map(e => [e.id, e]));
  const result = new Map<string, string>();
  for (const row of rows) {
    if (!row.personId || !row.appointmentDate || !active.has(row.status)) continue;
    const key = `${row.personId}|${row.appointmentDate}`;
    const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length !== 2 || group[0].entityId === group[1].entityId) continue;
    const [a,b] = group; const ea = catalog.get(a.entityId); const eb = catalog.get(b.entityId);
    if (!ea || !eb) continue;
    const ma = medical(ea.line), mb = medical(eb.line);
    result.set(a.id, `${ma === mb ? "Também" : ma ? "Antes" : "Depois"}: ${eb.name}`);
    result.set(b.id, `${ma === mb ? "Também" : mb ? "Antes" : "Depois"}: ${ea.name}`);
  }
  return result;
}
