import { firstTwoPersonNames } from "@/lib/organizacao-em-harmonia/person-display";
import { TUCXA_ADDRESS, TUCXA_MAPS_URL } from "@/lib/organizacao-em-harmonia/tucxa-location";

export const TUCXA_INDIVIDUAL_NOTICE = "Este agendamento é individual. Se você comparecer acompanhado de outra pessoa que também necessite de atendimento, é necessário fazer um agendamento específico para cada acompanhante.";

export const TUCXA_LOCATION_NOTICE = `Local do atendimento: ${TUCXA_ADDRESS}\nGoogle Maps: ${TUCXA_MAPS_URL}`;
export const TUCXA_RECEPTION_HELP = "Em caso de dúvida, fale com a Recepção do TUCXA.";

function datePtBr(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** Texto de prévia/auditoria. O WhatsApp real é definido no fluxo do BotConversa. */
export function appointmentConfirmationMessage(input: {
  fullName: string;
  appointmentDate: string;
  entityName: string;
  order?: number | null;
  confirmationUrl?: string;
}) {
  return [
    `🌿 TUCXA — Confirmação de agendamento`,
    `Olá, ${firstTwoPersonNames(input.fullName)}!`,
    `📅 ${datePtBr(input.appointmentDate)} · 🙏 ${input.entityName}`,
    `🕒 Chegada: 18h30 às 19h20`,
    input.confirmationUrl ? `✅ Confirme sua presença: ${input.confirmationUrl}` : "",
    `📍 Endereço e orientações no link de confirmação.`,
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
    `🌿 TUCXA — Lembrete de atendimento`,
    `Olá, ${firstTwoPersonNames(input.fullName)}!`,
    `📅 ${datePtBr(input.appointmentDate)} · 🙏 ${input.entityName}`,
    `🕒 Chegada: 18h30 às 19h20`,
    input.confirmed
      ? `✅ Sua presença já está confirmada.`
      : input.confirmationUrl
        ? `✅ Confirme sua presença: ${input.confirmationUrl}`
        : `Sua confirmação está pendente. Fale com a Recepção.`,
    input.confirmed
      ? `📍 Endereço e orientações: consulte sua confirmação anterior.`
      : input.confirmationUrl
        ? `📍 Endereço e orientações no link acima.`
        : `📍 Para endereço e orientações, fale com a Recepção.`,
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
    `Confirmação recebida: ${firstTwoPersonNames(input.fullName)} confirmou presença no TUCXA para ${datePtBr(input.appointmentDate)}, com ${input.entityName}.`,
    input.loginUrl ? `Acesse o painel da Recepção: ${input.loginUrl}` : "",
  ].filter(Boolean).join("\n\n");
}

export function appointmentBeneficentPizzaMessage(input: {
  appointmentDate: string;
}) {
  return [
    `🌿 Olá! Como você já estará conosco no TUCXA em ${datePtBr(input.appointmentDate)}, queremos deixar uma dica para a volta para casa. 😊`,
    "Estamos com pizzas beneficentes congeladas por R$ 50,00, nos sabores:",
    "🧀 Mussarela",
    "🌶️ Calabresa",
    "🥩 Lombinho",
    "É uma opção prática para levar e preparar quando quiser — e, ao adquirir uma pizza, você também colabora com a manutenção da nossa Casa e com a continuidade dos trabalhos do TUCXA. 💚",
    "Se tiver interesse, pode aproveitar sua vinda para retirar a sua.",
    "🍕 Você leva uma refeição para casa e deixa também uma contribuição para a Casa que acolhe tanta gente. 🙏",
    "Sem compromisso. Estamos apenas compartilhando esta possibilidade com carinho.",
  ].join("\n\n");
}

// Prévia para auditoria: o conteúdo efetivamente enviado é configurado no fluxo do BotConversa.
// Não fixar preços, data do sorteio nem regras ainda não homologadas pela Diretoria.
export function appointmentChristmasBasketMessage(input: { appointmentDate: string }) {
  return [
    `🎄 Olá! Como você já estará conosco no TUCXA em ${datePtBr(input.appointmentDate)}, queremos compartilhar uma iniciativa especial de Natal. 💚`,
    "Estamos organizando o sorteio de uma linda Cesta de Natal, preparada com muito carinho. 🎁",
    "Além da oportunidade de participar, você pode contribuir com a continuidade das atividades de acolhimento da nossa Casa.",
    "✨ Gostaria de conhecer a cesta, o regulamento e como participar? Responda *QUERO SABER* para receber as informações.",
    "A participação é opcional. Agradecemos por estar perto do TUCXA! 🌿",
  ].join("\n\n");
}
