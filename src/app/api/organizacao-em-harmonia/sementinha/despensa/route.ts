import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getSementinhaAccess,
  type SementinhaAccessRole,
} from "@/lib/organizacao-em-harmonia/sementinha-auth";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: string;
  name: string;
  slug: string;
  package_size: number | string;
  package_unit: string;
  package_label: string;
  is_basket_item: boolean;
  active: boolean;
  sort_order: number;
  notes: string | null;
};

type BatchRow = {
  id: string;
  item_id: string;
  batch_code: string;
  quantity_initial: number | string;
  quantity_available: number | string;
  received_at: string;
  expires_at: string | null;
  source: string | null;
  notes: string | null;
  demo_data: boolean;
  created_at: string;
};

type TemplateItemRow = {
  id: string;
  template_id: string;
  item_id: string;
  quantity_required: number | string;
  sort_order: number;
};

type MovementRow = {
  id: string;
  item_id: string;
  batch_id: string | null;
  movement_type: string;
  quantity_delta: number | string;
  occurred_at: string;
  notes: string | null;
  demo_data: boolean;
};

type DeliveryRow = {
  id: string;
  basket_count: number;
  delivered_at: string;
  destination: string | null;
  notes: string | null;
  demo_data: boolean;
  created_at: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function positiveNumber(value: unknown) {
  const numeric = numberValue(value);
  return numeric > 0 ? numeric : 0;
}

function positiveInteger(value: unknown) {
  const numeric = Math.floor(numberValue(value));
  return numeric > 0 ? numeric : 0;
}

function isoDate(value: unknown, fallback = "") {
  const raw = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function endOfDayIso(date: string) {
  return `${date}T23:59:59.999Z`;
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  const startToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const target = new Date(`${date}T00:00:00Z`).getTime();
  return Math.ceil((target - startToday) / 86400000);
}

async function activeTemplate(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_sementinha_basket_templates")
    .select("id, name, slug, active, notes")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function buildOverview(
  items: ItemRow[],
  batches: BatchRow[],
  templateItems: TemplateItemRow[],
) {
  const totalsByItem = new Map<string, number>();

  for (const batch of batches) {
    totalsByItem.set(
      batch.item_id,
      (totalsByItem.get(batch.item_id) ?? 0) +
        numberValue(batch.quantity_available),
    );
  }

  const basketCoverage = templateItems
    .map((row) => {
      const item = items.find((candidate) => candidate.id === row.item_id);
      const required = positiveNumber(row.quantity_required);
      const available = totalsByItem.get(row.item_id) ?? 0;
      const baskets = required > 0 ? Math.floor(available / required) : 0;

      return {
        itemId: row.item_id,
        itemName: item?.name ?? "Item",
        required,
        available,
        baskets,
      };
    })
    .sort((a, b) => a.baskets - b.baskets || a.itemName.localeCompare(b.itemName));

  const possibleBaskets =
    basketCoverage.length > 0 ? basketCoverage[0]?.baskets ?? 0 : 0;
  const bottleneckBaskets = basketCoverage[0]?.baskets ?? 0;
  const bottlenecks = basketCoverage.filter(
    (entry) => entry.baskets === bottleneckBaskets,
  );

  const expiring = batches
    .filter((batch) => numberValue(batch.quantity_available) > 0)
    .map((batch) => {
      const item = items.find((candidate) => candidate.id === batch.item_id);
      return {
        id: batch.id,
        itemId: batch.item_id,
        itemName: item?.name ?? "Item",
        batchCode: batch.batch_code,
        quantity: numberValue(batch.quantity_available),
        expiresAt: batch.expires_at,
        daysUntilExpiry: daysUntil(batch.expires_at),
        packageLabel: item?.package_label ?? "",
        demoData: batch.demo_data,
      };
    })
    .filter(
      (entry) =>
        entry.daysUntilExpiry !== null &&
        (entry.daysUntilExpiry as number) <= 60,
    )
    .sort(
      (a, b) =>
        (a.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER) -
        (b.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    possibleBaskets,
    basketCoverage,
    bottlenecks,
    expiring,
    totalAvailablePackages: batches.reduce(
      (sum, batch) => sum + numberValue(batch.quantity_available),
      0,
    ),
    activeLots: batches.filter(
      (batch) => numberValue(batch.quantity_available) > 0,
    ).length,
    demoDataPresent: batches.some((batch) => batch.demo_data),
  };
}

async function loadSnapshot(
  organizationId: string,
  items: ItemRow[],
  asOf: string,
) {
  const { data, error } = await supabaseAdmin
    .from("oh_sementinha_movements")
    .select("item_id, quantity_delta")
    .eq("organization_id", organizationId)
    .lte("occurred_at", endOfDayIso(asOf));

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    totals.set(
      row.item_id,
      (totals.get(row.item_id) ?? 0) + numberValue(row.quantity_delta),
    );
  }

  return items.map((item) => ({
    itemId: item.id,
    itemName: item.name,
    packageLabel: item.package_label,
    quantity: totals.get(item.id) ?? 0,
  }));
}

export async function GET(request: Request) {
  const access = await getSementinhaAccess(request, "consulta");
  if (!access.ok) return access.response;

  const { organizationId, personId, personName, accessRole, isClientAdmin } =
    access.context;

  try {
    const template = await activeTemplate(organizationId);

    const [
      itemsResult,
      batchesResult,
      movementsResult,
      deliveriesResult,
      templateItemsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("oh_sementinha_items")
        .select(
          "id, name, slug, package_size, package_unit, package_label, is_basket_item, active, sort_order, notes",
        )
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabaseAdmin
        .from("oh_sementinha_batches")
        .select(
          "id, item_id, batch_code, quantity_initial, quantity_available, received_at, expires_at, source, notes, demo_data, created_at",
        )
        .eq("organization_id", organizationId)
        .order("expires_at", { ascending: true, nullsFirst: false })
        .order("received_at", { ascending: true }),

      supabaseAdmin
        .from("oh_sementinha_movements")
        .select(
          "id, item_id, batch_id, movement_type, quantity_delta, occurred_at, notes, demo_data",
        )
        .eq("organization_id", organizationId)
        .order("occurred_at", { ascending: false })
        .limit(150),

      supabaseAdmin
        .from("oh_sementinha_deliveries")
        .select(
          "id, basket_count, delivered_at, destination, notes, demo_data, created_at",
        )
        .eq("organization_id", organizationId)
        .order("delivered_at", { ascending: false })
        .limit(100),

      template?.id
        ? supabaseAdmin
            .from("oh_sementinha_basket_template_items")
            .select("id, template_id, item_id, quantity_required, sort_order")
            .eq("template_id", template.id)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError = [
      itemsResult.error,
      batchesResult.error,
      movementsResult.error,
      deliveriesResult.error,
      templateItemsResult.error,
    ].find(Boolean);

    if (firstError) throw firstError;

    const items = (itemsResult.data ?? []) as ItemRow[];
    const batches = (batchesResult.data ?? []) as BatchRow[];
    const movements = (movementsResult.data ?? []) as MovementRow[];
    const deliveries = (deliveriesResult.data ?? []) as DeliveryRow[];
    const templateItems = (templateItemsResult.data ?? []) as TemplateItemRow[];

    const itemById = new Map(items.map((item) => [item.id, item]));
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    const enrichedBatches = batches.map((batch) => ({
      ...batch,
      quantity_initial: numberValue(batch.quantity_initial),
      quantity_available: numberValue(batch.quantity_available),
      daysUntilExpiry: daysUntil(batch.expires_at),
      item: itemById.get(batch.item_id) ?? null,
    }));

    const enrichedMovements = movements.map((movement) => ({
      ...movement,
      quantity_delta: numberValue(movement.quantity_delta),
      item: itemById.get(movement.item_id) ?? null,
      batch: movement.batch_id
        ? batchById.get(movement.batch_id) ?? null
        : null,
    }));

    const basketComposition = templateItems.map((row) => ({
      ...row,
      quantity_required: numberValue(row.quantity_required),
      item: itemById.get(row.item_id) ?? null,
    }));

    const asOf = isoDate(new URL(request.url).searchParams.get("asOf"));
    const snapshot = asOf
      ? await loadSnapshot(organizationId, items, asOf)
      : null;

    let team: Array<Record<string, unknown>> = [];
    let people: Array<Record<string, unknown>> = [];

    if (accessRole === "gestor") {
      const [accessRows, peopleRows] = await Promise.all([
        supabaseAdmin
          .from("oh_sementinha_access")
          .select("id, person_id, access_role, active, created_at, updated_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("oh_people")
          .select("id, full_name, email, whatsapp, active")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("full_name", { ascending: true })
          .limit(500),
      ]);

      if (accessRows.error) throw accessRows.error;
      if (peopleRows.error) throw peopleRows.error;

      const peopleMap = new Map(
        (peopleRows.data ?? []).map((person) => [person.id, person]),
      );

      team = (accessRows.data ?? []).map((row) => ({
        ...row,
        person: peopleMap.get(row.person_id) ?? null,
      }));
      people = peopleRows.data ?? [];
    }

    return NextResponse.json({
      currentUser: {
        personId,
        personName,
        accessRole,
        isClientAdmin,
      },
      template,
      items: items.map((item) => ({
        ...item,
        package_size: numberValue(item.package_size),
      })),
      batches: enrichedBatches,
      basketComposition,
      movements: enrichedMovements,
      deliveries,
      overview: buildOverview(items, batches, templateItems),
      snapshot,
      snapshotDate: asOf || null,
      team,
      people,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar a Despensa Viva.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = text(body.action);

  const readOnlyActions = new Set<string>();
  const requiredRole: SementinhaAccessRole = readOnlyActions.has(action)
    ? "consulta"
    : "gestor";

  const access = await getSementinhaAccess(request, requiredRole);
  if (!access.ok) return access.response;

  const { organizationId, personId, isClientAdmin } = access.context;

  try {
    if (action === "createItem") {
      const name = text(body.name);
      const packageSize = positiveNumber(body.packageSize);
      const packageUnit = text(body.packageUnit) || "unidade";
      const packageLabel =
        text(body.packageLabel) ||
        `${packageSize || 1} ${packageUnit}`.trim();
      const basketQuantity = positiveNumber(body.basketQuantity);

      if (!name) {
        return NextResponse.json(
          { error: "Informe o nome do alimento." },
          { status: 400 },
        );
      }

      const slugBase = slugify(name) || "item";
      let slug = slugBase;
      let suffix = 2;

      while (true) {
        const { data: existing, error } = await supabaseAdmin
          .from("oh_sementinha_items")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        if (!existing?.id) break;
        slug = `${slugBase}-${suffix}`;
        suffix += 1;
      }

      const { data: item, error } = await supabaseAdmin
        .from("oh_sementinha_items")
        .insert({
          organization_id: organizationId,
          name,
          slug,
          package_size: packageSize || 1,
          package_unit: packageUnit,
          package_label: packageLabel,
          is_basket_item: basketQuantity > 0,
          active: true,
          sort_order: Math.floor(numberValue(body.sortOrder)) || 999,
          notes: text(body.notes) || null,
          created_by: personId,
        })
        .select(
          "id, name, slug, package_size, package_unit, package_label, is_basket_item, active, sort_order, notes",
        )
        .single();

      if (error) throw error;

      if (basketQuantity > 0) {
        const template = await activeTemplate(organizationId);
        if (template?.id) {
          const { error: templateError } = await supabaseAdmin
            .from("oh_sementinha_basket_template_items")
            .upsert(
              {
                template_id: template.id,
                item_id: item.id,
                quantity_required: basketQuantity,
                sort_order: item.sort_order ?? 999,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "template_id,item_id" },
            );

          if (templateError) throw templateError;
        }
      }

      return NextResponse.json({
        ok: true,
        message: `${name} foi incluído no cadastro.`,
        item,
      });
    }

    if (action === "updateBasketQuantity") {
      const itemId = text(body.itemId);
      const quantity = numberValue(body.quantity);

      if (!itemId) {
        return NextResponse.json(
          { error: "Item não informado." },
          { status: 400 },
        );
      }

      const template = await activeTemplate(organizationId);
      if (!template?.id) {
        return NextResponse.json(
          { error: "Composição de cesta não encontrada." },
          { status: 409 },
        );
      }

      if (quantity > 0) {
        const { data: item, error: itemError } = await supabaseAdmin
          .from("oh_sementinha_items")
          .select("sort_order")
          .eq("id", itemId)
          .eq("organization_id", organizationId)
          .single();

        if (itemError) throw itemError;

        const { error } = await supabaseAdmin
          .from("oh_sementinha_basket_template_items")
          .upsert(
            {
              template_id: template.id,
              item_id: itemId,
              quantity_required: quantity,
              sort_order: item.sort_order ?? 999,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "template_id,item_id" },
          );

        if (error) throw error;

        await supabaseAdmin
          .from("oh_sementinha_items")
          .update({ is_basket_item: true, updated_at: new Date().toISOString() })
          .eq("organization_id", organizationId)
          .eq("id", itemId);
      } else {
        const { error } = await supabaseAdmin
          .from("oh_sementinha_basket_template_items")
          .delete()
          .eq("template_id", template.id)
          .eq("item_id", itemId);

        if (error) throw error;

        await supabaseAdmin
          .from("oh_sementinha_items")
          .update({
            is_basket_item: false,
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", organizationId)
          .eq("id", itemId);
      }

      return NextResponse.json({
        ok: true,
        message:
          quantity > 0
            ? "Quantidade da cesta atualizada."
            : "Item retirado da composição da cesta.",
      });
    }

    if (action === "receiveStock") {
      const itemId = text(body.itemId);
      const quantity = positiveNumber(body.quantity);
      const receivedAt = isoDate(body.receivedAt, new Date().toISOString().slice(0, 10));
      const expiresAt = isoDate(body.expiresAt) || null;

      if (!itemId || quantity <= 0) {
        return NextResponse.json(
          { error: "Informe o alimento e uma quantidade maior que zero." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "oh_sementinha_receive_stock",
        {
          p_organization_id: organizationId,
          p_item_id: itemId,
          p_batch_code: text(body.batchCode),
          p_quantity: quantity,
          p_received_at: receivedAt,
          p_expires_at: expiresAt,
          p_source: text(body.source),
          p_notes: text(body.notes),
          p_created_by: personId,
        },
      );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message:
          "Entrada registrada. O lote já participa da ordem de saída por validade (FEFO).",
        batchId: data,
      });
    }

    if (action === "adjustBatch") {
      const batchId = text(body.batchId);
      const newQuantity = numberValue(body.newQuantity);

      if (!batchId || newQuantity < 0) {
        return NextResponse.json(
          { error: "Informe o lote e uma quantidade válida." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "oh_sementinha_adjust_batch",
        {
          p_organization_id: organizationId,
          p_batch_id: batchId,
          p_new_quantity: newQuantity,
          p_notes: text(body.notes),
          p_created_by: personId,
        },
      );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: "Saldo do lote ajustado e histórico preservado.",
        quantity: data,
      });
    }

    if (action === "deliverBaskets") {
      const template = await activeTemplate(organizationId);
      const basketCount = positiveInteger(body.basketCount);
      const deliveredAt = isoDate(
        body.deliveredAt,
        new Date().toISOString().slice(0, 10),
      );

      if (!template?.id) {
        return NextResponse.json(
          { error: "Composição de cesta não encontrada." },
          { status: 409 },
        );
      }

      if (basketCount <= 0) {
        return NextResponse.json(
          { error: "Informe a quantidade de cestas entregues." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "oh_sementinha_deliver_baskets",
        {
          p_organization_id: organizationId,
          p_template_id: template.id,
          p_basket_count: basketCount,
          p_delivered_at: deliveredAt,
          p_destination: text(body.destination),
          p_notes: text(body.notes),
          p_created_by: personId,
        },
      );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: `${basketCount} cesta(s) baixada(s). O sistema consumiu primeiro os lotes com validade mais próxima.`,
        deliveryId: data,
      });
    }

    if (action === "grantAccess") {
      const targetPersonId = text(body.personId);
      const role = text(body.accessRole);

      if (!targetPersonId || (role !== "gestor" && role !== "consulta")) {
        return NextResponse.json(
          { error: "Informe a pessoa e o nível de acesso." },
          { status: 400 },
        );
      }

      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .eq("id", targetPersonId)
        .eq("active", true)
        .single();

      if (personError) throw personError;

      const { error } = await supabaseAdmin
        .from("oh_sementinha_access")
        .upsert(
          {
            organization_id: organizationId,
            person_id: targetPersonId,
            access_role: role,
            active: true,
            granted_by: personId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,person_id" },
        );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: `${person.full_name} recebeu acesso de ${
          role === "gestor" ? "gestão" : "consulta"
        } à Despensa Viva.`,
      });
    }

    if (action === "revokeAccess") {
      const targetPersonId = text(body.personId);
      if (!targetPersonId) {
        return NextResponse.json(
          { error: "Pessoa não informada." },
          { status: 400 },
        );
      }

      if (targetPersonId === personId && !isClientAdmin) {
        return NextResponse.json(
          {
            error:
              "Para evitar perda de acesso, um gestor não pode retirar o próprio acesso.",
          },
          { status: 409 },
        );
      }

      const { error } = await supabaseAdmin
        .from("oh_sementinha_access")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("person_id", targetPersonId);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: "Acesso ao Sementinha retirado.",
      });
    }

    if (action === "clearDemoData") {
      const { data: demoDeliveries, error: deliveryListError } =
        await supabaseAdmin
          .from("oh_sementinha_deliveries")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("demo_data", true);

      if (deliveryListError) throw deliveryListError;

      const demoDeliveryIds = (demoDeliveries ?? []).map((row) => row.id);

      if (demoDeliveryIds.length > 0) {
        const { error: deliveryItemsError } = await supabaseAdmin
          .from("oh_sementinha_delivery_items")
          .delete()
          .in("delivery_id", demoDeliveryIds);

        if (deliveryItemsError) throw deliveryItemsError;
      }

      const { error: movementsError } = await supabaseAdmin
        .from("oh_sementinha_movements")
        .delete()
        .eq("organization_id", organizationId)
        .eq("demo_data", true);

      if (movementsError) throw movementsError;

      const { error: deliveriesError } = await supabaseAdmin
        .from("oh_sementinha_deliveries")
        .delete()
        .eq("organization_id", organizationId)
        .eq("demo_data", true);

      if (deliveriesError) throw deliveriesError;

      const { error: batchesError } = await supabaseAdmin
        .from("oh_sementinha_batches")
        .delete()
        .eq("organization_id", organizationId)
        .eq("demo_data", true);

      if (batchesError) throw batchesError;

      return NextResponse.json({
        ok: true,
        message:
          "Dados demonstrativos removidos. A composição da cesta foi preservada para iniciar o estoque real.",
      });
    }

    return NextResponse.json(
      { error: "Ação do Sementinha não reconhecida." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação no Sementinha.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
