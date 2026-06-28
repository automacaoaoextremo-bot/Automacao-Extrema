export type PresencaEventType =
  | "aniversario"
  | "bodas"
  | "casamento"
  | "festa_surpresa"
  | "confraternizacao"
  | "evento_familiar"
  | "outro";

export type PresencaLeadStatus =
  | "novo_whatsapp"
  | "email_acesso_enviado"
  | "aguardando_primeiro_acesso"
  | "em_configuracao"
  | "avaliacao_30_dias"
  | "followup_7d"
  | "followup_15d"
  | "followup_25d"
  | "depoimento_solicitado"
  | "cliente_ativo"
  | "sem_resposta"
  | "encerrado";

export type PresencaGuestStatus =
  | "pendente"
  | "reservou_data"
  | "talvez"
  | "confirmado"
  | "confirmado_com_acompanhantes"
  | "nao_podera_ir"
  | "remover";

export type PresencaEvent = {
  id: string;
  ae_client_id: string | null;
  event_type: PresencaEventType;
  name: string;
  slug: string;
  host_name: string | null;
  event_date: string | null;
  event_time: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  email: string | null;
  public_headline: string | null;
  invitation_message: string | null;
  dress_code: string | null;
  parking_info: string | null;
  venue_instagram_url?: string | null;
  map_url?: string | null;
  location_notes?: string | null;
  host_photo_url?: string | null;
  host_photo_gallery?: string[] | null;
  event_gallery?: string[] | null;
  menu_gallery?: string[] | null;
  attractions?: unknown[] | null;
  menu_sections?: unknown[] | null;
  buffet_name?: string | null;
  buffet_instagram_url?: string | null;
  drinks_provider_name?: string | null;
  drinks_provider_instagram_url?: string | null;
  cake_info?: string | null;
  location_positive_points?: string[] | null;
  event_positive_points?: string[] | null;
  privacy_notes?: string | null;
  landing_enabled?: boolean | null;
  public_status?: string | null;
  public_approval_token?: string | null;
  public_approval_enabled?: boolean | null;
  status: string;
  is_surprise: boolean;
  is_demo: boolean;
  primary_color: string | null;
  accent_color: string | null;
};

export type PresencaPerson = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email: string | null;
  whatsapp?: string | null;
  status?: string | null;
};

export type PresencaRole = {
  id: string;
  name: string;
  slug: string;
  is_manager: boolean;
  is_guest_role: boolean;
};

export type PresencaPersonEventLink = {
  id: string;
  is_manager: boolean;
  is_support: boolean;
  role: PresencaRole | null;
  event: PresencaEvent | null;
};

