/** Homologação controlada do Agendamento TUCXA (fail-closed).
 *  Mesmo com a flag ausente/desligada, os dois crons ficam bloqueados.
 *  Para a operação geral posterior, será preciso uma revisão explícita do código.
 */
const TEST_DATE = "2026-10-13";
const TEST_APPOINTMENT_ID = "ea788ddd-005c-40c9-86f5-6c8a53d7a4f5";
const TEST_CONSULENTE_PERSON_PHONE = "19989848246";
const TEST_MEDIUM_PERSON_ID = "5e5c932d-f58b-4ea7-9896-4b60f6bd8ab5";
const TEST_MEDIUM_PHONE = "19992360856";
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const tucxaHomologation = {
  date: TEST_DATE,
  appointmentId: TEST_APPOINTMENT_ID,
  mediumPersonId: TEST_MEDIUM_PERSON_ID,
  enabled: process.env.TUCXA_AGENDAMENTO_HOMOLOGACAO_ENABLED === "true",
  ready() {
    return this.enabled &&
      process.env.TUCXA_AGENDAMENTO_HOMOLOGACAO_APPOINTMENT_ID === TEST_APPOINTMENT_ID &&
      process.env.TUCXA_AGENDAMENTO_HOMOLOGACAO_MEDIUM_PERSON_ID === TEST_MEDIUM_PERSON_ID &&
      UUID.test(TEST_APPOINTMENT_ID) && UUID.test(TEST_MEDIUM_PERSON_ID);
  },
};

function normalizeBrazilPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length === 13) digits = digits.slice(2);
  return digits.length === 11 ? digits : "";
}

export function homologationActiveToday(date: string): boolean {
  return tucxaHomologation.ready() && date === TEST_DATE;
}
export function homologationAppointmentAllowed(date: string, appointmentId: string, phone: string): boolean {
  return homologationActiveToday(date) && appointmentId === TEST_APPOINTMENT_ID &&
    normalizeBrazilPhone(phone) === TEST_CONSULENTE_PERSON_PHONE;
}
export function homologationMediumAllowed(date: string, personId: string, phone: string): boolean {
  return homologationActiveToday(date) && personId === TEST_MEDIUM_PERSON_ID &&
    normalizeBrazilPhone(phone) === TEST_MEDIUM_PHONE;
}
export function homologationAppointmentId(): string { return TEST_APPOINTMENT_ID; }

/** Operação recorrente: libera dias regulares de atendimento (segunda/terça),
 * sem lista manual de datas. A verificação de feriados, escala, vagas,
 * destinatários autorizados e duplicidade permanece nos crons respectivos.
 * TUCXA_AGENDAMENTO_GENERAL_DISPATCH_ENABLED=false é um bloqueio emergencial.
 */
export function generalDispatchAllowed(date: string): boolean {
  if (process.env.TUCXA_AGENDAMENTO_GENERAL_DISPATCH_ENABLED === "false") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const weekday = parsed.getUTCDay();
  return weekday === 1 || weekday === 2;
}
export function dispatchDateAllowed(date: string): boolean {
  return homologationActiveToday(date) || generalDispatchAllowed(date);
}
export function appointmentDispatchAllowed(date: string, appointmentId: string, phone: string): boolean {
  return generalDispatchAllowed(date) || homologationAppointmentAllowed(date, appointmentId, phone);
}
export function mediumDispatchAllowed(date: string, personId: string, phone: string): boolean {
  return generalDispatchAllowed(date) || homologationMediumAllowed(date, personId, phone);
}
export function receptionDispatchAllowed(date: string, personId: string, phone: string): boolean {
  return generalDispatchAllowed(date) || homologationMediumAllowed(date, personId, phone);
}
