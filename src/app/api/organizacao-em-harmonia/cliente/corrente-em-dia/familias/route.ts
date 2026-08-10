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
import { notifyFamilyContributionEvent } from "@/lib/organizacao-em-harmonia/corrente-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function loadFamilyNotificationDirectory(input: {
  organizationId: string;
  responsiblePersonId: string | null;
  familyGroupId: string;
}) {
  const { data: members, error: membersError } = await supabaseAdmin
    .from("oh_family_members")
    .select("person_id")
    .eq("organization_id", input.organizationId)
    .eq("family_group_id", input.familyGroupId)
    .eq("active", true);

  if (membersError) throw membersError;

  const personIds = Array.from(
    new Set(
      [
        input.responsiblePersonId,
        ...(members ?? []).map((member) => asText(member.person_id)),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  if (personIds.length === 0) {
    return {
      responsibleName: "Filho da Corrente",
      responsibleEmail: null as string | null,
      memberNames: [] as string[],
      memberEmails: [] as string[],
    };
  }

  const { data: people, error: peopleError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email")
    .eq("organization_id", input.organizationId)
    .in("id", personIds);

  if (peopleError) throw peopleError;

  const peopleById = new Map(
    (people ?? []).map((person) => [asText(person.id), person]),
  );
  const responsible = input.responsiblePersonId
    ? peopleById.get(input.responsiblePersonId)
    : null;
  const memberPeople = (members ?? []).flatMap((member) => {
    const person = peopleById.get(asText(member.person_id));
    return person ? [person] : [];
  });

  return {
    responsibleName:
      asText(responsible?.full_name) || "Filho da Corrente",
    responsibleEmail: asText(responsible?.email) || null,
    memberNames: memberPeople
      .map((person) => asText(person.full_name))
      .filter(Boolean),
    memberEmails: memberPeople
      .map((person) => asText(person.email))
      .filter(Boolean),
  };
}

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
        "id, name, responsible_person_id, contribution_mode, status, notes, requested_amount, approved_amount, decision_notes, submitted_at, decided_at, approved_at, created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
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
      const approvedAmount = Math.max(
        0,
        Math.round(asNumber(body.approvedAmount, 0) * 100) / 100,
      );

      if (!name || !responsiblePersonId) {
        return NextResponse.json(
          { error: "Informe o nome e o responsável financeiro da família." },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_family_groups")
        .insert({
          organization_id: auth.context.organizationId,
          name,
          responsible_person_id: responsiblePersonId,
          contribution_mode: mode,
          status: "ativo",
          notes: asText(body.notes) || null,
          requested_amount: approvedAmount || null,
          approved_amount: approvedAmount || null,
          submitted_at: now,
          decided_at: now,
          created_by: auth.context.personId,
          approved_by: auth.context.personId,
          approved_at: now,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (approvedAmount > 0) {
        const { error: preferenceError } = await supabaseAdmin
          .from("oh_contribution_preferences")
          .upsert(
            {
              organization_id: auth.context.organizationId,
              person_id: responsiblePersonId,
              family_group_id: data.id,
              updated_at: now,
            },
            { onConflict: "organization_id,person_id" },
          );
        if (preferenceError) throw preferenceError;
      }

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

      const now = new Date().toISOString();
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
            included_in_payment: asBoolean(body.includedInPayment, true),
            member_confirmed_at: relationship.requires_member_confirmation
              ? null
              : now,
            financial_approved_at: relationship.requires_financial_approval
              ? null
              : now,
            active: true,
            updated_at: now,
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

    if (action === "decideGroup") {
      const groupId = asText(body.groupId);
      const decision = asText(body.decision);
      const decisionNotes = asText(body.decisionNotes) || null;

      if (!groupId || !["approve", "reject"].includes(decision)) {
        return NextResponse.json(
          { error: "Informe a solicitação e a decisão." },
          { status: 400 },
        );
      }

      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_family_groups")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", groupId)
        .maybeSingle();

      if (beforeError) throw beforeError;
      if (!before?.id) {
        return NextResponse.json(
          { error: "Solicitação familiar não localizada." },
          { status: 404 },
        );
      }
      if (before.status !== "aguardando_aprovacao") {
        return NextResponse.json(
          { error: "Esta solicitação já foi analisada." },
          { status: 409 },
        );
      }

      const now = new Date().toISOString();

      const { count: activeMemberCount, error: memberCountError } =
        await supabaseAdmin
          .from("oh_family_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", auth.context.organizationId)
          .eq("family_group_id", groupId)
          .eq("active", true)
          .eq("included_in_payment", true);

      if (memberCountError) throw memberCountError;
      if (decision === "approve" && !activeMemberCount) {
        return NextResponse.json(
          { error: "Inclua pelo menos um agregado antes de aprovar." },
          { status: 400 },
        );
      }

      if (decision === "reject") {
        const { data, error } = await supabaseAdmin
          .from("oh_family_groups")
          .update({
            status: "rejeitado",
            decision_notes: decisionNotes,
            decided_at: now,
            approved_amount: null,
            approved_by: auth.context.personId,
            approved_at: null,
            updated_at: now,
          })
          .eq("organization_id", auth.context.organizationId)
          .eq("id", groupId)
          .select("*")
          .single();

        if (error) throw error;

        await writeFinancialAudit({
          organizationId: auth.context.organizationId,
          personId: auth.context.personId,
          action: "contribuicao_familiar_rejeitada",
          entityType: "oh_family_groups",
          entityId: groupId,
          beforeData: before,
          afterData: data,
          justification: decisionNotes || undefined,
        });

        const recipients = await loadFamilyNotificationDirectory({
          organizationId: auth.context.organizationId,
          responsiblePersonId: asText(before.responsible_person_id) || null,
          familyGroupId: groupId,
        });
        await notifyFamilyContributionEvent({
          organizationId: auth.context.organizationId,
          familyGroupId: groupId,
          familyName: asText(before.name) || "Contribuição familiar",
          responsibleName: recipients.responsibleName,
          responsibleEmail: recipients.responsibleEmail,
          requestedAmount: asNumber(before.requested_amount, 0),
          event: "rejeitada",
          submittedAt: asText(before.submitted_at) || asText(before.created_at),
          decidedAt: now,
          decisionNotes,
          memberNames: recipients.memberNames,
          memberEmails: recipients.memberEmails,
        });

        return NextResponse.json({
          ok: true,
          ...(await loadPayload(auth.context.organizationId)),
          message: "Solicitação familiar não aprovada.",
        });
      }

      const approvedAmount =
        Math.round(
          asNumber(body.approvedAmount, before.requested_amount) * 100,
        ) / 100;
      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        return NextResponse.json(
          { error: "Informe um valor aprovado maior que zero." },
          { status: 400 },
        );
      }

      const { error: replaceError } = await supabaseAdmin
        .from("oh_family_groups")
        .update({ status: "substituido", updated_at: now })
        .eq("organization_id", auth.context.organizationId)
        .eq("responsible_person_id", before.responsible_person_id)
        .eq("status", "ativo")
        .neq("id", groupId);

      if (replaceError) throw replaceError;

      const { data, error } = await supabaseAdmin
        .from("oh_family_groups")
        .update({
          status: "ativo",
          approved_amount: approvedAmount,
          decision_notes: decisionNotes,
          decided_at: now,
          approved_by: auth.context.personId,
          approved_at: now,
          updated_at: now,
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", groupId)
        .select("*")
        .single();

      if (error) throw error;

      const { error: memberApprovalError } = await supabaseAdmin
        .from("oh_family_members")
        .update({
          member_confirmed_at: now,
          financial_approved_at: now,
          updated_at: now,
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("family_group_id", groupId)
        .eq("active", true);

      if (memberApprovalError) throw memberApprovalError;

      if (before.responsible_person_id) {
        const { error: preferenceError } = await supabaseAdmin
          .from("oh_contribution_preferences")
          .upsert(
            {
              organization_id: auth.context.organizationId,
              person_id: before.responsible_person_id,
              family_group_id: groupId,
              updated_at: now,
            },
            { onConflict: "organization_id,person_id" },
          );

        if (preferenceError) throw preferenceError;
      }

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "contribuicao_familiar_aprovada",
        entityType: "oh_family_groups",
        entityId: groupId,
        beforeData: before,
        afterData: data,
        justification: decisionNotes || undefined,
      });

      const recipients = await loadFamilyNotificationDirectory({
        organizationId: auth.context.organizationId,
        responsiblePersonId: asText(before.responsible_person_id) || null,
        familyGroupId: groupId,
      });
      await notifyFamilyContributionEvent({
        organizationId: auth.context.organizationId,
        familyGroupId: groupId,
        familyName: asText(before.name) || "Contribuição familiar",
        responsibleName: recipients.responsibleName,
        responsibleEmail: recipients.responsibleEmail,
        requestedAmount: asNumber(before.requested_amount, 0),
        approvedAmount,
        event: "aprovada",
        submittedAt: asText(before.submitted_at) || asText(before.created_at),
        decidedAt: now,
        decisionNotes,
        memberNames: recipients.memberNames,
        memberEmails: recipients.memberEmails,
      });

      return NextResponse.json({
        ok: true,
        ...(await loadPayload(auth.context.organizationId)),
        message: "Contribuição familiar aprovada e liberada para o Filho da Corrente.",
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
