import type { PresencaEvent } from "@/lib/presenca-querida";

export type PresencaAttraction = {
  title: string;
  subtitle?: string;
  time?: string;
  description: string;
  instagramUrl?: string;
};

export type PresencaMenuSection = {
  title: string;
  items: string[];
};

export type PresencaPublicEventExtras = {
  mapUrl: string;
  venueInstagramUrl: string;
  hostPhotoUrl: string;
  hostPhotoGallery: string[];
  eventGallery: string[];
  menuGallery: string[];
  attractions: PresencaAttraction[];
  menuSections: PresencaMenuSection[];
  buffetName: string;
  buffetInstagramUrl: string;
  drinksProviderName: string;
  drinksProviderInstagramUrl: string;
  cakeInfo: string;
  locationPositivePoints: string[];
  eventPositivePoints: string[];
};

export const DANIELA50_SLUGS = ["daniela-50-anos", "daniela-50-anos-demo"];

const DANIELA_ASSET_BASE = "/presenca-querida/daniela-50-anos";

export const DANIELA50_HOST_PHOTOS = [
  `${DANIELA_ASSET_BASE}/daniela-01.jpeg`,
  `${DANIELA_ASSET_BASE}/daniela-02.jpeg`,
  `${DANIELA_ASSET_BASE}/daniela-03.jpeg`,
];

export const DANIELA50_MENU_PHOTOS = Array.from({ length: 11 }, (_item, index) => `${DANIELA_ASSET_BASE}/cardapio-${String(index + 1).padStart(2, "0")}.jpeg`);

export const DANIELA50_CONFIRMATION_DEADLINE = "2026-11-30";

export const DANIELA50_REMINDER_SCHEDULE = {
  confirmed: [
    { date: "2026-12-12", label: "Lembrete carinhoso com horário, local e orientações finais" },
    { date: "2026-12-18", label: "Lembrete final curto na véspera" },
  ],
  maybe: [
    { date: "2026-11-15", label: "Lembrete gentil para quem marcou talvez" },
    { date: "2026-11-25", label: "Último lembrete antes do fechamento" },
    { date: "2026-11-30", label: "Prazo final de confirmação" },
  ],
  pending: [
    { date: "2026-11-10", label: "Primeiro lembrete para pendentes" },
    { date: "2026-11-20", label: "Segundo lembrete carinhoso" },
    { date: "2026-11-28", label: "Aviso de fechamento da lista" },
    { date: "2026-11-30", label: "Prazo final de confirmação" },
  ],
};

export const DANIELA50_FALLBACK_EVENT: Partial<PresencaEvent> = {
  event_type: "aniversario",
  name: "Daniela 50 anos",
  slug: "daniela-50-anos",
  host_name: "Daniela",
  event_date: "2026-12-19",
  event_time: "12h30 às 17h30",
  venue_name: "Chácara Piloto",
  address: "Chácara Piloto, Campinas - SP",
  city: "Campinas",
  state: "SP",
  public_headline: "Sua presença é muito querida nos 50 anos da Daniela.",
  invitation_message:
    "A Daniela vai celebrar 50 anos cercada de pessoas que fazem parte da história dela. Esta página reúne os detalhes da festa e, para quem recebeu o link individual, também permite confirmar presença com carinho.",
  dress_code: "Venha confortável para um almoço de celebração, música ao vivo e momentos especiais.",
  parking_info: "Confira o endereço pelo Google Maps antes de sair e chegue com tranquilidade.",
  status: "configuracao",
  is_surprise: false,
  is_demo: false,
  primary_color: "#E85D75",
  accent_color: "#31C16B",
};

