import Image from "next/image";
import Link from "next/link";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { formatBazarDate, getBazarEvent, LEGACY_BAZAR_EVENT_SLUG } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const CURRENT_POSTER_SRC = "/bazar-sementinha/cardapio-cantina-sementinha-2026-08-29.jpeg";
const LEGACY_POSTER_SRC = "/bazar-sementinha/cardapio-cozinha-bazar-sementinha-2026-07-04.jpg";
const LEGACY_VIDEO_SRC = "/bazar-sementinha/cardapio-bazar-sementinha-2026-07-04.mp4";

const categoryOrder = ["Tortas", "Salgados", "Bauru de Forno", "Doces", "Bebidas"];

type MenuItemRow = {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  unit_label?: string | null;
  price: number | string;
  sort_order?: number | null;
};

type MenuItemView = {
  id: string;
  category: string;
  name: string;
  description: string;
  unit_label: string;
  price: number;
  sort_order: number;
};

const fallbackMenuItems: MenuItemView[] = [
  { id: "fallback-torta", category: "Tortas", name: "Torta salgada", description: "Torta salgada.", unit_label: "pedaço", price: 10, sort_order: 10 },
  { id: "fallback-salgados", category: "Salgados", name: "Salgados assado/frito", description: "Salgados assados ou fritos.", unit_label: "unidade", price: 10, sort_order: 10 },
  { id: "fallback-pudim", category: "Doces", name: "Pudim", description: "Pudim.", unit_label: "pedaço", price: 10, sort_order: 10 },
  { id: "fallback-bolo", category: "Doces", name: "Bolo", description: "Bolo.", unit_label: "pedaço", price: 12, sort_order: 20 },
  { id: "fallback-morango", category: "Doces", name: "Morango com chocolate no palito", description: "Morango com chocolate no palito.", unit_label: "unidade", price: 12, sort_order: 30 },
  { id: "fallback-refrigerante", category: "Bebidas", name: "Refrigerante", description: "Refrigerante.", unit_label: "unidade", price: 7, sort_order: 10 },
  { id: "fallback-suco", category: "Bebidas", name: "Suco", description: "Suco.", unit_label: "copo", price: 6, sort_order: 20 },
  { id: "fallback-agua", category: "Bebidas", name: "Água com e sem gás", description: "Água com ou sem gás.", unit_label: "unidade", price: 5, sort_order: 30 },
];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryPhoto(category: string) {
  const slug = slugify(category);
  if (slug === "bauru-de-forno") return "/bazar-sementinha/foto-bauru-de-forno.jpg";
  if (slug === "bebidas") return "/bazar-sementinha/foto-bebidas.jpg";
  if (slug === "doces") return "/bazar-sementinha/foto-doces.jpg";
  if (slug === "salgados") return "/bazar-sementinha/foto-salgados.jpg";
  return "/bazar-sementinha/foto-tortas.jpg";
}

async function getMenuItems(eventId: string): Promise<MenuItemView[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("bazar_menu_items")
      .select("id, category, name, description, unit_label, price, sort_order")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const items = ((data || []) as MenuItemRow[]).map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || `${item.name}.`,
      unit_label: item.unit_label || "unidade",
      price: Number(item.price || 0),
      sort_order: Number(item.sort_order || 50),
    }));

    return items.length > 0 ? items : fallbackMenuItems;
  } catch {
    return fallbackMenuItems;
  }
}

type CardapioBazarSementinhaPageProps = {
  searchParams?: Promise<{ cliente?: string }>;
};

