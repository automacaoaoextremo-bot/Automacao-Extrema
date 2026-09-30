export const TUCXA_INDIVIDUAL_NOTICE = "Este agendamento é individual. Se você comparecer acompanhado de outra pessoa que também necessite de atendimento, é necessário fazer um agendamento específico para cada acompanhante.";

function datePtBr(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function orderLine(order?: number | null) {
  return order && order > 0 ? `Ordem do agendamento: ${order}.` : "";
}

export function appointmentConfirmationMessage(input: {
  fullName: string;
  appointmentDate: string;
  entityName: string;
  order?: number | null;
  confirmationUrl?: string;
}) {
  return [
    `Olá! O agendamento de ${input.fullName} no TUCXA foi realizado para ${datePtBr(input.appointmentDate)}, com ${input.entityName}.`,
    orderLine(input.order),
    "Sua confirmação é importante porque ajuda a Recepção a organizar as vagas com antecedência e a preparar um acolhimento mais cuidadoso para cada pessoa.",
    input.confirmationUrl ? `Confirme sua presença aqui: ${input.confirmationUrl}` : "",
    TUCXA_INDIVIDUAL_NOTICE,
  ].filter(Boolean).join("\n\n");
}

export function appointmentReminderMessage(input: {
  fullName: string;
  appointmentDate: string;
  entityName: string;
  order?: number | null;
  confirmed: boolean;
  confirmationUrl?: string;
}) {
  return [
    `Lembrete do agendamento de ${input.fullName} no TUCXA: ${datePtBr(input.appointmentDate)}, com ${input.entityName}.`,
    orderLine(input.order),
    input.confirmed
      ? "Sua presença já está confirmada. Agradecemos por avisar com antecedência; isso ajuda a Recepção a organizar o atendimento de todos."
      : "Sua presença ainda não foi confirmada. Confirmar agora ajuda a Recepção a organizar as vagas e evita que uma vaga fique reservada sem necessidade.",
    !input.confirmed && input.confirmationUrl ? `Confirme sua presença aqui: ${input.confirmationUrl}` : "",
    TUCXA_INDIVIDUAL_NOTICE,
  ].filter(Boolean).join("\n\n");
}

export function receptionConfirmationMessage(input: {
  fullName: string;
  appointmentDate: string;
  entityName: string;
  order?: number | null;
  loginUrl?: string;
}) {
  return [
    `Confirmação recebida: ${input.fullName} confirmou presença no TUCXA para ${datePtBr(input.appointmentDate)}, com ${input.entityName}.`,
    orderLine(input.order),
    input.loginUrl ? `Acesse o painel da Recepção: ${input.loginUrl}` : "",
  ].filter(Boolean).join("\n\n");
}