export type PresencaGuest = {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  group_name: string | null;
  relationship_type?: string | null;
  relationship_label?: string | null;
  relationship_context?: string | null;
  invite_context?: string | null;
  guest_status: PresencaGuestStatus;
  adults_count: number | null;
  children_count: number | null;
  companions_allowed: number | null;
  companions_confirmed_count: number | null;
  primary_guest_id?: string | null;
  household_label?: string | null;
  is_invite_recipient?: boolean | null;
  dietary_notes: string | null;
  notes: string | null;
  message_preview?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  individual_token: string;
  invited_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type PresencaDashboardItem = {
  event_id: string;
  event_name: string;
  event_slug: string;
  event_type: PresencaEventType;
  event_date: string | null;
  total_guests: number;
  confirmed_count: number;
  maybe_count: number;
  declined_count: number;
  pending_count: number;
  adults_count: number;
  children_count: number;
  companions_count: number;
  response_rate: number;
};

export type PresencaClientTerm = {
  id: string;
  event_id: string;
  condition_label: string;
  contract_status: string;
  fee_status: string;
  setup_fee: number | null;
  event_fee: number | null;
  monthly_fee: number | null;
  pilot_days: number | null;
  allow_testimonial: boolean;
  allow_logo_use: boolean;
  allow_prints_use: boolean;
  terms_accepted: boolean;
  accepted_at: string | null;
  notes: string | null;
};

export type PresencaClientDashboardPayload = {
  user?: { id: string; email?: string | null };
  person: PresencaPerson;
  events: PresencaEvent[];
  links: PresencaPersonEventLink[];
  is_manager: boolean;
  dashboard: PresencaDashboardItem[];
  guests: PresencaGuest[];
  clientTerms: PresencaClientTerm[];
};

export type PresencaLead = {
  id: string;
  source: string;
  event_type: PresencaEventType;
  event_name: string;
  event_slug: string | null;
  responsible_name: string;
  email: string | null;
  whatsapp: string | null;
  state: string | null;
  city: string | null;
  guests_estimate: number | null;
  event_date: string | null;
  event_context: string | null;
  observations: string | null;
  status: PresencaLeadStatus;
  founder_terms_accepted: boolean;
  testimonial_permission: boolean;
  lgpd_contact_consent: boolean;
  access_user_email: string | null;
  access_sent_at: string | null;
  access_due_at: string | null;
  internal_alert_at: string | null;
  internal_alert_sent_at: string | null;
  trial_days: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  ae_client_id: string | null;
  event_id: string | null;
  responsible_person_id: string | null;
  auth_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PresencaLeadPayload = {
  source?: string;
  contactName?: string;
  contact_name?: string;
  responsibleName?: string;
  responsible_name?: string;
  eventType?: PresencaEventType | string;
  event_type?: PresencaEventType | string;
  eventName?: string;
  event_name?: string;
  email?: string;
  whatsapp?: string;
  state?: string;
  uf?: string;
  city?: string;
  guestsEstimate?: string | number;
  guests_estimate?: string | number;
  eventDate?: string;
  event_date?: string;
  eventContext?: string;
  event_context?: string;
  observations?: string;
  notes?: string;
  founderTermsAccepted?: boolean;
  founder_terms_accepted?: boolean;
  testimonialPermission?: boolean;
  testimonial_permission?: boolean;
  lgpdContactConsent?: boolean;
  lgpd_contact_consent?: boolean;
};

export const PRESENCA_LEAD_STATUS_LABELS: Record<PresencaLeadStatus, string> = {
  novo_whatsapp: "Lead recebido",
  email_acesso_enviado: "Acesso enviado",
  aguardando_primeiro_acesso: "Aguardando primeiro acesso",
  em_configuracao: "Em configuração",
  avaliacao_30_dias: "Avaliação 30 dias",
  followup_7d: "Follow-up 7 dias",
  followup_15d: "Follow-up 15 dias",
  followup_25d: "Follow-up 25 dias",
  depoimento_solicitado: "Depoimento solicitado",
  cliente_ativo: "Cliente ativo",
  sem_resposta: "Sem resposta",
  encerrado: "Encerrado",
};

export const PRESENCA_GUEST_STATUS_LABELS: Record<PresencaGuestStatus, string> = {
  pendente: "Pendente",
  reservou_data: "Reservou a data",
  talvez: "Talvez",
  confirmado: "Confirmado",
  confirmado_com_acompanhantes: "Confirmado com convidados vinculados",
  nao_podera_ir: "Não poderá ir",
  remover: "Remover da lista",
};

export function normalizePresencaEventType(value: unknown): PresencaEventType {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("boda")) return "bodas";
  if (normalized.includes("casamento")) return "casamento";
  if (normalized.includes("surpresa")) return "festa_surpresa";
  if (normalized.includes("confratern")) return "confraternizacao";
  if (normalized.includes("famil")) return "evento_familiar";
  if (normalized.includes("anivers")) return "aniversario";
  return "outro";
}

export function formatPresencaEventType(value: PresencaEventType | string | null | undefined) {
  const labels: Record<string, string> = {
    aniversario: "Aniversário",
    bodas: "Bodas",
    casamento: "Casamento",
    festa_surpresa: "Festa surpresa",
    confraternizacao: "Confraternização",
    evento_familiar: "Evento familiar",
    outro: "Outro evento afetivo",
  };
  return labels[String(value ?? "")] ?? "Evento afetivo";
}

export function integerBR(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function percentBR(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}%`;
}

export function formatDateBR(value: string | null | undefined) {
  if (!value) return "Data a definir";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export type PresencaPermissionKey =
  | "cadastro.view"
  | "cadastro.edit"
  | "convidados.view"
  | "convidados.edit"
  | "convidados.import"
  | "mensagens.view"
  | "mensagens.send"
  | "confirmacoes.view"
  | "confirmacoes.review"
  | "relatorios.view"
  | "relatorios.export";

export const PRESENCA_PERMISSION_LABELS: Record<PresencaPermissionKey, string> = {
  "cadastro.view": "Ver cadastro do evento",
  "cadastro.edit": "Editar cadastro do evento",
  "convidados.view": "Ver lista de convidados",
  "convidados.edit": "Incluir e editar convidados",
  "convidados.import": "Importar convidados por planilha",
  "mensagens.view": "Ver mensagens por fase",
  "mensagens.send": "Preparar/envio de mensagens",
  "confirmacoes.view": "Ver confirmações",
  "confirmacoes.review": "Revisar respostas e pendências",
  "relatorios.view": "Ver relatórios",
  "relatorios.export": "Exportar listas e relatórios",
};

export const PRESENCA_DEFAULT_PERMISSIONS: PresencaPermissionKey[] = [
  "cadastro.view",
  "cadastro.edit",
  "convidados.view",
  "convidados.edit",
  "convidados.import",
  "mensagens.view",
  "mensagens.send",
  "confirmacoes.view",
  "confirmacoes.review",
  "relatorios.view",
  "relatorios.export",
];

export type PresencaOnboardingStepKey =
  | "evento"
  | "convite"
  | "privacidade"
  | "convidados"
  | "grupos"
  | "mensagens"
  | "teste_confirmacao"
  | "relatorios"
  | "pos_evento";

export type PresencaOnboardingStep = {
  key: PresencaOnboardingStepKey;
  title: string;
  description: string;
  why: string;
  href: string;
  done: boolean;
  required: boolean;
  sortOrder: number;
};

export type PresencaOnboardingInput = {
  event?: Partial<PresencaEvent> | null;
  guestCount?: number | null;
  groupCount?: number | null;
  confirmedCount?: number | null;
  maybeCount?: number | null;
  messageCount?: number | null;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildPresencaOnboardingSteps(input: PresencaOnboardingInput): PresencaOnboardingStep[] {
  const event = input.event ?? {};
  const guestCount = Number(input.guestCount ?? 0);
  const groupCount = Number(input.groupCount ?? 0);
  const confirmedCount = Number(input.confirmedCount ?? 0);
  const messageCount = Number(input.messageCount ?? 0);

  return [
    {
      key: "evento",
      title: "Completar dados do evento",
      description: "Confirme nome, tipo, anfitrião, data, horário, local e cidade.",
      why: "Esses dados alimentam a página pública e reduzem perguntas repetidas no WhatsApp.",
      href: "/solucoes/presenca-querida/cliente/cadastro",
      done: hasText(event.name) && hasText(event.event_type) && hasText(event.host_name) && hasText(event.event_date),
      required: true,
      sortOrder: 1,
    },
    {
      key: "convite",
      title: "Ajustar convite e tom da mensagem",
      description: "Defina chamada principal, texto do convite, modo surpresa, traje e orientações finais.",
      why: "O diferencial é convidar com carinho, não apenas coletar um sim ou não.",
      href: "/solucoes/presenca-querida/cliente/cadastro",
      done: hasText(event.public_headline) && hasText(event.invitation_message),
      required: true,
      sortOrder: 2,
    },
    {
      key: "privacidade",
      title: "Revisar privacidade e exposição",
      description: "Confirme se o evento é surpresa, o que aparece publicamente e como os dados serão usados.",
      why: "Eventos afetivos exigem confiança, cuidado com dados pessoais e proteção contra exposição indesejada.",
      href: "/solucoes/presenca-querida/cliente/cadastro",
      done: hasText(event.status),
      required: true,
      sortOrder: 3,
    },
    {
      key: "convidados",
      title: "Cadastrar ou importar convidados",
      description: "Inclua nome, WhatsApp, grupo, parentesco, origem do relacionamento e convidados vinculados ao responsável.",
      why: "A lista centralizada tira a organização das conversas soltas, personaliza o convite e dá previsibilidade.",
      href: "/solucoes/presenca-querida/cliente/convidados",
      done: guestCount > 0,
      required: true,
      sortOrder: 4,
    },
    {
      key: "grupos",
      title: "Separar convidados por grupos",
      description: "Organize família, amigos, trabalho, grupo espiritual e convidados especiais.",
      why: "Cada grupo pode receber um tom de comunicação mais adequado.",
      href: "/solucoes/presenca-querida/cliente/convidados",
      done: groupCount > 1,
      required: false,
      sortOrder: 5,
    },
    {
      key: "mensagens",
      title: "Preparar mensagens por fase",
      description: "Save the Date, convite oficial, lembrete carinhoso, orientação final e agradecimento.",
      why: "A confirmação acontece melhor quando a jornada é educada e não parece cobrança.",
      href: "/solucoes/presenca-querida/cliente/mensagens",
      done: messageCount > 0,
      required: true,
      sortOrder: 6,
    },
    {
      key: "teste_confirmacao",
      title: "Fazer um teste de confirmação",
      description: "Teste o link individual antes de enviar para todos os convidados.",
      why: "Um teste evita ruídos no lançamento do convite e protege a experiência do convidado.",
      href: "/solucoes/presenca-querida/cliente/confirmacoes",
      done: confirmedCount > 0,
      required: true,
      sortOrder: 7,
    },
    {
      key: "relatorios",
      title: "Conferir indicadores para operação",
      description: "Veja adultos, crianças, convidados vinculados, pendentes, talvez e confirmados por grupo.",
      why: "Esses dados apoiam buffet, mesas, lembrancinhas, recepção e comunicação final.",
      href: "/solucoes/presenca-querida/cliente/relatorios",
      done: hasPositiveNumber(guestCount),
      required: false,
      sortOrder: 8,
    },
    {
      key: "pos_evento",
      title: "Planejar agradecimento pós-evento",
      description: "Prepare recado, fotos, mural de memórias e pedido de depoimento do Cliente Fundador.",
      why: "O pós-evento transforma a confirmação em memória afetiva e prova real para evoluir a solução.",
      href: "/solucoes/presenca-querida/cliente/mensagens",
      done: false,
      required: false,
      sortOrder: 9,
    },
  ];
}