export const DANIELA50_EXTRAS: PresencaPublicEventExtras = {
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Ch%C3%A1cara%20Piloto%20Campinas%20SP",
  venueInstagramUrl: "https://www.instagram.com/chacara.piloto?igsh=MWxobnJham9tMXQyZg==",
  hostPhotoUrl: DANIELA50_HOST_PHOTOS[0],
  hostPhotoGallery: DANIELA50_HOST_PHOTOS,
  eventGallery: DANIELA50_HOST_PHOTOS,
  menuGallery: DANIELA50_MENU_PHOTOS,
  attractions: [
    {
      title: "Banda Raça de Quintal",
      subtitle: "Samba, alegria e clima de celebração",
      time: "13h30 às 16h30",
      description: "A trilha principal da tarde fica por conta da Banda Raça de Quintal, trazendo música ao vivo para deixar a comemoração ainda mais viva e memorável.",
      instagramUrl: "https://www.instagram.com/racadequintal?igsh=NmZjOGJxenNic3Ni",
    },
    {
      title: "DJ Gabriel Mattano",
      subtitle: "Antes e depois da banda",
      time: "Fora do período da banda",
      description: "Nos intervalos da programação ao vivo, o DJ Gabriel Mattano mantém o clima gostoso da festa com seleção musical para acolher os convidados.",
      instagramUrl: "https://www.instagram.com/mattanos_vintage?igsh=MTVld2xsbXd5czNxbA==",
    },
  ],
  menuSections: [
    {
      title: "Entradinhas e acompanhamentos",
      items: ["Churipam com chimichurri", "Guacamole com doritos caseiro", "Pão de alho", "Mandioca frita", "Batata frita", "Salada Caesar", "Maionese de legumes", "Salada marroquina", "Vinagrete", "Farofa"],
    },
    {
      title: "Carnes e pratos quentes",
      items: ["Contra filé", "Maminha", "Linguiça", "Tulipa de frango", "Arroz branco", "Arroz primavera", "Feijão gordo"],
    },
    {
      title: "Bebidas e sobremesa",
      items: ["Coca-Cola", "Guaraná", "Água aromatizada", "Chopp Kremer", "Bolo de abacaxi", "Docinhos"],
    },
  ],
  buffetName: "J_M Festas",
  buffetInstagramUrl: "https://www.instagram.com/magali.goes.9?igsh=cW50c2dyamFmYmNp",
  drinksProviderName: "Chopp Kremer Campinas",
  drinksProviderInstagramUrl: "https://www.instagram.com/choppkremercampinas/",
  cakeInfo: "Bolo de abacaxi e docinhos para fechar a tarde com doçura.",
  locationPositivePoints: [
    "Espaço de chácara para um almoço leve, familiar e acolhedor.",
    "Horário diurno, das 12h30 às 17h30, ideal para celebrar com tranquilidade.",
    "Endereço com acesso direto pelo Google Maps para reduzir dúvidas dos convidados.",
  ],
  eventPositivePoints: [
    "Música ao vivo com a Banda Raça de Quintal no melhor momento da tarde.",
    "DJ antes e depois da banda para manter a energia da festa.",
    "Buffet completo, bebidas, chopp, bolo e docinhos para receber bem cada pessoa querida.",
  ],
};

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function asAttractions(value: unknown, fallback: PresencaAttraction[]) {
  if (!Array.isArray(value)) return fallback;
  const items: PresencaAttraction[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = String(record.title ?? "").trim();
    const description = String(record.description ?? "").trim();
    if (!title || !description) continue;
    items.push({
      title,
      subtitle: String(record.subtitle ?? "").trim() || undefined,
      time: String(record.time ?? "").trim() || undefined,
      description,
      instagramUrl: String(record.instagramUrl ?? record.instagram_url ?? "").trim() || undefined,
    });
  }

  return items.length > 0 ? items : fallback;
}

function asMenuSections(value: unknown, fallback: PresencaMenuSection[]) {
  if (!Array.isArray(value)) return fallback;
  const sections: PresencaMenuSection[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = String(record.title ?? "").trim();
    const items = asStringArray(record.items, []);
    if (!title || items.length === 0) continue;
    sections.push({ title, items });
  }

  return sections.length > 0 ? sections : fallback;
}

export function isDaniela50Event(event?: { slug?: string | null; name?: string | null } | null) {
  const slug = String(event?.slug ?? "").toLowerCase();
  const name = String(event?.name ?? "").toLowerCase();
  return DANIELA50_SLUGS.includes(slug) || name.includes("daniela 50");
}

