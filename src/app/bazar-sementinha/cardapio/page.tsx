import Image from "next/image";
import Link from "next/link";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { getBazarEvent } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const POSTER_SRC = "/bazar-sementinha/cardapio-cozinha-bazar-sementinha-2026-07-04.jpg";
const VIDEO_SRC = "/bazar-sementinha/cardapio-bazar-sementinha-2026-07-04.mp4";

const categoryOrder = ["Tortas", "Salgados", "Bauru de Forno", "Doces", "Bebidas"];

const fallbackMenuItems: MenuItemView[] = [
  { id: "fallback-torta-palmito", category: "Tortas", name: "Torta de palmito", description: "Torta de palmito.", unit_label: "pedaço", price: 12, sort_order: 10 },
  { id: "fallback-torta-frango", category: "Tortas", name: "Torta de frango", description: "Torta de frango.", unit_label: "pedaço", price: 12, sort_order: 20 },
  { id: "fallback-croquete", category: "Salgados", name: "Croquete", description: "Croquete.", unit_label: "unidade", price: 10, sort_order: 10 },
  { id: "fallback-kibe", category: "Salgados", name: "Kibe", description: "Kibe.", unit_label: "unidade", price: 10, sort_order: 20 },
  { id: "fallback-presunto-queijo", category: "Salgados", name: "Presunto e queijo", description: "Salgado de presunto e queijo.", unit_label: "unidade", price: 10, sort_order: 30 },
  { id: "fallback-salsicha", category: "Salgados", name: "Salsicha", description: "Salgado de salsicha.", unit_label: "unidade", price: 10, sort_order: 40 },
  { id: "fallback-bolinho-carne", category: "Salgados", name: "Bolinho de carne", description: "Bolinho de carne.", unit_label: "unidade", price: 10, sort_order: 50 },
  { id: "fallback-bauru", category: "Bauru de Forno", name: "Bauru de forno", description: "Massa fina, presunto, queijo e tomate.", unit_label: "pedaço", price: 12, sort_order: 10 },
  { id: "fallback-bolo-ninho", category: "Doces", name: "Bolo branco com Ninho", description: "Bolo branco com Ninho.", unit_label: "pedaço", price: 12, sort_order: 10 },
  { id: "fallback-bolo-chocolate", category: "Doces", name: "Bolo de chocolate recheado", description: "Bolo de chocolate recheado.", unit_label: "pedaço", price: 12, sort_order: 20 },
  { id: "fallback-pudim", category: "Doces", name: "Pudim leite condensado", description: "Pudim de leite condensado.", unit_label: "pedaço", price: 12, sort_order: 30 },
  { id: "fallback-bolo-milho", category: "Doces", name: "Bolo de milho cremoso", description: "Bolo de milho cremoso.", unit_label: "pedaço", price: 8, sort_order: 40 },
  { id: "fallback-mousse", category: "Doces", name: "Mousse de paçoca", description: "Mousse de paçoca.", unit_label: "unidade", price: 8, sort_order: 50 },
  { id: "fallback-espeto", category: "Doces", name: "Espeto de morango c/ chocolate", description: "Espeto de morango com chocolate.", unit_label: "unidade", price: 8, sort_order: 60 },
  { id: "fallback-agua-com-gas", category: "Bebidas", name: "Água com gás", description: "Água com gás.", unit_label: "unidade", price: 5, sort_order: 10 },
  { id: "fallback-agua-sem-gas", category: "Bebidas", name: "Água sem gás", description: "Água sem gás.", unit_label: "unidade", price: 5, sort_order: 20 },
  { id: "fallback-refrigerante", category: "Bebidas", name: "Refrigerante", description: "Refrigerante.", unit_label: "unidade", price: 7, sort_order: 30 },
  { id: "fallback-suco", category: "Bebidas", name: "Suco", description: "Suco.", unit_label: "copo", price: 6, sort_order: 40 },
  { id: "fallback-quentao", category: "Bebidas", name: "Quentão", description: "Quentão.", unit_label: "copo", price: 8, sort_order: 50 },
  { id: "fallback-cappuccino", category: "Bebidas", name: "Cappuccino", description: "Cappuccino.", unit_label: "copo", price: 6, sort_order: 60 },
];

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

