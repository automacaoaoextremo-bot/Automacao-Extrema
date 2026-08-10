"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Item = {
  id: string;
  name: string;
  slug: string;
  package_size: number;
  package_unit: string;
  package_label: string;
  is_basket_item: boolean;
  active: boolean;
  sort_order: number;
  notes: string | null;
};

type Batch = {
  id: string;
  item_id: string;
  batch_code: string;
  quantity_initial: number;
  quantity_available: number;
  received_at: string;
  expires_at: string | null;
  source: string | null;
  notes: string | null;
  demo_data: boolean;
  daysUntilExpiry: number | null;
  item: Item | null;
};

type BasketComposition = {
  id: string;
  item_id: string;
  quantity_required: number;
  sort_order: number;
  item: Item | null;
};

type Movement = {
  id: string;
  item_id: string;
  batch_id: string | null;
  movement_type: string;
  quantity_delta: number;
  occurred_at: string;
  notes: string | null;
  demo_data: boolean;
  item: Item | null;
  batch: Batch | null;
};

type Delivery = {
  id: string;
  basket_count: number;
  delivered_at: string;
  destination: string | null;
  notes: string | null;
  demo_data: boolean;
  created_at: string;
};

type Coverage = {
  itemId: string;
  itemName: string;
  required: number;
  available: number;
  baskets: number;
};

type Expiring = {
  id: string;
  itemId: string;
  itemName: string;
  batchCode: string;
  quantity: number;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  packageLabel: string;
  demoData: boolean;
};

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
};

type TeamMember = {
  id: string;
  person_id: string;
  access_role: "gestor" | "consulta";
  active: boolean;
  person: Person | null;
};

type SnapshotItem = {
  itemId: string;
  itemName: string;
  packageLabel: string;
  quantity: number;
};

type Payload = {
  currentUser: {
    personId: string;
    personName: string;
    accessRole: "gestor" | "consulta";
    isClientAdmin: boolean;
  };
  template: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    notes: string | null;
  } | null;
  items: Item[];
  batches: Batch[];
  basketComposition: BasketComposition[];
  movements: Movement[];
  deliveries: Delivery[];
  overview: {
    possibleBaskets: number;
    basketCoverage: Coverage[];
    bottlenecks: Coverage[];
    expiring: Expiring[];
    totalAvailablePackages: number;
    activeLots: number;
    demoDataPresent: boolean;
  };
  snapshot: SnapshotItem[] | null;
  snapshotDate: string | null;
  team: TeamMember[];
  people: Person[];
};

type Tab = "resumo" | "estoque" | "cestas" | "historico" | "equipe";

type FefoAllocation = {
  itemName: string;
  batchCode: string;
  expiresAt: string | null;
  quantity: number;
  packageLabel: string;
};

const PAGE_BASE =
  "/solucoes/organizacao-em-harmonia/tucxa/sementinha/despensa-viva";

