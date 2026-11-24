import type { PresencaEvent } from "@/lib/presenca-querida";

export type PresencaAttraction = {
  title: string;
  subtitle?: string;
  time?: string;
  description: string;
  instagramUrl?: string;
  imageUrl?: string;
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
  venueGallery: string[];
  menuGallery: string[];
  attractions: PresencaAttraction[];
  menuSections: PresencaMenuSection[];
  buffetName: string;
  buffetInstagramUrl: string;
  drinksProviderName: string;
  drinksProviderInstagramUrl: string;
  drinksPhotoUrl: string;
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

export const DANIELA50_VENUE_PHOTOS = [`${DANIELA_ASSET_BASE}/chacara-01.png`, `${DANIELA_ASSET_BASE}/chacara-02.png`];
export const DANIELA50_MENU_PHOTOS = [] as string[];
export const DANIELA50_CHOPP_PHOTO = `${DANIELA_ASSET_BASE}/chopp-kremer.png`;
export const DANIELA50_BAND_PHOTO = `${DANIELA_ASSET_BASE}/raca-de-quintal.png`;
export const DANIELA50_SKY_BARTENDERS_PHOTO = `${DANIELA_ASSET_BASE}/sky-bartenders.png`;
export const DANIELA50_SKY_BARTENDERS_INSTAGRAM = "https://www.instagram.com/skybartenders/";
export const DANIELA50_DJ_PHOTO = `${DANIELA_ASSET_BASE}/dj-gabriel.png`;

export const DANIELA50_CONFIRMATION_DEADLINE = "2026-12-01";

export const DANIELA50_REMINDER_SCHEDULE = {
  confirmed: [
    { date: "2026-12-12", label: "Lembrete com local, horário, mapa, clima da festa" },
    { date: "2026-12-18", label: "Lembrete final curto" },
  ],
  maybe: [
    { date: "2026-11-05", label: "Lembrete gentil para talvez + novidade dos recados" },
    { date: "2026-11-12", label: "Último lembrete antes do fechamento" },
    { date: "2026-11-19", label: "Prazo original" },
    { date: "2026-12-01", label: "Última oportunidade de confirmação" },
  ],
  pending: [
    { date: "2026-11-01", label: "Primeiro lembrete para pendentes + recado para a Dani" },
    { date: "2026-11-10", label: "Segundo lembrete para pendentes" },
    { date: "2026-11-18", label: "Aviso de fechamento" },
    { date: "2026-11-19", label: "Prazo original" },
    { date: "2026-12-01", label: "Última oportunidade de confirmação" },
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
  address: "Valinhos, SP",
  city: "Valinhos",
  state: "SP",
  public_headline: "Sua presença é muito querida nos meus 50 anos.",
  invitation_message:
    "Quero celebrar meus 50 anos com pessoas que fazem parte da minha história.\nEsta página reúne detalhes da festa e também permite a confirmação da sua presença.",
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
  hostPhotoGallery: [DANIELA50_HOST_PHOTOS[0]],
  venueGallery: DANIELA50_VENUE_PHOTOS,
  menuGallery: DANIELA50_MENU_PHOTOS,
  attractions: [
    {
      title: "Banda Raça de Quintal",
      subtitle: "Samba, alegria e clima de celebração",
      time: "13h30 às 16h30",
      description: "No melhor momento da tarde, a Banda Raça de Quintal entra para embalar a celebração com muito samba e alegria!",
      instagramUrl: "https://www.instagram.com/racadequintal?igsh=NmZjOGJxenNic3Ni",
      imageUrl: DANIELA50_BAND_PHOTO,
    },
    {
      title: "DJ Gabriel Mattano",
      subtitle: "Recepção musical antes e depois da banda",
      time: "Antes do almoço, nos intervalos e no encerramento",
      description: "O DJ Gabriel Mattano cuida da trilha da recepção e dos intervalos para que a energia da festa siga leve, acolhedora e com a cara da Dani do começo ao fim.",
      instagramUrl: "https://www.instagram.com/gabrielmattanosilva/",
      imageUrl: DANIELA50_DJ_PHOTO,
    },
    {
      title: "Sky Bartenders",
      subtitle: "Drinks preparados na hora para brindar os 50 da Dani",
      time: "Durante a tarde de comemoração",
      description: "Uma novidade para deixar a tarde ainda mais especial: o pessoal da Sky Bartenders estará na festa preparando bebidas e drinks para acompanhar os encontros, a música e os brindes.",
      instagramUrl: DANIELA50_SKY_BARTENDERS_INSTAGRAM,
      imageUrl: DANIELA50_SKY_BARTENDERS_PHOTO,
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
      title: "Bebidas para refrescar a tarde",
      items: ["Coca-Cola", "Guaraná", "Água aromatizada", "Chopp Kremer", "Drinks Sky Bartenders", "Café"],
    },
    {
      title: "Bolo e doces finos",
      items: ["Bolo", "Doces finos", "Petit fours"],
    },
  ],
  buffetName: "J_M Festas",
  buffetInstagramUrl: "",
  drinksProviderName: "Chopp Kremer Campinas",
  drinksProviderInstagramUrl: "https://www.instagram.com/choppkremercampinas/",
  drinksPhotoUrl: DANIELA50_CHOPP_PHOTO,
  cakeInfo: "Bolo e doces finos para fechar a tarde com doçura.",
  locationPositivePoints: [
    "Espaço de chácara para um almoço leve, familiar e acolhedor.",
    "Horário diurno, das 12h30 às 17h30, ideal para celebrar com tranquilidade.",
    "Endereço com acesso direto pelo Google Maps para reduzir dúvidas dos convidados.",
  ],
  eventPositivePoints: [],
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
      imageUrl: String(record.imageUrl ?? record.image_url ?? "").trim() || undefined,
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
  const fallback =
    isDaniela50Event(event) || !event
      ? DANIELA50_EXTRAS
      : {
          ...DANIELA50_EXTRAS,
          hostPhotoUrl: "",
          hostPhotoGallery: [],
          venueGallery: [],
          menuGallery: [],
          attractions: [],
          menuSections: [],
          buffetName: "",
          buffetInstagramUrl: "",
          drinksProviderName: "",
          drinksProviderInstagramUrl: "",
          drinksPhotoUrl: "",
          cakeInfo: "",
          locationPositivePoints: [],
          eventPositivePoints: [],
        };

  const mapUrl = String(event?.map_url ?? "").trim() || fallback.mapUrl;
  const hostPhotoGallery = isDaniela50Event(event) ? fallback.hostPhotoGallery : asStringArray(event?.host_photo_gallery, fallback.hostPhotoGallery);
  const hostPhotoUrl = isDaniela50Event(event) ? fallback.hostPhotoUrl : String(event?.host_photo_url ?? "").trim() || hostPhotoGallery[0] || fallback.hostPhotoUrl;
  const venueGallery = isDaniela50Event(event) ? fallback.venueGallery : asStringArray(event?.event_gallery, fallback.venueGallery);

  const attractions = [...asAttractions(event?.attractions, fallback.attractions)];
  if (isDaniela50Event(event)) {
    const skyIndex = attractions.findIndex((item) => /sky\s*bartenders/i.test(item.title));
    const sky = DANIELA50_EXTRAS.attractions.find((item) => item.title === "Sky Bartenders")!;
    if (skyIndex < 0) attractions.push({ ...sky });
    else attractions[skyIndex] = { ...attractions[skyIndex], imageUrl: sky.imageUrl, instagramUrl: sky.instagramUrl };
  }
  return {
    mapUrl,
    venueInstagramUrl: String(event?.venue_instagram_url ?? "").trim() || fallback.venueInstagramUrl,
    hostPhotoUrl,
    hostPhotoGallery,
    venueGallery,
    menuGallery: asStringArray(event?.menu_gallery, fallback.menuGallery),
    attractions,
    menuSections: isDaniela50Event(event) ? fallback.menuSections : asMenuSections(event?.menu_sections, fallback.menuSections),
    buffetName: String(event?.buffet_name ?? "").trim() || fallback.buffetName,
    buffetInstagramUrl: String(event?.buffet_instagram_url ?? "").trim() || fallback.buffetInstagramUrl,
    drinksProviderName: String(event?.drinks_provider_name ?? "").trim() || fallback.drinksProviderName,
    drinksProviderInstagramUrl: String(event?.drinks_provider_instagram_url ?? "").trim() || fallback.drinksProviderInstagramUrl,
    drinksPhotoUrl: String(event?.drinks_photo_url ?? "").trim() || fallback.drinksPhotoUrl,
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

function normalizeRelation(label: string) {
  return label.trim().toLowerCase();
}

function genderedDearWord(label: string) {
  const relation = normalizeRelation(label);
  const masculineWords = ["filho", "pai", "irmão", "sobrinho", "neto", "primo", "afilhado", "genro", "cunhado", "tio", "padrasto", "marido", "noivo", "amigo"];
  return masculineWords.some((item) => relation.includes(item)) ? "querido" : "querida";
}

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function buildGuestGreetingLine(guest: Record<string, unknown>) {
  const firstName = String(guest.full_name ?? "").trim().split(/\s+/)[0] || "você";
  const label = String(guest.relationship_label ?? "").trim();
  if (!label) return `Oi, ${firstName}!`;
  return `Oi, ${firstName}! ${capitalize(label)} ${genderedDearWord(label)}!`;
}

export function buildHostReferenceLine(guest: Record<string, unknown>, event?: Partial<PresencaEvent>) {
  const label = normalizeRelation(String(guest.relationship_label ?? ""));
  const hostName = String(event?.host_name ?? "Daniela").trim() || "Daniela";

  const byRelation: Array<[string, string]> = [
    ["filha", "Sua mãe"],
    ["filho", "Sua mãe"],
    ["neta", "Sua avó"],
    ["neto", "Sua avó"],
    ["irmã", "Sua irmã"],
    ["irmão", "Sua irmã"],
    ["prima", "Sua prima"],
    ["primo", "Sua prima"],
    ["sobrinha", "Sua tia"],
    ["sobrinho", "Sua tia"],
    ["afilhada", "Sua madrinha"],
    ["afilhado", "Sua madrinha"],
    ["cunhada", "Sua cunhada"],
    ["cunhado", "Sua cunhada"],
    ["nora", "Sua sogra"],
    ["genro", "Sua sogra"],
    ["amiga", `A ${hostName}`],
    ["amigo", `A ${hostName}`],
  ];

  const matched = byRelation.find(([needle]) => label.includes(needle));
  if (matched) return `${matched[1]} vai comemorar 50 anos e faz questão de te convidar com carinho por fazer parte dessa trajetória e dessa história.`;
  return `${hostName} vai comemorar 50 anos e faz questão de te convidar com carinho por fazer parte dessa trajetória e dessa história.`;
}

export function buildRelationshipInviteLine(guest: Record<string, unknown>) {
  const label = String(guest.relationship_label ?? "").trim();
  const context = String(guest.relationship_context ?? "").trim();
  const group = String(guest.group_name ?? "").trim();

  if (label && context) {
    return `Você faz parte dessa história como ${label.toLowerCase()} da Dani e também por ${context.toLowerCase()}.`;
  }

  if (label) return `Você faz parte dessa história como ${label.toLowerCase()} da Dani.`;
  if (context) return `Você faz parte dessa história por ${context.toLowerCase()}.`;
  if (group) return `Você faz parte do grupo ${group}, um círculo muito querido da Dani.`;
  return "Você faz parte da história da Dani e é uma presença muito querida nessa celebração.";
}

export function formatDaniela50Deadline() {
  return new Date(`${DANIELA50_CONFIRMATION_DEADLINE}T12:00:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function buildDaniela50EarlyInviteReason() {
  return "Mesmo faltando alguns meses, dezembro costuma encher rápido de festas, confraternizações e compromissos de fim de ano. Por isso o convite está chegando agora: para você já reservar a data e para conseguirmos organizar buffet, bebidas, mesas e recepção com calma, sem transformar confirmação em cobrança.";
}

export function buildPublicConfirmationUrl(input: { baseUrl: string; event: { slug?: string | null }; token: string }) {
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const slug = String(input.event.slug ?? DANIELA50_FALLBACK_EVENT.slug ?? "daniela-50-anos").trim() || "daniela-50-anos";
  return `${baseUrl}/solucoes/presenca-querida/evento/${encodeURIComponent(slug)}?convite=${encodeURIComponent(input.token)}`;
}

export function buildDaniela50HostSignature(event?: Partial<PresencaEvent>) {
  if (isDaniela50Event(event)) return "Daniela Mattano da Silva";
  return String(event?.host_name ?? "").trim() || "Família anfitriã";
}

export function buildPersonalizedInvitationMessage(input: {
  guest: Record<string, unknown>;
  event: Partial<PresencaEvent>;
  confirmationUrl: string;
}) {
  const firstName = String(input.guest.full_name ?? "").trim().split(/\s+/)[0] || "você";
  const deadline = formatDaniela50Deadline();

  return [
    `Oi, ${firstName}!`,
    "",
    "Vou comemorar meus 50 anos e faço questão de te convidar.",
    "",
    buildDaniela50EarlyInviteReason(),
    "",
    `O prazo ideal para confirmar é até ${deadline}. No link abaixo estão os detalhes da festa. Depois de conhecer tudo, ao final da página estão os botões para responder:`,
    "",
    input.confirmationUrl,
    "",
    "Novidade: ao confirmar, você também pode deixar uma curiosidade ou um recado carinhoso para a Dani. Depois da aprovação da família, alguns recados poderão aparecer na seção ‘Recados para a Dani’ na página da festa.",
    "",
    buildDaniela50HostSignature(input.event),
  ].join("\n");
}


export type Daniela50ReminderAudience = "confirmado" | "talvez" | "pendente";
export type Daniela50Campaign = "final-rsvp" | "confirmed-week" | "confirmed-eve" | "thank-you";

export const DANIELA50_CAMPAIGNS: Record<Daniela50Campaign, { date: string; label: string; phase: string }> = {
  "final-rsvp": { date: "2026-12-01", label: "Última confirmação", phase: "prazo_final" },
  "confirmed-week": { date: "2026-12-12", label: "Lembrete de uma semana", phase: "lembrete_confirmados" },
  "confirmed-eve": { date: "2026-12-18", label: "Lembrete da véspera", phase: "orientacao_final" },
  "thank-you": { date: "2026-12-21", label: "Agradecimento pós-festa", phase: "agradecimento" },
};

export function daniela50CampaignLabel(campaign: Daniela50Campaign) {
  return `Daniela 50 · ${DANIELA50_CAMPAIGNS[campaign].date} · ${DANIELA50_CAMPAIGNS[campaign].label}`;
}

export function buildDaniela50ReminderMessage(input: {
  guest: Record<string, unknown>;
  event: Partial<PresencaEvent>;
  confirmationUrl: string;
  audience: Daniela50ReminderAudience;
  campaign: Daniela50Campaign;
  pendingNames?: string[];
  confirmedNames?: string[];
  mixed?: boolean;
  photosReady?: boolean;
  notesReady?: boolean;
}) {
  const name = String(input.guest.full_name ?? "").trim().split(/\s+/)[0] || "você";
  const signature = buildDaniela50HostSignature(input.event);
  const details = "📅 19/12/2026 — sábado\n⏰ 12h30 às 17h30\n📍 Chácara Piloto — Valinhos, SP";
  const lines = [`Oi, ${name}! 💗`];
  if (input.campaign === "final-rsvp") {
    lines.push("Meus 50 anos estão chegando e estamos na reta final dos preparativos. Sei que dezembro é cheio de compromissos, mas ficarei muito feliz se ainda pudermos compartilhar essa tarde.");
    if (input.mixed && input.pendingNames?.length) lines.push(`Ainda falta definir a presença de: ${input.pendingNames.join(", ")}. As demais respostas já registradas continuam valendo.`);
    else lines.push("Antes de fechar os últimos detalhes, gostaria de saber se ainda existe a possibilidade de você estar comigo nesse dia.");
    lines.push("Se não puder comparecer, tudo bem! Me avise pelo seu convite, por favor. Assim consigo organizar tudo com carinho para receber cada pessoa.");
  } else if (input.campaign === "confirmed-week") {
    lines.push("Está chegando o dia de celebrar meus 50 anos! Quero que essa tarde seja uma oportunidade de reencontrar pessoas queridas, dar boas risadas e criar novas lembranças.");
    lines.push("Teremos samba, DJ, chopp e drinks da Sky Bartenders. Estou preparando tudo com muito carinho!");
  } else if (input.campaign === "confirmed-eve") {
    lines.push("É amanhã! Depois de tantos preparativos, chegou a hora de celebrar, reencontrar pessoas queridas e criar novas lembranças.");
    lines.push(input.mixed ? "Espero as pessoas confirmadas a partir das 12h30!" : "Espero você a partir das 12h30!");
  } else {
    lines.push("Obrigada por fazer parte dessa celebração! Foi muito especial compartilhar esse momento com pessoas que fazem parte da minha história.");
  }
  if (input.mixed && input.campaign !== "final-rsvp" && input.campaign !== "thank-you" && input.confirmedNames?.length) lines.push(`Presenças confirmadas neste convite: ${input.confirmedNames.join(", ")}.`);
  if (input.notesReady && input.campaign !== "thank-you") lines.push("No convite também há recados carinhosos que foram escolhidos para compartilhar.");
  if (input.photosReady) lines.push(input.campaign === "thank-you" ? "Se tiver fotos da festa, compartilhe pelo álbum de memórias no convite. Quero guardar também o seu olhar!" : "Teremos uma novidade: um álbum de memórias com as fotos feitas pelos convidados. Quero guardar essa história também através do seu olhar!");
  if (input.campaign !== "thank-you") {
    lines.push(details);
    lines.push(input.campaign === "final-rsvp" ? "Você pode registrar sua resposta diretamente pelo seu convite:" : "No seu convite estão o mapa, a programação e o cardápio. Se surgir algum imprevisto, me avise, por favor:");
  }
  lines.push(input.confirmationUrl, "Com carinho,\n" + signature);
  return lines.join("\n\n");
}