function categoryTitle(category: string) {
  if (category === "Bebidas") return "Bebidas para acompanhar o bazar";
  if (category === "Doces") return "Doces preparados com carinho";
  if (category === "Salgados") return "Salgados para comer no evento";
  if (category === "Bauru de Forno") return "Bauru de forno com massa fina";
  return "Tortas do Bazar Sementinha";
}

function categoryIntro(category: string) {
  if (category === "Bebidas") return "Água, refrigerante, suco, quentão e cappuccino para escolher antes de chamar a equipe.";
  if (category === "Doces") return "Bolos, pudim, mousse e espeto de morango para fechar o pedido com sabor de comunidade.";
  if (category === "Salgados") return "Opções práticas para registrar no sistema, pagar no caixa e retirar com mais organização.";
  if (category === "Bauru de Forno") return "Massa fina com presunto, queijo e tomate, separado para facilitar a escolha.";
  return "Tortas de palmito e frango no valor definido para o dia 04/07.";
}

async function getMenuItems(): Promise<MenuItemView[]> {
  try {
    const event = await getBazarEvent();
    const { data, error } = await supabaseAdmin
      .from("bazar_menu_items")
      .select("id, category, name, description, unit_label, price, sort_order")
      .eq("event_id", event.id)
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

export default async function CardapioBazarSementinhaPage() {
  const menuItems = await getMenuItems();
  const categories = categoryOrder.filter((category) => menuItems.some((item) => item.category === category));
  const groupedItems = categories.map((category) => ({
    category,
    items: menuItems
      .filter((item) => item.category === category)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));

  return (
    <>
      <BazarHeader active="cardapio" />
      <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] text-[15px] text-[#214527] sm:text-base">
        <section className="border-b border-[#dfe8df] px-3 py-8 sm:px-4 sm:py-14">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_0.86fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.2em]">Cardápio público · Bazar do Sementinha · 04/07</p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-6xl">Cozinha do Bazar Sementinha</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#31543a] sm:mt-5 sm:text-lg sm:leading-8">
                Veja fotos, vídeo e valores antes de chamar a equipe. No dia do bazar, o pedido é registrado no sistema, o pagamento passa pelo caixa e você pode acompanhar todos os seus pedidos pelo QRCode do cliente.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/bazar-sementinha/pedidos" className="rounded-full bg-[#2f7d45] px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-white shadow-sm sm:px-6 sm:text-sm sm:tracking-[0.12em]">
                  Chamar equipe para pedido
                </Link>
                <a href="#itens-cardapio" className="rounded-full border border-[#2f7d45]/20 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#2f7d45] shadow-sm sm:px-6 sm:text-sm sm:tracking-[0.12em]">
                  Ver itens e valores
                </a>
              </div>
            </div>
            <aside className="min-w-0 rounded-[2rem] border border-[#dfe8df] bg-white p-3 shadow-sm sm:p-4">
              <Image src={POSTER_SRC} alt="Cardápio Cozinha do Bazar Sementinha 04/07" width={900} height={1600} priority className="mx-auto max-h-[620px] max-w-full rounded-[1.5rem] object-contain sm:max-h-[680px]" />
            </aside>
          </div>
        </section>

        <section className="px-3 py-8 sm:px-4 sm:py-10">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 sm:gap-5 md:grid-cols-3">
            <article className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black sm:text-xl">Escolha sem pressa</h2>
              <p className="mt-3 leading-7 text-[#496451]">Veja preços e opções antes de pedir para evitar dúvidas na fila.</p>
            </article>
            <article className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black sm:text-xl">Cliente com QRCode</h2>
              <p className="mt-3 leading-7 text-[#496451]">Após a criação, o cliente pode abrir o QRCode e acompanhar todos os seus pedidos, totais e status.</p>
            </article>
            <article className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black sm:text-xl">Caixa organizado</h2>
              <p className="mt-3 leading-7 text-[#496451]">A equipe registra, o caixa confere e a prestação de contas fica mais clara.</p>
            </article>
          </div>
        </section>

        <section className="border-y border-[#dfe8df] bg-white px-3 py-8 sm:px-4 sm:py-10">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 sm:gap-8 lg:grid-cols-[0.9fr_minmax(0,1.1fr)] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.2em]">Vídeo simples para TV e divulgação</p>
              <h2 className="mt-3 text-2xl font-black sm:text-4xl">Cardápio em vídeo para rodar no evento</h2>
              <p className="mt-4 leading-7 text-[#496451] sm:leading-8">
                O MP4 fica disponível nesta página para assistir, baixar e rodar em loop no notebook, pendrive ou TV do bazar. Ele mostra as categorias separadamente, com todos os itens e valores, seguindo a mesma ideia usada no cardápio da Festa Junina.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={VIDEO_SRC} download className="rounded-full bg-[#f4e7b3] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#214527] shadow-sm">
                  Baixar vídeo MP4
                </a>
                <a href={POSTER_SRC} download className="rounded-full border border-[#dfe8df] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#214527] shadow-sm">
                  Baixar arte do cardápio
                </a>
              </div>
            </div>
            <video className="w-full rounded-[2rem] border border-[#dfe8df] bg-black shadow-sm" controls loop muted playsInline poster={POSTER_SRC}>
              <source src={VIDEO_SRC} type="video/mp4" />
              Seu navegador não suporta a reprodução de vídeo.
            </video>
          </div>
        </section>

        <section id="itens-cardapio" className="px-3 py-8 sm:px-4 sm:py-14">
          <div className="mx-auto w-full max-w-6xl min-w-0">
            <div className="flex max-w-full flex-wrap gap-2 pb-2">
              <a href="#todos" className="rounded-full bg-[#006b35] px-4 py-2.5 text-[13px] font-black text-white sm:px-5 sm:py-3 sm:text-sm">Todos</a>
              {categories.map((category) => (
                <a key={category} href={`#${slugify(category)}`} className="rounded-full bg-white px-4 py-2.5 text-[13px] font-black text-[#214527] shadow-sm ring-1 ring-[#dfe8df] sm:px-5 sm:py-3 sm:text-sm">
                  {category}
                </a>
              ))}
            </div>

            <div id="todos" className="mt-8 space-y-10">
              {groupedItems.map((group) => (
                <section key={group.category} id={slugify(group.category)} className="min-w-0 scroll-mt-44 rounded-[2rem] border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-6">
                  <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                    <div className="overflow-hidden rounded-[1.5rem] bg-[#f9f7ef]">
                      <Image src={categoryPhoto(group.category)} alt={`Foto ilustrativa da categoria ${group.category}`} width={1200} height={675} className="h-52 w-full object-cover sm:h-64 lg:h-full" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">{group.category}</p>
                      <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{categoryTitle(group.category)}</h2>
                      <p className="mt-3 text-sm leading-6 text-[#496451] sm:text-base sm:leading-7">{categoryIntro(group.category)}</p>
                      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
                        {group.items.map((item) => (
                          <article key={item.id} className="min-w-0 rounded-3xl border border-[#dfe8df] bg-[#fffdf7] p-4 shadow-sm sm:p-5">
                            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#83a847] ring-1 ring-[#dfe8df]">Foto ilustrativa</span>
                            <h3 className="mt-4 text-lg font-black leading-tight sm:text-xl">{item.name}</h3>
                            <p className="mt-2 min-h-10 text-sm leading-6 text-[#496451]">{item.description}</p>
                            <strong className="mt-4 block text-2xl text-[#0f6b35] sm:text-3xl">{formatBRL(item.price)}</strong>
                            <p className="mt-2 text-sm font-bold text-[#7a8278]">Pronto para retirada · {item.unit_label}</p>
                            <p className="mt-4 text-xs text-[#7a8278]">Fotos meramente ilustrativas.</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
