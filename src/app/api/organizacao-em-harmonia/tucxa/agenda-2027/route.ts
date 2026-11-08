import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { projectOriginalEvents, type OriginalAgendaEvent } from "@/lib/organizacao-em-harmonia/tucxa-agenda-agv-bridge";
import type { CalendarEvent2027 } from "@/lib/organizacao-em-harmonia/tucxa-agenda-2027";
import {
  EVENT_CATEGORIES_2027,
  normalizeMobile2027,
  validateAgendaDate, validAgendaYear,
  type Category2027,
  type Status2027,
} from "@/lib/organizacao-em-harmonia/tucxa-agenda-2027";

export const dynamic = "force-dynamic";
const TABLE = "tucxa_annual_events_2027";
const AUDIT = "tucxa_annual_events_2027_audit";
const MAX_BODY_BYTES = 12_000;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validTime(value: string): boolean {
  return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function isCategory(value: string): value is Category2027 {
  return EVENT_CATEGORIES_2027.some((category) => category.key === value);
}
function isStatus(value: string): value is Status2027 {
  return ["rascunho", "pendente", "aprovado", "rejeitado", "ajustes_solicitados"].includes(value);
}
function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host && new URL(origin).protocol === new URL(request.url).protocol;
  } catch { return false; }
}
async function payload(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error("Solicitação muito grande.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error("Solicitação muito grande.");
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Dados inválidos.");
  return data as Record<string, unknown>;
}
async function organization() {
  const { data, error } = await supabaseAdmin.from("oh_organizations")
    .select("id").eq("slug", "tucxa").maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Organização TUCXA não encontrada.");
  return data.id as string;
}

async function authorizedReviewer(request: Request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  const emails = (process.env.OH_AGENDA_2027_APPROVER_EMAILS || "tucxacentro@gmail.com")
    .split(/[;,\s]+/).map((value) => value.toLowerCase().trim()).filter(Boolean);
  if (!emails.includes(data.user.email.toLowerCase())) return null;
  return data.user;
}

function cleanEvent(body: Record<string, unknown>, proposal = false) {
  const title = text(body.title, 150);
  const eventDate = text(body.event_date, 10);
  const endDate = text(body.end_date, 10);
  const start = text(body.starts_time, 5);
  const end = text(body.ends_time, 5);
  const category = text(body.category, 40);
  const audience = text(body.audience, 80) || "todos";
  const location = text(body.location, 160) || "A definir";
  if (title.length < 3 || !validateAgendaDate(eventDate)) throw new Error("Informe título e data válida entre 2027 e 2100.");
  if (endDate && (!validateAgendaDate(endDate) || endDate < eventDate || endDate.slice(0, 4) !== eventDate.slice(0, 4))) throw new Error("Data final inválida: use o mesmo ano.");
  if (!isCategory(category)) throw new Error("Categoria inválida.");
  if (!validTime(start) || !validTime(end)) throw new Error("Horário inválido.");
  if (start && end && end <= start && !endDate) throw new Error("Horário de término deve ser posterior ao início.");
  return {
    title, description: text(body.description, 2000) || null,
    event_date: eventDate, end_date: endDate || null,
    starts_time: start || null, ends_time: end || null,
    category, audience, location,
    is_public: proposal ? audience !== "diretoria" : body.is_public !== false && audience !== "diretoria",
  };
}

async function audit(eventId: string, actor: string | null, action: string, before: unknown, after: unknown) {
  const result = await supabaseAdmin.from(AUDIT).insert({
    event_id: eventId, actor_uid: actor, action, before_data: before, after_data: after,
  });
  if (result.error) throw result.error;
}

export async function GET(request: Request) {
  try {
    const org = await organization();
    const url = new URL(request.url);
    const management = url.searchParams.get("gestao") === "1";
    const year = Number(url.searchParams.get("ano") ?? "2027");
    if (!validAgendaYear(year)) return json({ error: "Ano inválido (2027 a 2100)." }, 400);
    if (management && !(await authorizedReviewer(request))) return json({ error: "Acesso restrito à Diretoria autorizada." }, 403);
    const fields = management
      ? "*"
      : "id,title,description,event_date,end_date,starts_time,ends_time,category,audience,location,status,is_public";
    let query = supabaseAdmin.from(TABLE).select(fields).eq("organization_id", org)
      .gte("event_date", `${year}-01-01`).lte("event_date", `${year}-12-31`)
      .order("event_date", { ascending: true }).limit(2000);
    if (!management) query = query.eq("status", "aprovado").eq("is_public", true);
    // Dados aprovados do cadastro original sao a fonte dos eventos existentes
    // (incluindo recorrencias). Nao duplicar registros nem reaprovar a V1.
    const [annualResult, originalResult] = await Promise.all([
      query,
      supabaseAdmin.from("agv_events")
        .select("id,title,status,active,starts_at,ends_at,recurrence_rule,event_type,location,group_slug,metadata")
        .eq("organization_id", org).eq("status", "aprovado").eq("active", true)
        .lte("starts_at", `${year}-12-31T23:59:59-03:00`)
        .order("starts_at", { ascending: true }).limit(2000),
    ]);
    if (annualResult.error) throw annualResult.error;
    if (originalResult.error) throw originalResult.error;
    // A selecao dinamica do Supabase pode ser inferida como unknown.
    // Validamos a estrutura antes de espalhar os campos do registro.
    const annualRows: unknown[] = Array.isArray(annualResult.data) ? annualResult.data : [];
    const annual: CalendarEvent2027[] = annualRows.map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Registro de evento anual invalido retornado pelo Supabase.");
      }
      const row = raw as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.event_date !== "string") {
        throw new Error("Registro de evento anual sem campos obrigatorios validos.");
      }
      return {
        ...(row as unknown as CalendarEvent2027),
        origin: "calendario" as const,
      };
    });
    const fromOriginal = projectOriginalEvents((originalResult.data ?? []) as OriginalAgendaEvent[], year);
    // Registros com titulo e dia identicos sao mostrados uma unica vez.
    // Nao altera o banco, apenas evita dupla exibicao nas duas fontes.
    const key = (event: CalendarEvent2027) => `${event.event_date}:${event.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()}`;
    const seen = new Set(annual.filter((e) => e.status === "aprovado").map(key));
    const merged = [...annual, ...fromOriginal.filter((event) => !seen.has(key(event)))];
    merged.sort((a, b) => a.event_date.localeCompare(b.event_date) || a.title.localeCompare(b.title, "pt-BR"));
    return json({ ok: true, events: merged, sources: { multianual: annual.length, agendaVivaOriginal: fromOriginal.length } });
  } catch (error) {
    console.error("[agenda-2027:GET]", error);
    return json({ error: "Não foi possível carregar o calendário. Confira a migration e a configuração." }, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origem não autorizada." }, 403);
  let body: Record<string, unknown>;
  try { body = await payload(request); }
  catch { return json({ error: "Dados inválidos ou muito grandes." }, 400); }

  const action = text(body.action, 30);
  try {
    const org = await organization();
    if (action === "suggest") {
      // Honeypot: robôs geralmente preenchem campos ocultos.
      if (text(body.website, 120)) return json({ ok: true, message: "Sugestão recebida para análise." }, 202);
      const mobile = normalizeMobile2027(text(body.proposer_phone, 30));
      const name = text(body.proposer_name, 100);
      const email = text(body.proposer_email, 160);
      if (!mobile || name.length < 3) return json({ error: "Informe nome e celular válido com DDD." }, 400);
      if (body.consent !== true) return json({ error: "É necessário autorizar o contato e o tratamento dos dados da sugestão." }, 400);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);
      const cleaned = cleanEvent(body, true);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();
      const { count, error: countError } = await supabaseAdmin.from(TABLE)
        .select("id", { count: "exact", head: true }).eq("organization_id", org)
        .eq("proposer_phone", mobile).gte("created_at", yesterday);
      if (countError) throw countError;
      if ((count ?? 0) >= 3) return json({ error: "Limite diário de sugestões atingido para este celular." }, 429);
      const { data, error } = await supabaseAdmin.from(TABLE).insert({
        ...cleaned, organization_id: org, status: "pendente",
        proposer_name: name, proposer_phone: mobile, proposer_email: email || null, consent_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      await audit(data.id, null, "sugestao_publica", null, { event_date: cleaned.event_date, category: cleaned.category });
      return json({ ok: true, message: "Sugestão recebida para análise. A publicação depende de aprovação." }, 201);
    }

    const reviewer = await authorizedReviewer(request);
    if (!reviewer) return json({ error: "Acesso restrito à Diretoria autorizada." }, 403);

    if (action === "save") {
      const cleaned = cleanEvent(body);
      const eventId = text(body.id, 40);
      const status = text(body.status, 30) || "rascunho";
      if (!isStatus(status)) return json({ error: "Status inválido." }, 400);
      if (eventId && !uuid(eventId)) return json({ error: "ID inválido." }, 400);
      if (eventId) {
        const { data: original, error: readError } = await supabaseAdmin.from(TABLE)
          .select("*").eq("organization_id", org).eq("id", eventId).maybeSingle();
        if (readError) throw readError;
        if (!original) return json({ error: "Evento não encontrado." }, 404);
        const { data, error } = await supabaseAdmin.from(TABLE)
          .update({ ...cleaned, status, updated_at: new Date().toISOString(),
            reviewed_by: status === "aprovado" ? reviewer.id : original.reviewed_by,
            reviewed_at: status === "aprovado" ? new Date().toISOString() : original.reviewed_at,
          }).eq("id", eventId).eq("organization_id", org).select("*").single();
        if (error) throw error;
        await audit(eventId, reviewer.id, "editar", original, data);
      } else {
        const { data, error } = await supabaseAdmin.from(TABLE).insert({
          ...cleaned, organization_id: org, status, created_by: reviewer.id,
          reviewed_by: status === "aprovado" ? reviewer.id : null,
          reviewed_at: status === "aprovado" ? new Date().toISOString() : null,
        }).select("*").single();
        if (error) throw error;
        await audit(data.id, reviewer.id, "criar", null, data);
      }
      return json({ ok: true });
    }

    if (action === "decide") {
      const eventId = text(body.id, 40);
      const status = text(body.status, 30);
      const reason = text(body.review_notes, 1000);
      if (!uuid(eventId) || !["aprovado", "rejeitado", "ajustes_solicitados", "rascunho"].includes(status)) {
        return json({ error: "Decisão ou ID inválidos." }, 400);
      }
      if (["rejeitado", "ajustes_solicitados"].includes(status) && reason.length < 5) {
        return json({ error: "Informe o motivo da recusa ou dos ajustes solicitados." }, 400);
      }
      const { data: original, error: readError } = await supabaseAdmin.from(TABLE)
        .select("*").eq("organization_id", org).eq("id", eventId).maybeSingle();
      if (readError) throw readError;
      if (!original) return json({ error: "Evento não encontrado." }, 404);
      const { data, error } = await supabaseAdmin.from(TABLE).update({
        status, review_notes: reason || null, reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", eventId).eq("organization_id", org).select("*").single();
      if (error) throw error;
      await audit(eventId, reviewer.id, `decidir:${status}`, original, data);
      return json({ ok: true });
    }
    return json({ error: "Ação não reconhecida." }, 400);
  } catch (error) {
    console.error("[agenda-2027:POST]", error);
    return json({ error: "Não foi possível concluir. Confira os dados e a configuração do banco." }, 500);
  }
}
