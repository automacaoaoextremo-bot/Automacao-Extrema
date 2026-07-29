import { NextResponse } from "next/server";
import {
  asBoolean,
  asNumber,
  asText,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function loadPayload(organizationId: string) {
  const [people, relationshipTypes, groups, members] = await Promise.all([
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_family_relationship_types")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("oh_family_groups")
      .select(
        "id, name, responsible_person_id, contribution_mode, status, notes, approved_at, created_at",
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_family_members")
      .select(
        "id, family_group_id, person_id, relationship_type_id, individual_amount, included_in_payment, member_confirmed_at, financial_approved_at, active",
      )
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  const failure = [people, relationshipTypes, groups, members].find(
    (result) => result.error,
  );
  if (failure?.error) throw failure.error;

  return {
    people: people.data ?? [],
    relationshipTypes: relationshipTypes.data ?? [],
    groups: groups.data ?? [],
    members: members.data ?? [],
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    return NextResponse.json(
      await loadPayload(auth.context.organizationId),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar famílias.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "saveRelationshipType") {
      const id = asText(body.id);
      const label = asText(body.label);
      const slug =
        asText(body.slug) ||
        label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      if (!label || !slug) {
        return NextResponse.json(
          { error: "Informe o grau de parentesco." },
          { status: 400 },
        );
      }

      const payload = {
        organization_id: auth.context.organizationId,
        slug,
        label,
        active: asBoolean(body.active, true),
        requires_member_confirmation: asBoolean(
          body.requiresMemberConfirmation,
          true,
        ),
        requires_financial_approval: asBoolean(
          body.requiresFinancialApproval,
          true,
        ),
        allow_responsible_payment: asBoolean(
          body.allowResponsiblePayment,
          true,
        ),
        sort_order: Math.trunc(asNumber(body.sortOrder, 0)),
        updated_at: new Date().toISOString(),
      };

      const operation = id
        ? supabaseAdmin
            .from("oh_family_relationship_types")
            .update(payload)
            .eq("organization_id", auth.context.organizationId)
            .eq("id", id)
            .select("*")
            .single()
        : supabaseAdmin
            .from("oh_family_relationship_types")
            .upsert(payload, {
              onConflict: "organization_id,slug",
            })
            .select("*")
            .single();

      const { data, error } = await operation;
      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "parentesco_configurado",
        entityType: "oh_family_relationship_types",
        entityId: data.id,
        afterData: data,
      });

      return NextResponse.json({
        ok: true,
        item: data,
        message: "Regra de parentesco salva.",
      });
    }

    if (action === "createGroup") {
      const name = asText(body.name);
      const responsiblePersonId = asText(body.responsiblePersonId);
      const mode = asText(body.contributionMode) || "consolidada";

      if (!name || !responsiblePersonId) {
        return NextResponse.json(
          { error: "Informe o nome e o responsável financeiro da família." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin
        .from("oh_family_groups")
        .insert({
          organization_id: auth.context.organizationId,
          name,
          responsible_person_id: responsiblePersonId,
          contribution_mode: mode,
          status: "ativo",
          notes: asText(body.notes) || null,
          created_by: auth.context.personId,
          approved_by: auth.context.personId,
          approved_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "familia_criada",
        entityType: "oh_family_groups",
        entityId: data.id,
        afterData: data,
      });

      return NextResponse.json({
        ok: true,
        group: data,
        message: "Grupo familiar criado.",
      });
    }

    if (action === "addMember") {
      const familyGroupId = asText(body.familyGroupId);
      const personId = asText(body.personId);
      const relationshipTypeId = asText(body.relationshipTypeId);

      if (!familyGroupId || !personId || !relationshipTypeId) {
        return NextResponse.json(
          { error: "Selecione a família, a pessoa e o parentesco." },
          { status: 400 },
        );
      }

      const { data: relationship, error: relationshipError } =
        await supabaseAdmin
          .from("oh_family_relationship_types")
          .select(
            "requires_member_confirmation, requires_financial_approval",
          )
          .eq("organization_id", auth.context.organizationId)
          .eq("id", relationshipTypeId)
          .eq("active", true)
          .maybeSingle();

      if (relationshipError) throw relationshipError;
      if (!relationship) {
        return NextResponse.json(
          { error: "Grau de parentesco não disponível." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin
        .from("oh_family_members")
        .upsert(
          {
            organization_id: auth.context.organizationId,
            family_group_id: familyGroupId,
            person_id: personId,
            relationship_type_id: relationshipTypeId,
            individual_amount:
              asNumber(body.individualAmount, 0) || null,
            included_in_payment: asBoolean(
              body.includedInPayment,
              true,
            ),
            member_confirmed_at: relationship.requires_member_confirmation
              ? null
              : new Date().toISOString(),
            financial_approved_at:
              relationship.requires_financial_approval
                ? new Date().toISOString()
                : new Date().toISOString(),
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "family_group_id,person_id" },
        )
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "membro_familiar_adicionado",
        entityType: "oh_family_members",
        entityId: data.id,
        afterData: data,
      });

      return NextResponse.json({
        ok: true,
        member: data,
        message: "Integrante incluído no grupo familiar.",
      });
    }

    if (action === "removeMember") {
      const memberId = asText(body.memberId);
      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_family_members")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", memberId)
        .maybeSingle();

      if (beforeError) throw beforeError;

      const { error } = await supabaseAdmin
        .from("oh_family_members")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", memberId);

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "membro_familiar_removido",
        entityType: "oh_family_members",
        entityId: memberId,
        beforeData: before,
      });

      return NextResponse.json({
        ok: true,
        message: "Integrante removido do grupo familiar.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar família.",
      },
      { status: 500 },
    );
  }
}
