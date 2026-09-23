import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local é opcional quando as variáveis já existem no ambiente.
  }
}

function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function localBrazilPhone(value) {
  const raw = digits(value);
  return raw.startsWith("55") && raw.length >= 12 ? raw.slice(2) : raw;
}

function authEmailFor(phone) {
  return `tucxa.${phone}@organizacao-em-harmonia.local`;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values) {
  return [...new Set(values.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
loadEnvFile(resolve(repoRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const temporaryPassword = process.env.TUCXA_PILOT_TEMP_PASSWORD;
const seedFile = process.env.TUCXA_PILOT_SEED_FILE;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em .env.local.");
}
if (!temporaryPassword || temporaryPassword.length < 8) {
  throw new Error("Defina TUCXA_PILOT_TEMP_PASSWORD somente durante a execução, com pelo menos 8 caracteres.");
}
if (!seedFile) {
  throw new Error("Defina TUCXA_PILOT_SEED_FILE apontando para o JSON local de acessos. Esse arquivo não deve ser versionado no Git.");
}

let seed;
try {
  seed = JSON.parse(readFileSync(seedFile, "utf8"));
} catch (error) {
  throw new Error(`Não foi possível ler TUCXA_PILOT_SEED_FILE: ${error instanceof Error ? error.message : String(error)}`);
}

if (!Array.isArray(seed?.people) || seed.people.length === 0) {
  throw new Error("O arquivo local precisa conter a propriedade people com pelo menos uma pessoa.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: organization, error: orgError } = await supabase
  .from("oh_organizations")
  .select("id,name,slug")
  .eq("slug", "tucxa")
  .maybeSingle();
if (orgError) throw orgError;
if (!organization?.id) throw new Error("Organização com slug 'tucxa' não localizada.");

const { data: role, error: roleError } = await supabase
  .from("oh_roles")
  .select("id")
  .eq("organization_id", organization.id)
  .eq("slug", "filho-da-corrente")
  .eq("active", true)
  .maybeSingle();
if (roleError) throw roleError;
if (!role?.id) throw new Error("Função 'filho-da-corrente' não localizada. Aplique primeiro a migration Agendamento-01.");

const { data: entityRows, error: entityError } = await supabase
  .from("oh_spiritual_entities")
  .select("id,name,slug")
  .eq("organization_id", organization.id);
if (entityError) throw entityError;
const entityBySlug = new Map((entityRows ?? []).map((item) => [String(item.slug), item]));

const { data: existingPeople, error: peopleError } = await supabase
  .from("oh_people")
  .select("id,full_name,whatsapp,email,auth_user_id,active,registration_source")
  .eq("organization_id", organization.id);
if (peopleError) throw peopleError;
const personByPhone = new Map(
  (existingPeople ?? []).map((person) => [localBrazilPhone(person.whatsapp), person]),
);

let createdPeople = 0;
let createdUsers = 0;
let preservedUsers = 0;
let updatedMemberships = 0;
let linkedEntities = 0;
let failed = 0;

for (const item of seed.people) {
  const fullName = String(item?.fullName ?? "").trim();
  const phone = localBrazilPhone(item?.whatsapp);
  const accessKind = item?.accessKind === "recepcao" ? "recepcao" : "cavalinho";
  const entitySlugs = uniqueStrings(Array.isArray(item?.entities) ? item.entities : []);

  if (!fullName || !/^\d{10,11}$/.test(phone)) {
    failed += 1;
    console.error(`[ERRO] ${fullName || "Pessoa sem nome"}: telefone '${item?.whatsapp ?? ""}' não possui 10 ou 11 dígitos após normalização. Confira antes de provisionar.`);
    continue;
  }

  try {
    let person = personByPhone.get(phone);
    if (!person) {
      const { data, error } = await supabase
        .from("oh_people")
        .insert({
          organization_id: organization.id,
          full_name: fullName,
          whatsapp: phone,
          active: true,
          registration_source: "tucxa_agendamento_piloto_01",
        })
        .select("id,full_name,whatsapp,email,auth_user_id,active,registration_source")
        .single();
      if (error) throw error;
      person = data;
      personByPhone.set(phone, person);
      createdPeople += 1;
    } else {
      const { data, error } = await supabase
        .from("oh_people")
        .update({
          whatsapp: phone,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization.id)
        .eq("id", person.id)
        .select("id,full_name,whatsapp,email,auth_user_id,active,registration_source")
        .single();
      if (error) throw error;
      person = data;
      personByPhone.set(phone, person);
    }

    const { data: membership, error: membershipError } = await supabase
      .from("oh_memberships")
      .select("id,role_id,module_slugs,agenda_viva_profile")
      .eq("organization_id", organization.id)
      .eq("person_id", person.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;

    const currentProfile = asRecord(membership?.agenda_viva_profile);
    const currentFunctionSlugs = Array.isArray(currentProfile.functionSlugs) ? currentProfile.functionSlugs : [];
    const currentSelectedFunctions = Array.isArray(currentProfile.selectedFunctions) ? currentProfile.selectedFunctions : [];
    const nextProfile = {
      ...currentProfile,
      source: "tucxa_agendamento_piloto_01",
      pilotAccessKind: accessKind,
      pilotFirstAccessRequired: true,
      functionSlugs: uniqueStrings([...currentFunctionSlugs, accessKind]),
      selectedFunctions: [
        ...currentSelectedFunctions.filter((entry) => asRecord(entry).slug !== accessKind),
        { slug: accessKind, label: accessKind === "recepcao" ? "Recepção" : "Cavalinho" },
      ],
      supportsReception: accessKind === "recepcao" || currentProfile.supportsReception === true,
      supportsCavalinho: accessKind === "cavalinho" || currentProfile.supportsCavalinho === true,
    };
    const moduleSlugs = uniqueStrings([
      ...(Array.isArray(membership?.module_slugs) ? membership.module_slugs : []),
      "agenda-viva",
      "atendimento-em-harmonia",
      "corrente-em-dia",
    ]);

    if (membership?.id) {
      const { error } = await supabase
        .from("oh_memberships")
        .update({
          role_id: membership.role_id || role.id,
          module_slugs: moduleSlugs,
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
        role_id: role.id,
        module_slugs: moduleSlugs,
        active: true,
        status: "ativo",
        agenda_viva_profile: nextProfile,
      });
      if (error) throw error;
    }
    updatedMemberships += 1;

    if (accessKind === "cavalinho") {
      for (const entitySlug of entitySlugs) {
        const entity = entityBySlug.get(entitySlug);
        if (!entity?.id) {
          throw new Error(`Entidade com slug '${entitySlug}' não localizada. Confira a migration e o arquivo local.`);
        }
        const { error } = await supabase.from("oh_person_entity_links").upsert({
          organization_id: organization.id,
          person_id: person.id,
          entity_id: entity.id,
          relationship_type: "recebe",
          is_primary_for_attendance: false,
          active: true,
          notes: "Associação informada no Agendamento-01.",
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,person_id,entity_id,relationship_type" });
        if (error) throw error;
        linkedEntities += 1;
      }
    }

    if (person.auth_user_id) {
      preservedUsers += 1;
      console.log(`[PRESERVADO] ${fullName}: login existente mantido; senha atual não foi alterada.`);
      continue;
    }

    const authEmail = authEmailFor(phone);
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        oh_profile: "filho-da-corrente",
        must_change_password: true,
        pilot_access: true,
      },
    });
    if (createError || !createdUser.user?.id) throw createError ?? new Error("Usuário criado sem ID.");

    const { error: authLinkError } = await supabase
      .from("oh_people")
      .update({ auth_user_id: createdUser.user.id, updated_at: new Date().toISOString() })
      .eq("organization_id", organization.id)
      .eq("id", person.id);
    if (authLinkError) {
      await supabase.auth.admin.deleteUser(createdUser.user.id).catch(() => undefined);
      throw authLinkError;
    }

    person.auth_user_id = createdUser.user.id;
    createdUsers += 1;
    console.log(`[CRIADO] ${fullName}: login pelo WhatsApp ${phone}; troca de senha obrigatória no primeiro acesso.`);
  } catch (error) {
    failed += 1;
    console.error(`[ERRO] ${fullName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log(`Pessoas novas: ${createdPeople}`);
console.log(`Logins novos: ${createdUsers}`);
console.log(`Logins existentes preservados: ${preservedUsers}`);
console.log(`Vínculos/perfis atualizados: ${updatedMemberships}`);
console.log(`Vínculos Cavalinho/Entidade processados: ${linkedEntities}`);
console.log(`Erros: ${failed}`);
console.log("A senha temporária não foi gravada em código, migration ou arquivo de dados.");

if (failed > 0) process.exitCode = 1;