export default async function CardapioBazarSementinhaPage({ searchParams }: CardapioBazarSementinhaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const publicContextToken = typeof resolvedSearchParams.cliente === "string" ? resolvedSearchParams.cliente : "";
  const publicContextSuffix = publicContextToken ? `?cliente=${encodeURIComponent(publicContextToken)}` : "";
  const pedidoHref = `/bazar-sementinha/pedidos${publicContextSuffix}`;

  const event = await getBazarEvent();
  const eventDate = formatBazarDate(event.event_date);
  const isCurrentPosterEvent = event.event_date?.slice(0, 10) === "2026-08-29";
  const showLegacyMedia = event.slug === LEGACY_BAZAR_EVENT_SLUG;
  const posterSrc = isCurrentPosterEvent ? CURRENT_POSTER_SRC : showLegacyMedia ? LEGACY_POSTER_SRC : null;

  const menuItems = await getMenuItems(event.id);
  const categories = [
    ...categoryOrder.filter((category) => menuItems.some((item) => item.category === category)),
    ...Array.from(new Set(menuItems.map((item) => item.category))).filter((category) => !categoryOrder.includes(category)),
  ];
  const groupedItems = categories.map((category) => ({
    category,
    items: menuItems
      .filter((item) => item.category === category)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR")),
  }));

  return (
    <>
      <BazarHeader active="cardapio" publicView={Boolean(publicContextToken)} publicContextToken={publicContextToken} />

      <main className="min-h-screen overflow-x-hidden bg-[#f5f0df] text-[#24451f]">
        <section className="relative overflow-hidden px-3 py-5 sm:px-5 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(circle at 8% 4%, rgba(96,126,42,.22), transparent 22%), radial-gradient(circle at 92% 7%, rgba(183,151,51,.22), transparent 24%), linear-gradient(180deg,#fff8df 0%,#f4eed8 100%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-5xl">
            <div className="mb-4 text-center sm:mb-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#779035] sm:text-sm">
                Bazar do Sementinha · {eventDate}
              </p>
              <h1 className="mt-2 text-2xl font-black sm:text-4xl">Cardápio da Cantina do Sementinha</h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#53644b] sm:text-base">
                Escolha com calma, faça seu pedido e ajude o Sementinha.
              </p>
            </div>

            {posterSrc ? (
              <figure className="mx-auto max-w-[760px] overflow-hidden rounded-[2rem] border border-[#aab977]/60 bg-[#fffaf0] p-1.5 shadow-[0_22px_55px_rgba(61,78,33,0.18)] sm:p-2">
                <Image
                  src={posterSrc}
                  alt={`Cardápio da Cantina do Sementinha - ${eventDate}`}
                  width={1024}
                  height={1536}
                  priority
                  sizes="(max-width: 768px) 96vw, 760px"
                  className="h-auto w-full rounded-[1.6rem]"
                />
              </figure>
            ) : (
              <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#d6dec5] bg-[#fffaf0] p-6 text-center shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#779035]">Cardápio do evento</p>
                <h2 className="mt-2 text-2xl font-black">{event.name}</h2>
                <p className="mt-3 text-[#60705a]">Os itens cadastrados para este evento estão disponíveis logo abaixo.</p>
              </div>
            )}

            <div className="mx-auto mt-5 flex max-w-[760px] flex-col gap-3 sm:mt-6 sm:flex-row sm:justify-center">
              <Link
                href={pedidoHref}
                className="rounded-full bg-[#527c28] px-6 py-3.5 text-center text-sm font-black uppercase tracking-[0.1em] text-white shadow-md transition hover:bg-[#416b1f]"
              >
                Fazer pedido
              </Link>
              <a
                href="#cardapio-operacional"
                className="rounded-full border border-[#7f9946]/35 bg-[#fffaf0] px-6 py-3.5 text-center text-sm font-black uppercase tracking-[0.1em] text-[#395d26] shadow-sm"
              >
                Ver itens em texto
              </a>
            </div>

            <div className="mx-auto mt-5 max-w-[760px] rounded-2xl border border-[#d6dec5] bg-[#fffaf0]/90 px-4 py-3 text-center text-sm leading-6 text-[#596b50] shadow-sm">
              Toda renda da cantina é revertida para as ações sociais do Sementinha.
              <strong className="ml-1 text-[#3f6427]">Ao escolher, você ajuda.</strong>
            </div>
          </div>
        </section>

        <section id="cardapio-operacional" className="scroll-mt-44 border-t border-[#d6dec5] bg-[#fffdf7] px-3 py-8 sm:px-5 sm:py-12">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7d963c] sm:text-sm">Itens cadastrados no sistema</p>
              <h2 className="mt-2 text-2xl font-black sm:text-4xl">Cardápio em texto</h2>
              <p className="mt-3 text-sm leading-6 text-[#60705a] sm:text-base">
                Esta lista é carregada da Gestão do evento e é a referência operacional usada em Pedidos.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#${slugify(category)}`}
                  className="rounded-full border border-[#7f9946]/25 bg-[#f4efd8] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#3f6427]"
                >
                  {category}
                </a>
              ))}
            </div>

            <div className="mt-7 space-y-6">
              {groupedItems.map((group) => (
                <section
                  key={group.category}
                  id={slugify(group.category)}
                  className="scroll-mt-44 overflow-hidden rounded-[2rem] border border-[#d7dfca] bg-white shadow-sm"
                >
                  <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="relative min-h-44 bg-[#eef1df] lg:min-h-full">
                      <Image
                        src={categoryPhoto(group.category)}
                        alt={`Foto ilustrativa de ${group.category}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 220px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#173d1d]/55 via-transparent to-transparent" />
                      <h3 className="absolute bottom-4 left-4 right-4 text-2xl font-black text-white">{group.category}</h3>
                    </div>

                    <div className="divide-y divide-[#edf0e6]">
                      {group.items.map((item) => (
                        <article key={item.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5">
                          <div className="min-w-0">
                            <h4 className="text-lg font-black leading-tight text-[#24451f] sm:text-xl">{item.name}</h4>
                            {item.description && item.description !== `${item.name}.` ? (
                              <p className="mt-1 text-sm leading-5 text-[#65735f]">{item.description}</p>
                            ) : null}
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#8a936f]">{item.unit_label}</p>
                          </div>
                          <strong className="w-fit rounded-xl bg-[#678b2e] px-4 py-2 text-xl font-black text-white shadow-sm sm:text-2xl">
                            {formatBRL(item.price)}
                          </strong>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href={pedidoHref}
                className="inline-flex rounded-full bg-[#527c28] px-7 py-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-md transition hover:bg-[#416b1f]"
              >
                Fazer pedido
              </Link>
            </div>
          </div>
        </section>

        {showLegacyMedia ? (
          <section className="border-t border-[#d6dec5] bg-[#f5f0df] px-3 py-8 sm:px-5">
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d7dfca] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-black">Material histórico do bazar de 04/07/2026</h2>
              <video className="mt-4 w-full rounded-[1.5rem] bg-black" controls loop muted playsInline poster={LEGACY_POSTER_SRC}>
                <source src={LEGACY_VIDEO_SRC} type="video/mp4" />
                Seu navegador não suporta a reprodução de vídeo.
              </video>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