export function getPresencaPublicEventExtras(event?: Record<string, unknown> | null): PresencaPublicEventExtras {
  const fallback = isDaniela50Event(event) || !event ? DANIELA50_EXTRAS : {
    ...DANIELA50_EXTRAS,
    hostPhotoUrl: "",
    hostPhotoGallery: [],
    eventGallery: [],
    menuGallery: [],
    attractions: [],
    menuSections: [],
    buffetName: "",
    buffetInstagramUrl: "",
    drinksProviderName: "",
    drinksProviderInstagramUrl: "",
    cakeInfo: "",
    locationPositivePoints: [],
    eventPositivePoints: [],
  };

  const mapUrl = String(event?.map_url ?? "").trim() || fallback.mapUrl;
  const hostPhotoGallery = asStringArray(event?.host_photo_gallery, fallback.hostPhotoGallery);
  const hostPhotoUrl = String(event?.host_photo_url ?? "").trim() || hostPhotoGallery[0] || fallback.hostPhotoUrl;

  return {
    mapUrl,
    venueInstagramUrl: String(event?.venue_instagram_url ?? "").trim() || fallback.venueInstagramUrl,
    hostPhotoUrl,
    hostPhotoGallery,
    eventGallery: asStringArray(event?.event_gallery, fallback.eventGallery),
    menuGallery: asStringArray(event?.menu_gallery, fallback.menuGallery),
    attractions: asAttractions(event?.attractions, fallback.attractions),
    menuSections: asMenuSections(event?.menu_sections, fallback.menuSections),
    buffetName: String(event?.buffet_name ?? "").trim() || fallback.buffetName,
    buffetInstagramUrl: String(event?.buffet_instagram_url ?? "").trim() || fallback.buffetInstagramUrl,
    drinksProviderName: String(event?.drinks_provider_name ?? "").trim() || fallback.drinksProviderName,
    drinksProviderInstagramUrl: String(event?.drinks_provider_instagram_url ?? "").trim() || fallback.drinksProviderInstagramUrl,
    cakeInfo: String(event?.cake_info ?? "").trim() || fallback.cakeInfo,
    locationPositivePoints: asStringArray(event?.location_positive_points, fallback.locationPositivePoints),
    eventPositivePoints: asStringArray(event?.event_positive_points, fallback.eventPositivePoints),
  };
}

export function buildRelationshipLine(guest: Record<string, unknown>) {
  const label = String(guest.relationship_label ?? "").trim();
  const context = String(guest.relationship_context ?? "").trim();
  const group = String(guest.group_name ?? "").trim();

  if (label && context) return `${label} da Daniela — ${context}`;
  if (label) return `${label} da Daniela`;
  if (context) return context;
  if (group) return `grupo ${group}`;
  return "pessoa querida na história da Daniela";
}

export function buildRelationshipInviteLine(guest: Record<string, unknown>) {
  const label = String(guest.relationship_label ?? "").trim();
  const context = String(guest.relationship_context ?? "").trim();
  const group = String(guest.group_name ?? "").trim();

  if (label && context) {
    return `Você recebe este convite porque é ${label.toLowerCase()} da Dani e também faz parte dessa história por ${context.toLowerCase()}.`;
  }

  if (label) return `Você recebe este convite porque é ${label.toLowerCase()} da Dani e faz parte dessa história.`;
  if (context) return `Você recebe este convite porque faz parte da história da Dani por ${context.toLowerCase()}.`;
  if (group) return `Você recebe este convite porque faz parte do grupo ${group}, um círculo querido da Dani.`;
  return "Você recebe este convite porque a Dani fez questão de ter por perto pessoas importantes da história dela.";
}

export function formatDaniela50Deadline() {
  return new Date(`${DANIELA50_CONFIRMATION_DEADLINE}T12:00:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function buildDaniela50EarlyInviteReason() {
  return `Mesmo faltando alguns meses, dezembro costuma encher rápido de festas, confraternizações e compromissos de fim de ano. Por isso o convite está chegando agora: para você já reservar a data e para a família conseguir organizar buffet, bebidas, mesas e recepção com calma, sem transformar confirmação em cobrança.`;
}

export function buildPublicConfirmationUrl(input: { baseUrl: string; event: Partial<PresencaEvent>; token: string }) {
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const slug = String(input.event.slug ?? DANIELA50_FALLBACK_EVENT.slug ?? "daniela-50-anos").trim() || "daniela-50-anos";
  return `${baseUrl}/solucoes/presenca-querida/evento/${encodeURIComponent(slug)}?convite=${encodeURIComponent(input.token)}#confirmacao`;
}

export function buildPersonalizedInvitationMessage(input: {
  guest: Record<string, unknown>;
  event: Partial<PresencaEvent>;
  confirmationUrl: string;
}) {
  const firstName = String(input.guest.full_name ?? "").trim().split(/\s+/)[0] || "tudo bem";
  const hostName = input.event.host_name || "Dani";
  const relationshipLine = buildRelationshipInviteLine(input.guest);
  const deadline = formatDaniela50Deadline();

  return [
    `Oi, ${firstName}!`,
    "",
    `${hostName} vai comemorar 50 anos e fez questão de te convidar com carinho.`,
    relationshipLine,
    "",
    buildDaniela50EarlyInviteReason(),
    "",
    `O prazo ideal para confirmar é até ${deadline}. No link abaixo estão os detalhes da festa e os botões para responder:`,
    input.confirmationUrl,
  ]
    .filter(Boolean)
    .join("\n");
}
