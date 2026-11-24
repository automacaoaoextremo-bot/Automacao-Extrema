import type { Daniela50Campaign, Daniela50ReminderAudience } from "@/lib/presenca-daniela50";

export type ReminderGuest = {
  id: string;
  full_name: string;
  individual_token: string | null;
  whatsapp: string | null;
  guest_status: string | null;
  primary_guest_id: string | null;
  is_invite_recipient: boolean | null;
  is_active: boolean | null;
};

export function reminderAudience(status: string | null): Daniela50ReminderAudience | null {
  if (status === "confirmado" || status === "confirmado_com_acompanhantes") return "confirmado";
  if (status === "talvez") return "talvez";
  if (!status || status === "pendente" || status === "reservou_data") return "pendente";
  return null;
}

// Um único lembrete por convite, com respostas individuais dos vinculados.
export function reminderTargets<T extends ReminderGuest>(guests: T[], campaign: Daniela50Campaign) {
  const active = guests.filter((guest) => guest.is_active === true && guest.guest_status !== "remover");
  const groups = new Map<string, T[]>();
  for (const guest of active) {
    const key = guest.primary_guest_id || guest.id;
    const group = groups.get(key) ?? [];
    group.push(guest);
    groups.set(key, group);
  }
  const targets = [];
  let skippedNoRecipient = 0;
  for (const [id, people] of groups) {
    const unresolved = people.filter((guest) => ["pendente", "talvez"].includes(reminderAudience(guest.guest_status) ?? ""));
    const confirmed = people.filter((guest) => reminderAudience(guest.guest_status) === "confirmado");
    if (campaign === "final-rsvp" ? !unresolved.length : !confirmed.length) continue;
    const recipient = people.find((guest) => guest.id === id && guest.is_invite_recipient === true && guest.individual_token && guest.whatsapp?.replace(/\D/g, "").length);
    if (!recipient) { skippedNoRecipient += 1; continue; }
    const audience: Daniela50ReminderAudience = campaign === "final-rsvp" ? (unresolved.some((guest) => reminderAudience(guest.guest_status) === "pendente") ? "pendente" : "talvez") : "confirmado";
    targets.push({ recipient, audience, pendingNames: unresolved.map((guest) => guest.full_name), confirmedNames: confirmed.map((guest) => guest.full_name), mixed: people.length > 1 });
  }
  return { targets, skippedNoRecipient };
}
