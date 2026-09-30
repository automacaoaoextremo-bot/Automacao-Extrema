/**
 * TUCXA — conferência/provisionamento local das pessoas da Recepção.
 *
 * NÃO adicionar este arquivo ao Git com dados pessoais.
 * Execute localmente e apague depois, se desejar.
 *
 * O script:
 * - localiza o TUCXA;
 * - localiza cada pessoa pelo WhatsApp;
 * - garante membership ativo, papel-base Filho da Corrente e perfil operacional Recepção;
 * - garante os módulos agenda-viva e atendimento-em-harmonia;
 * - cria usuário Auth por telefone se não existir e vincula auth_user_id;
 * - redefine a senha temporária para 12345678;
 * - imprime uma conferência final sem mostrar a senha.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(path.resolve(process.cwd(), ".env.local"));

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEMP_PASSWORD = "12345678";

const receptionPeople = [
  { name: "Mayara",   whatsapp: "19993041785" },
  { name: "Fatima",   whatsapp: "19991427194" },
  { name: "Sheila",   whatsapp: "19971193917" },
  { name: "Leandro",  whatsapp: "19991670867" },
  { name: "Mariana",  whatsapp: "19991532076" },
  { name: "Renata",   whatsapp: "19991311959" },
  { name: "Patricia", whatsapp: "19993484065" },
];

function digits(value) {
  let result = String(value || "").replace(/\D/g, "");
  if (result.startsWith("55") && result.length > 11) result = result.slice(2);
  return result;
}

function profileFunctions(profile) {
  const source = Array.isArray(profile?.functions) ? profile.functions : [];
  const filtered = source.filter((item) => {
    const slug = typeof item === "string" ? item : String(item?.slug || "");
    return slug.toLowerCase() !== "recepcao";
  });
  return [...filtered, { slug: "recepcao", name: "Recepção" }];
}

async function findPerson(organizationId, target) {
  const { data, error } = await supabase
    .from("oh_people")
    .select("id,full_name,whatsapp,normalized_whatsapp,email,auth_user_id,active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .limit(2000);
  if (error) throw error;

  const phone = digits(target.whatsapp);
  const exact = (data || []).filter((row) =>
    digits(row.normalized_whatsapp || row.whatsapp) === phone
  );

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(`${target.name}: mais de um cadastro possui o WhatsApp ${phone}.`);
  }

  const byName = (data || []).filter((row) =>
    String(row.full_name || "").toLocaleLowerCase("pt-BR").startsWith(target.name.toLocaleLowerCase("pt-BR"))
  );
  if (byName.length === 1) return byName[0];

  throw new Error(`${target.name}: cadastro não localizado de forma inequívoca pelo WhatsApp.`);
}

async function ensureAuth(person, target) {
  let userId = person.auth_user_id || "";

  if (!userId) {
    const phone = `+55${digits(target.whatsapp)}`;
    const { data, error } = await supabase.auth.admin.createUser({
      phone,
      password: TEMP_PASSWORD,
      phone_confirm: true,
      user_metadata: { full_name: person.full_name || target.name, source: "tucxa_recepcao_agendamento_25" },
    });

    if (error) {
      throw new Error(`${target.name}: não foi possível criar o usuário Auth por telefone: ${error.message}`);
    }
    userId = data.user?.id || "";
    if (!userId) throw new Error(`${target.name}: usuário Auth criado sem ID.`);

    const { error: personError } = await supabase
      .from("oh_people")
      .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", person.id);
    if (personError) throw personError;
  }

  const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
    password: TEMP_PASSWORD,
  });
  if (passwordError) {
    throw new Error(`${target.name}: não foi possível definir a senha temporária: ${passwordError.message}`);
  }

  return userId;
}

async function main() {
  const { data: organizations, error: orgError } = await supabase
    .from("oh_organizations")
    .select("id,name,slug")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .limit(10);
  if (orgError) throw orgError;

  const organization = (organizations || []).sort((a, b) =>
    a.slug === "tucxa" ? -1 : b.slug === "tucxa" ? 1 : 0
  )[0];
  if (!organization?.id) throw new Error("Organização TUCXA não encontrada.");

  const { data: roles, error: rolesError } = await supabase
    .from("oh_roles")
    .select("id,name,slug,active")
    .eq("organization_id", organization.id)
    .eq("active", true);
  if (rolesError) throw rolesError;

  const baseRole = (roles || []).find((role) =>
    ["filho-da-corrente", "filho-corrente"].includes(String(role.slug || "").toLowerCase())
  );
  if (!baseRole?.id) throw new Error('Função-base "Filho da Corrente" não encontrada.');

  const results = [];

  for (const target of receptionPeople) {
    try {
      const person = await findPerson(organization.id, target);
      const userId = await ensureAuth(person, target);

      const { data: memberships, error: membershipError } = await supabase
        .from("oh_memberships")
        .select("id,role_id,module_slugs,active,status,agenda_viva_profile")
        .eq("organization_id", organization.id)
        .eq("person_id", person.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (membershipError) throw membershipError;

      const membership = memberships?.[0];
      const profile = membership?.agenda_viva_profile && typeof membership.agenda_viva_profile === "object"
        ? membership.agenda_viva_profile
        : {};

      const nextProfile = {
        ...profile,
        pilotAccessKind: "recepcao",
        supportsReception: true,
        isReception: true,
        functions: profileFunctions(profile),
        validationStatus: "ativo",
        receptionProvisionedAt: new Date().toISOString(),
      };

      const modules = Array.from(new Set([
        ...(Array.isArray(membership?.module_slugs) ? membership.module_slugs : []),
        "agenda-viva",
        "atendimento-em-harmonia",
      ]));

      if (membership?.id) {
        const { error } = await supabase
          .from("oh_memberships")
          .update({
            role_id: baseRole.id,
            module_slugs: modules,
            active: true,
            status: "ativo",
            agenda_viva_profile: nextProfile,
            updated_at: new Date().toISOString(),
          })
          .eq("id", membership.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("oh_memberships").insert({
          organization_id: organization.id,
          person_id: person.id,
          role_id: baseRole.id,
          module_slugs: modules,
          active: true,
          status: "ativo",
          is_main_contact: false,
          can_receive_notifications: true,
          agenda_viva_profile: nextProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      results.push({
        nomeEsperado: target.name,
        cadastro: person.full_name,
        whatsapp: digits(person.normalized_whatsapp || person.whatsapp),
        recepcao: "SIM",
        acessoAuth: userId ? "SIM" : "NÃO",
        senhaTemporariaDefinida: "SIM",
        resultado: "OK",
      });
    } catch (error) {
      results.push({
        nomeEsperado: target.name,
        whatsapp: target.whatsapp,
        recepcao: "NÃO CONFIRMADO",
        acessoAuth: "NÃO CONFIRMADO",
        senhaTemporariaDefinida: "NÃO CONFIRMADO",
        resultado: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.table(results);
  const failed = results.filter((item) => item.resultado !== "OK");
  if (failed.length) {
    console.error(`\n${failed.length} pessoa(s) exigem revisão. Nenhuma linha com erro deve ser considerada confirmada.`);
    process.exitCode = 1;
  } else {
    console.log("\nTodas as 7 pessoas foram conferidas/provisionadas como Recepção e receberam a senha temporária solicitada.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