const headerActions = [
  {
    label: "Início",
    href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha",
    variant: "secondary" as const,
  },
  {
    label: "Despensa Viva",
    href: PAGE_BASE,
    variant: "primary" as const,
  },
  {
    label: "Tucxa",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const tabLabels: Array<{ id: Tab; label: string }> = [
  { id: "resumo", label: "Resumo" },
  { id: "estoque", label: "Estoque" },
  { id: "cestas", label: "Cestas" },
  { id: "historico", label: "Histórico" },
  { id: "equipe", label: "Equipe" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem validade";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(value);
}

function packageCountLabel(value: number) {
  const rounded = Math.abs(value - Math.round(value)) < 0.0001;
  return rounded ? String(Math.round(value)) : numberLabel(value);
}

function quantityDescription(item: Item | null, quantity: number) {
  if (!item) return packageCountLabel(quantity);

  const packageCount = packageCountLabel(quantity);
  const equivalent = quantity * Number(item.package_size || 1);

  if (item.package_unit === "kg") {
    return `${packageCount} pacote(s) · ${numberLabel(equivalent)} kg`;
  }

  if (item.package_unit === "pct") {
    return `${packageCount} pacote(s)`;
  }

  if (item.package_unit === "litro") {
    return `${packageCount} embalagem(ns) · ${numberLabel(equivalent)} L`;
  }

  return `${packageCount} unidade(s)`;
}

function movementLabel(type: string) {
  const labels: Record<string, string> = {
    entrada: "Entrada",
    saida_cesta: "Saída por cesta",
    saida: "Saída",
    ajuste: "Ajuste",
    perda: "Perda",
    vencimento: "Vencimento",
  };
  return labels[type] ?? type;
}

function expiryTone(days: number | null) {
  if (days === null) return "bg-slate-100 text-slate-600";
  if (days < 0) return "bg-red-100 text-red-800";
  if (days <= 15) return "bg-red-100 text-red-800";
  if (days <= 30) return "bg-amber-100 text-amber-800";
  if (days <= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-emerald-100 text-emerald-800";
}

function expiryText(days: number | null) {
  if (days === null) return "Sem validade";
  if (days < 0) return `Vencido há ${Math.abs(days)} dia(s)`;
  if (days === 0) return "Vence hoje";
  return `Vence em ${days} dia(s)`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const raw = String(value ?? "");
    return `"${raw.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((row) => row.map(escape).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DespensaVivaPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [authState, setAuthState] = useState<
    "loading" | "signed-out" | "forbidden" | "ready"
  >("loading");
  const [tab, setTab] = useState<Tab>("resumo");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newBatchItemId, setNewBatchItemId] = useState("");
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  const [snapshotDate, setSnapshotDate] = useState(todayIso());

  const [itemForm, setItemForm] = useState({
    name: "",
    packageSize: "1",
    packageUnit: "unidade",
    packageLabel: "",
    basketQuantity: "0",
    notes: "",
  });

  const [batchForm, setBatchForm] = useState({
    batchCode: "",
    quantity: "",
    receivedAt: todayIso(),
    expiresAt: "",
    source: "",
    notes: "",
  });

  const [deliveryForm, setDeliveryForm] = useState({
    basketCount: "1",
    deliveredAt: todayIso(),
    destination: "",
    notes: "",
  });

  const [teamPersonId, setTeamPersonId] = useState("");
  const [teamRole, setTeamRole] = useState<"gestor" | "consulta">("consulta");

  const load = useCallback(
    async (token: string, asOf = "") => {
      const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
      const response = await fetch(
        `/api/organizacao-em-harmonia/sementinha/despensa${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      const data = (await response.json().catch(() => ({}))) as
        | Payload
        | { error?: string };

      if (response.status === 401) {
        setAuthState("signed-out");
        return;
      }

      if (response.status === 403) {
        setError(
          "error" in data && data.error
            ? data.error
            : "Seu acesso à Despensa Viva ainda não foi liberado.",
        );
        setAuthState("forbidden");
        return;
      }

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Não foi possível carregar a Despensa Viva.",
        );
      }

      setPayload(data as Payload);
      setAuthState("ready");
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      const token = data.session?.access_token ?? "";
      if (!token) {
        setAuthState("signed-out");
        return;
      }

      setAccessToken(token);

      try {
        await load(token);
      } catch (reason) {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar a Despensa Viva.",
        );
        setAuthState("forbidden");
      }
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        const token = session?.access_token ?? "";
        setAccessToken(token);
        if (!token) setAuthState("signed-out");
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [load]);

  const items = useMemo(() => payload?.items ?? [], [payload?.items]);
  const batches = useMemo(() => payload?.batches ?? [], [payload?.batches]);
  const composition = useMemo(
    () => payload?.basketComposition ?? [],
    [payload?.basketComposition],
  );

  const batchesByItem = useMemo(() => {
    const map = new Map<string, Batch[]>();

    for (const batch of batches) {
      const current = map.get(batch.item_id) ?? [];
      current.push(batch);
      map.set(batch.item_id, current);
    }

    for (const rows of map.values()) {
      rows.sort((a, b) => {
        const aDate = a.expires_at ?? "9999-12-31";
        const bDate = b.expires_at ?? "9999-12-31";
        return aDate.localeCompare(bDate) || a.received_at.localeCompare(b.received_at);
      });
    }

    return map;
  }, [batches]);

  const deliveryCount = Math.max(
    1,
    Math.floor(Number(deliveryForm.basketCount) || 1),
  );

  const fefoPlan = useMemo(() => {
    const plan: FefoAllocation[] = [];

    for (const row of composition) {
      if (!row.item) continue;

      let remaining = row.quantity_required * deliveryCount;
      const candidateBatches = batchesByItem.get(row.item_id) ?? [];

      for (const batch of candidateBatches) {
        if (remaining <= 0) break;
        if (batch.quantity_available <= 0) continue;

        const take = Math.min(remaining, batch.quantity_available);
        plan.push({
          itemName: row.item.name,
          batchCode: batch.batch_code,
          expiresAt: batch.expires_at,
          quantity: take,
          packageLabel: row.item.package_label,
        });
        remaining -= take;
      }

      if (remaining > 0) {
        plan.push({
          itemName: row.item.name,
          batchCode: "ESTOQUE INSUFICIENTE",
          expiresAt: null,
          quantity: -remaining,
          packageLabel: row.item.package_label,
        });
      }
    }

    return plan;
  }, [batchesByItem, composition, deliveryCount]);

  const canManage = payload?.currentUser.accessRole === "gestor";

  async function post(body: Record<string, unknown>) {
    if (!accessToken) throw new Error("Sessão não encontrada.");

    const response = await fetch(
      "/api/organizacao-em-harmonia/sementinha/despensa",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Não foi possível concluir a operação.");
    }

    return result;
  }

  async function refresh(asOf = "") {
    if (!accessToken) return;
    await load(accessToken, asOf);
  }

  async function handleCreateItem(event: FormEvent) {
    event.preventDefault();
    setBusy("item");
    setMessage("");
    setError("");

    try {
      const result = await post({
        action: "createItem",
        ...itemForm,
        packageSize: Number(itemForm.packageSize),
        basketQuantity: Number(itemForm.basketQuantity),
      });

      setMessage(result.message || "Alimento cadastrado.");
      setItemForm({
        name: "",
        packageSize: "1",
        packageUnit: "unidade",
        packageLabel: "",
        basketQuantity: "0",
        notes: "",
      });
      setNewItemOpen(false);
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao cadastrar alimento.",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleReceiveStock(event: FormEvent) {
    event.preventDefault();
    if (!newBatchItemId) return;

    setBusy("batch");
    setMessage("");
    setError("");

    try {
      const result = await post({
        action: "receiveStock",
        itemId: newBatchItemId,
        quantity: Number(batchForm.quantity),
        batchCode: batchForm.batchCode,
        receivedAt: batchForm.receivedAt,
        expiresAt: batchForm.expiresAt,
        source: batchForm.source,
        notes: batchForm.notes,
      });

      setMessage(result.message || "Lote incluído.");
      setBatchForm({
        batchCode: "",
        quantity: "",
        receivedAt: todayIso(),
        expiresAt: "",
        source: "",
        notes: "",
      });
      setNewBatchItemId("");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao incluir lote.");
    } finally {
      setBusy("");
    }
  }

  async function handleAdjustBatch(batch: Batch) {
    const answer = window.prompt(
      `Novo saldo do lote ${batch.batch_code}:`,
      String(batch.quantity_available),
    );
    if (answer === null) return;

    const newQuantity = Number(answer.replace(",", "."));
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    const notes =
      window.prompt(
        "Motivo do ajuste (ex.: conferência física, perda, correção):",
        "Conferência física do estoque",
      ) ?? "";

    setBusy(`adjust:${batch.id}`);
    setError("");
    setMessage("");

    try {
      const result = await post({
        action: "adjustBatch",
        batchId: batch.id,
        newQuantity,
        notes,
      });

      setMessage(result.message || "Lote ajustado.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao ajustar lote.");
    } finally {
      setBusy("");
    }
  }

  async function handleDeliver(event: FormEvent) {
    event.preventDefault();

    const count = Math.max(
      0,
      Math.floor(Number(deliveryForm.basketCount) || 0),
    );

    if (count <= 0) {
      setError("Informe a quantidade de cestas.");
      return;
    }

    if ((payload?.overview.possibleBaskets ?? 0) < count) {
      setError(
        `Hoje o estoque permite ${payload?.overview.possibleBaskets ?? 0} cesta(s).`,
      );
      return;
    }

    if (
      !window.confirm(
        `Confirmar a entrega de ${count} cesta(s)? A baixa usará primeiro os lotes que vencem antes.`,
      )
    ) {
      return;
    }

    setBusy("delivery");
    setMessage("");
    setError("");

    try {
      const result = await post({
        action: "deliverBaskets",
        basketCount: count,
        deliveredAt: deliveryForm.deliveredAt,
        destination: deliveryForm.destination,
        notes: deliveryForm.notes,
      });

      setMessage(result.message || "Entrega registrada.");
      setDeliveryForm({
        basketCount: "1",
        deliveredAt: todayIso(),
        destination: "",
        notes: "",
      });
      setDeliveryOpen(false);
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao registrar entrega.",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleBasketQuantity(row: BasketComposition) {
    if (!row.item) return;

    const answer = window.prompt(
      `Quantidade de "${row.item.name}" em cada cesta:`,
      String(row.quantity_required),
    );
    if (answer === null) return;

    const quantity = Number(answer.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    setBusy(`basket:${row.item_id}`);
    setError("");
    setMessage("");

    try {
      const result = await post({
        action: "updateBasketQuantity",
        itemId: row.item_id,
        quantity,
      });
      setMessage(result.message || "Cesta atualizada.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar cesta.");
    } finally {
      setBusy("");
    }
  }

  async function handleGrantAccess(event: FormEvent) {
    event.preventDefault();
    if (!teamPersonId) return;

    setBusy("team");
    setError("");
    setMessage("");

    try {
      const result = await post({
        action: "grantAccess",
        personId: teamPersonId,
        accessRole: teamRole,
      });
      setMessage(result.message || "Acesso atualizado.");
      setTeamPersonId("");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao liberar acesso.");
    } finally {
      setBusy("");
    }
  }

  async function handleRevokeAccess(personId: string, name: string) {
    if (!window.confirm(`Retirar o acesso de ${name} à Despensa Viva?`)) return;

    setBusy(`revoke:${personId}`);
    setError("");
    setMessage("");

    try {
      const result = await post({
        action: "revokeAccess",
        personId,
      });
      setMessage(result.message || "Acesso retirado.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao retirar acesso.");
    } finally {
      setBusy("");
    }
  }

  function exportCurrentStock() {
    const rows: Array<Array<string | number>> = [
      ["Alimento", "Embalagem", "Lote", "Quantidade disponível", "Entrada", "Validade", "Origem", "Demonstração"],
      ...batches.map((batch) => [
        batch.item?.name ?? "Item",
        batch.item?.package_label ?? "",
        batch.batch_code,
        batch.quantity_available,
        formatDate(batch.received_at),
        formatDate(batch.expires_at),
        batch.source ?? "",
        batch.demo_data ? "Sim" : "Não",
      ]),
    ];

    downloadCsv(`sementinha-estoque-${todayIso()}.csv`, rows);
  }

  function exportMovements() {
    if (!payload) return;

    const rows: Array<Array<string | number>> = [
      ["Data", "Alimento", "Lote", "Movimento", "Quantidade", "Observação", "Demonstração"],
      ...payload.movements.map((movement) => [
        formatDateTime(movement.occurred_at),
        movement.item?.name ?? "Item",
        movement.batch?.batch_code ?? "",
        movementLabel(movement.movement_type),
        movement.quantity_delta,
        movement.notes ?? "",
        movement.demo_data ? "Sim" : "Não",
      ]),
    ];

    downloadCsv(`sementinha-movimentacoes-${todayIso()}.csv`, rows);
  }

  async function handleClearDemo() {
    if (
      !window.confirm(
        "Remover os lotes e a entrega de demonstração? A composição atual da cesta será mantida.",
      )
    ) {
      return;
    }

    setBusy("clear-demo");
    setError("");
    setMessage("");

    try {
      const result = await post({ action: "clearDemoData" });
      setMessage(result.message || "Demonstração removida.");
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao remover dados de demonstração.",
      );
    } finally {
      setBusy("");
    }
  }

  if (authState === "loading") {
    return (
      <main className="min-h-screen bg-[#F6FAF2]">
        <TucxaPublicHeader
          actions={headerActions}
          showSupport={false}
          mobileActionColumns={4}
          compactMobileActions
          showSessionName
        />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="rounded-3xl bg-white p-5 font-black text-[#123D2C] shadow">
            Carregando a Despensa Viva...
          </p>
        </div>
      </main>
    );
  }

  if (authState === "signed-out") {
    const returnTo = encodeURIComponent(PAGE_BASE);
    return (
      <main className="min-h-screen bg-[#F6FAF2]">
        <TucxaPublicHeader
          actions={headerActions}
          showSupport={false}
          mobileActionColumns={4}
          compactMobileActions
        />
        <section className="mx-auto max-w-xl px-4 py-8">
          <div className="rounded-[2rem] bg-white p-6 text-center shadow-xl ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Despensa Viva
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#123D2C]">
              Entre para consultar ou atualizar o estoque.
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              O acesso é liberado somente para pessoas autorizadas pelo Sementinha/Tucxa.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href={`/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${returnTo}`}
                className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white"
              >
                Entrar como Filho da Corrente
              </Link>
              <Link
                href={`/solucoes/organizacao-em-harmonia/login?returnTo=${returnTo}`}
                className="rounded-2xl bg-[#E9F2E7] px-5 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
              >
                Acesso de gestão
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (authState === "forbidden" || !payload) {
    return (
      <main className="min-h-screen bg-[#F6FAF2]">
        <TucxaPublicHeader
          actions={headerActions}
          showSupport={false}
          mobileActionColumns={4}
          compactMobileActions
          showSessionName
        />
        <section className="mx-auto max-w-xl px-4 py-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-red-200">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
              Acesso não liberado
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#123D2C]">
              A Despensa Viva usa permissões próprias.
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {error || "Solicite a um gestor do Sementinha para liberar seu acesso."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6FAF2] text-[#173323]">
      <TucxaPublicHeader
        actions={headerActions}
        showSupport={false}
        mobileActionColumns={4}
        compactMobileActions
        showSessionName
      />

      <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
                Sementinha em Harmonia
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Despensa Viva
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA]">
                Olá, {firstName(payload.currentUser.personName)}. Aqui o estoque é
                acompanhado por lote e validade, para saber o que existe, o que
                deve sair primeiro e quantas cestas podem ser montadas.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ring-1 ring-white/20">
              {payload.currentUser.accessRole === "gestor"
                ? "Acesso de gestão"
                : "Somente consulta"}
            </span>
          </div>
        </div>

        {payload.overview.demoDataPresent && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
            <strong>Dados demonstrativos:</strong> as quantidades e validades
            iniciais servem para validar o processo, inclusive o exemplo de
            arroz com 10 kg vencendo antes e 40 kg em lote posterior. A
            composição da cesta é a atual; o estoque deve ser substituído pelo
            levantamento real antes do uso definitivo.
            {canManage && (
              <button
                type="button"
                onClick={() => void handleClearDemo()}
                disabled={busy === "clear-demo"}
                className="ml-2 mt-2 rounded-xl bg-amber-800 px-3 py-2 text-xs font-black text-white disabled:opacity-50 sm:mt-0"
              >
                {busy === "clear-demo"
                  ? "Removendo..."
                  : "Remover apenas dados de demonstração"}
              </button>
            )}
          </div>
        )}

        {(message || error) && (
          <div
            className={`mt-3 rounded-2xl p-3 text-sm font-bold ${
              error
                ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {tabLabels
              .filter((entry) => entry.id !== "equipe" || canManage)
              .map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setTab(entry.id);
                    setError("");
                    setMessage("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    tab === entry.id
                      ? "bg-[#123D2C] text-white"
                      : "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
          </div>
        </div>

        {tab === "resumo" && (
          <section className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Cestas possíveis
                </p>
                <p className="mt-1 text-4xl font-black text-[#123D2C]">
                  {payload.overview.possibleBaskets}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  considerando a composição atual
                </p>
              </article>

              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Lotes ativos
                </p>
                <p className="mt-1 text-4xl font-black text-[#123D2C]">
                  {payload.overview.activeLots}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  cada validade é controlada separadamente
                </p>
              </article>

              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Atenção em 60 dias
                </p>
                <p className="mt-1 text-4xl font-black text-[#123D2C]">
                  {payload.overview.expiring.length}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  lotes vencidos ou próximos da validade
                </p>
              </article>

              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Cestas entregues
                </p>
                <p className="mt-1 text-4xl font-black text-[#123D2C]">
                  {payload.deliveries.reduce(
                    (sum, delivery) => sum + delivery.basket_count,
                    0,
                  )}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  no histórico disponível
                </p>
              </article>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  O que limita novas cestas
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {payload.overview.bottlenecks.length
                    ? payload.overview.bottlenecks
                        .map((entry) => entry.itemName)
                        .join(", ")
                    : "Cadastre a composição da cesta"}
                </h2>
                <div className="mt-3 grid gap-2">
                  {payload.overview.basketCoverage.map((entry) => (
                    <div
                      key={entry.itemId}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#F6FAF2] px-3 py-2 ring-1 ring-[#123D2C]/10"
                    >
                      <span className="text-sm font-bold">{entry.itemName}</span>
                      <span className="text-xs font-black text-[#2F6B43]">
                        {entry.baskets} cesta(s)
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  FEFO · usar primeiro
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Validades que pedem atenção
                </h2>
                <div className="mt-3 grid gap-2">
                  {payload.overview.expiring.length === 0 && (
                    <p className="rounded-xl bg-[#F6FAF2] p-3 text-sm font-semibold text-slate-600">
                      Nenhum lote vence nos próximos 60 dias.
                    </p>
                  )}

                  {payload.overview.expiring.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl bg-[#F6FAF2] p-3 ring-1 ring-[#123D2C]/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{entry.itemName}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {entry.batchCode} · {entry.quantity} pacote(s) ·{" "}
                            {formatDate(entry.expiresAt)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${expiryTone(
                            entry.daysUntilExpiry,
                          )}`}
                        >
                          {expiryText(entry.daysUntilExpiry)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {tab === "estoque" && (
          <section className="mt-3 grid gap-3">
            <div className="flex flex-col gap-2 rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Estoque por alimento e lote</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  O total ajuda a entender quanto existe. Os lotes dizem o que deve sair primeiro.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setNewItemOpen((value) => !value)}
                  className="rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white"
                >
                  + Novo alimento
                </button>
              )}
            </div>

            {newItemOpen && canManage && (
              <form
                onSubmit={(event) => void handleCreateItem(event)}
                className="grid gap-3 rounded-[1.5rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:grid-cols-2"
              >
                <label className="grid gap-1 text-sm font-black">
                  Alimento
                  <input
                    value={itemForm.name}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                    placeholder="Ex.: Leite"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Como aparece a embalagem
                  <input
                    value={itemForm.packageLabel}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        packageLabel: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                    placeholder="Ex.: Pacote de 1 kg"
                  />
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Tamanho da embalagem
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={itemForm.packageSize}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        packageSize: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                  />
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Unidade
                  <select
                    value={itemForm.packageUnit}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        packageUnit: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                  >
                    <option value="kg">kg</option>
                    <option value="unidade">unidade</option>
                    <option value="pct">pacote</option>
                    <option value="litro">litro</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Quantidade por cesta
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={itemForm.basketQuantity}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        basketQuantity: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    Use 0 quando o alimento não fizer parte da cesta padrão.
                  </span>
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Observação
                  <input
                    value={itemForm.notes}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                    placeholder="Opcional"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy === "item"}
                  className="rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2"
                >
                  {busy === "item" ? "Salvando..." : "Cadastrar alimento"}
                </button>
              </form>
            )}

            {items.map((item) => {
              const itemBatches = batchesByItem.get(item.id) ?? [];
              const total = itemBatches.reduce(
                (sum, batch) => sum + batch.quantity_available,
                0,
              );

              return (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{item.name}</h3>
                        {item.is_basket_item && (
                          <span className="rounded-full bg-[#E9F2E7] px-2 py-1 text-[0.65rem] font-black text-[#2F6B43]">
                            Cesta atual
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        {item.package_label} · estoque:{" "}
                        <strong>{quantityDescription(item, total)}</strong>
                      </p>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setNewBatchItemId(item.id)}
                        className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                      >
                        + Entrada / lote
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {itemBatches.length === 0 && (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                        Nenhum lote cadastrado.
                      </p>
                    )}

                    {itemBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="rounded-xl bg-[#F8FAF7] p-3 ring-1 ring-[#123D2C]/10"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black">{batch.batch_code}</p>
                              {batch.demo_data && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.62rem] font-black text-amber-800">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              Disponível:{" "}
                              <strong>
                                {quantityDescription(item, batch.quantity_available)}
                              </strong>
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Entrada {formatDate(batch.received_at)} · validade{" "}
                              {formatDate(batch.expires_at)}
                              {batch.source ? ` · ${batch.source}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${expiryTone(
                                batch.daysUntilExpiry,
                              )}`}
                            >
                              {expiryText(batch.daysUntilExpiry)}
                            </span>

                            {canManage && (
                              <button
                                type="button"
                                onClick={() => void handleAdjustBatch(batch)}
                                disabled={busy === `adjust:${batch.id}`}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50"
                              >
                                Ajustar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {newBatchItemId === item.id && canManage && (
                    <form
                      onSubmit={(event) => void handleReceiveStock(event)}
                      className="mt-3 grid gap-2 rounded-xl bg-[#E9F2E7] p-3 sm:grid-cols-2"
                    >
                      <label className="grid gap-1 text-xs font-black">
                        Quantidade recebida
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={batchForm.quantity}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              quantity: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                          required
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-black">
                        Código/lote
                        <input
                          value={batchForm.batchCode}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              batchCode: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                          placeholder="Opcional — sistema gera se vazio"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-black">
                        Data de entrada
                        <input
                          type="date"
                          value={batchForm.receivedAt}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              receivedAt: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-black">
                        Validade
                        <input
                          type="date"
                          value={batchForm.expiresAt}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              expiresAt: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-black">
                        Origem
                        <input
                          value={batchForm.source}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              source: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                          placeholder="Ex.: Doação"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-black">
                        Observação
                        <input
                          value={batchForm.notes}
                          onChange={(event) =>
                            setBatchForm((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-semibold"
                        />
                      </label>

                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={busy === "batch"}
                          className="flex-1 rounded-xl bg-[#123D2C] px-3 py-2.5 text-sm font-black text-white disabled:opacity-50"
                        >
                          {busy === "batch" ? "Salvando..." : "Registrar entrada"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBatchItemId("")}
                          className="rounded-xl bg-white px-3 py-2.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {tab === "cestas" && (
          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                    Composição vigente
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {payload.template?.name ?? "Cesta Básica Sementinha"}
                  </h2>
                </div>
                <span className="rounded-full bg-[#123D2C] px-3 py-1.5 text-xs font-black text-white">
                  {payload.overview.possibleBaskets} cesta(s) possíveis
                </span>
              </div>

              <div className="mt-3 grid gap-2">
                {composition.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F6FAF2] p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <div>
                      <p className="font-black">{row.item?.name ?? "Item"}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {row.item?.package_label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                        {numberLabel(row.quantity_required)} por cesta
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => void handleBasketQuantity(row)}
                          disabled={busy === `basket:${row.item_id}`}
                          className="rounded-lg bg-white px-2 py-1.5 text-xs font-black text-[#2F6B43] ring-1 ring-[#123D2C]/10"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-[#123D2C] p-4 text-white shadow">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#CFE2C7]">
                Saída inteligente
              </p>
              <h2 className="mt-1 text-xl font-black">
                Entregar cestas com baixa FEFO
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#EEF7EA]">
                O sistema usa primeiro os lotes com validade mais próxima. Assim,
                o estoque total continua simples para o usuário, mas a decisão de
                saída respeita cada lote.
              </p>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => setDeliveryOpen((value) => !value)}
                  className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-[#123D2C]"
                >
                  {deliveryOpen ? "Fechar entrega" : "Registrar entrega de cestas"}
                </button>
              ) : (
                <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm font-bold">
                  Seu acesso é somente para consulta.
                </p>
              )}
            </article>

            {deliveryOpen && canManage && (
              <form
                onSubmit={(event) => void handleDeliver(event)}
                className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 lg:col-span-2"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="grid gap-1 text-sm font-black">
                    Quantidade de cestas
                    <input
                      type="number"
                      min="1"
                      max={Math.max(payload.overview.possibleBaskets, 1)}
                      value={deliveryForm.basketCount}
                      onChange={(event) =>
                        setDeliveryForm((current) => ({
                          ...current,
                          basketCount: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#123D2C]/15 px-3 py-2.5 font-semibold"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-black">
                    Data da entrega
                    <input
                      type="date"
                      value={deliveryForm.deliveredAt}
                      onChange={(event) =>
                        setDeliveryForm((current) => ({
                          ...current,
                          deliveredAt: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#123D2C]/15 px-3 py-2.5 font-semibold"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-black">
                    Destino/comunidade
                    <input
                      value={deliveryForm.destination}
                      onChange={(event) =>
                        setDeliveryForm((current) => ({
                          ...current,
                          destination: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#123D2C]/15 px-3 py-2.5 font-semibold"
                      placeholder="Opcional"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-black">
                    Observação
                    <input
                      value={deliveryForm.notes}
                      onChange={(event) =>
                        setDeliveryForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#123D2C]/15 px-3 py-2.5 font-semibold"
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-2xl bg-[#F6FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                    Prévia da baixa por validade
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {fefoPlan.map((row, index) => (
                      <div
                        key={`${row.itemName}-${row.batchCode}-${index}`}
                        className={`rounded-xl p-2.5 text-xs font-semibold ${
                          row.quantity < 0
                            ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                            : "bg-white text-slate-700 ring-1 ring-[#123D2C]/10"
                        }`}
                      >
                        <strong>{row.itemName}</strong>
                        <br />
                        {row.batchCode} ·{" "}
                        {row.quantity < 0
                          ? `faltam ${numberLabel(Math.abs(row.quantity))}`
                          : `${numberLabel(row.quantity)} pacote(s)`}
                        {row.expiresAt ? ` · vence ${formatDate(row.expiresAt)}` : ""}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    busy === "delivery" ||
                    deliveryCount > payload.overview.possibleBaskets
                  }
                  className="mt-4 w-full rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busy === "delivery"
                    ? "Registrando..."
                    : "Confirmar entrega e baixar estoque"}
                </button>
              </form>
            )}
          </section>
        )}

        {tab === "historico" && (
          <section className="mt-3 grid gap-3">
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                    Estoque em uma data
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Reconstrução pelo histórico de movimentações
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={snapshotDate}
                    onChange={(event) => setSnapshotDate(event.target.value)}
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => void refresh(snapshotDate)}
                    className="rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
                  >
                    Consultar
                  </button>
                  <button
                    type="button"
                    onClick={exportCurrentStock}
                    className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  >
                    CSV estoque
                  </button>
                  <button
                    type="button"
                    onClick={exportMovements}
                    className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  >
                    CSV movimentos
                  </button>
                </div>
              </div>

              {payload.snapshot && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {payload.snapshot.map((row) => (
                    <div
                      key={row.itemId}
                      className="rounded-xl bg-[#F6FAF2] p-3 ring-1 ring-[#123D2C]/10"
                    >
                      <p className="font-black">{row.itemName}</p>
                      <p className="text-sm font-semibold text-slate-600">
                        {numberLabel(row.quantity)} · {row.packageLabel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Movimentações
                </p>
                <div className="mt-3 grid gap-2">
                  {payload.movements.slice(0, 40).map((movement) => (
                    <div
                      key={movement.id}
                      className="rounded-xl bg-[#F8FAF7] p-3 ring-1 ring-[#123D2C]/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {movement.item?.name ?? "Item"} ·{" "}
                            {movementLabel(movement.movement_type)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {formatDateTime(movement.occurred_at)}
                            {movement.batch?.batch_code
                              ? ` · ${movement.batch.batch_code}`
                              : ""}
                          </p>
                          {movement.notes && (
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                              {movement.notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-black ${
                            movement.quantity_delta >= 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {movement.quantity_delta > 0 ? "+" : ""}
                          {numberLabel(movement.quantity_delta)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Entregas de cestas
                </p>
                <div className="mt-3 grid gap-2">
                  {payload.deliveries.length === 0 && (
                    <p className="rounded-xl bg-[#F8FAF7] p-3 text-sm font-semibold text-slate-500">
                      Nenhuma entrega registrada.
                    </p>
                  )}
                  {payload.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="rounded-xl bg-[#F8FAF7] p-3 ring-1 ring-[#123D2C]/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black">
                              {delivery.basket_count} cesta(s)
                            </p>
                            {delivery.demo_data && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.62rem] font-black text-amber-800">
                                DEMO
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-500">
                            {formatDate(delivery.delivered_at)}
                            {delivery.destination
                              ? ` · ${delivery.destination}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {tab === "equipe" && canManage && (
          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                Quem pode acessar
              </p>
              <h2 className="mt-1 text-xl font-black">Equipe do Sementinha</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Gestor pode atualizar estoque, cestas e permissões. Consulta pode acompanhar sem alterar.
              </p>

              <div className="mt-3 grid gap-2">
                {payload.team.length === 0 && (
                  <p className="rounded-xl bg-[#F8FAF7] p-3 text-sm font-semibold text-slate-500">
                    Nenhuma permissão específica cadastrada.
                  </p>
                )}

                {payload.team.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FAF7] p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <div>
                      <p className="font-black">
                        {row.person?.full_name ?? "Pessoa"}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {row.access_role === "gestor" ? "Gestor" : "Consulta"}
                        {!row.active ? " · acesso desativado" : ""}
                      </p>
                    </div>

                    {row.active && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleRevokeAccess(
                            row.person_id,
                            row.person?.full_name ?? "esta pessoa",
                          )
                        }
                        disabled={busy === `revoke:${row.person_id}`}
                        className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                      >
                        Retirar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </article>

            <form
              onSubmit={(event) => void handleGrantAccess(event)}
              className="rounded-[1.5rem] bg-[#E9F2E7] p-4 shadow ring-1 ring-[#123D2C]/10"
            >
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                Liberar acesso
              </p>
              <h2 className="mt-1 text-xl font-black">
                Escolha uma pessoa da Base Única
              </h2>

              <label className="mt-3 grid gap-1 text-sm font-black">
                Pessoa
                <select
                  value={teamPersonId}
                  onChange={(event) => setTeamPersonId(event.target.value)}
                  className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                  required
                >
                  <option value="">Selecione...</option>
                  {payload.people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                      {person.email ? ` — ${person.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 grid gap-1 text-sm font-black">
                Nível
                <select
                  value={teamRole}
                  onChange={(event) =>
                    setTeamRole(
                      event.target.value === "gestor" ? "gestor" : "consulta",
                    )
                  }
                  className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold"
                >
                  <option value="consulta">Consulta</option>
                  <option value="gestor">Gestor</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={busy === "team"}
                className="mt-4 w-full rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {busy === "team" ? "Salvando..." : "Liberar / atualizar acesso"}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
