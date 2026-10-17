import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
function loadEnvFile(filename) {
  const fullPath = path.join(ROOT, filename);
  if (!fs.existsSync(fullPath)) return;
  for (const rawLine of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (process.env[key]) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const password = process.env.TUCXA_PATRICIA_PASSWORD;
if (!url || !key) throw new Error("Configuração do Supabase não encontrada.");
if (!password) throw new Error('Defina antes: $env:TUCXA_PATRICIA_PASSWORD="12345678"');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PHONE = "19993484065";
const FULL_NAME = "Patricia";
const SYNTHETIC_EMAIL = `tucxa-recepcao-${PHONE}@organizacao-em-harmonia.local`;
const digits = (value) => String(value ?? "").replace(/\D/g, "");
const phoneMatches = (value) => {
  const candidate = digits(value);
  return candidate === PHONE || candidate === `55${PHONE}` || candidate.slice(-11) === PHONE;
};

async function main() {
  console.log("TUCXA - correção definitiva do acesso da Patricia - Agendamento-28");

  const { data: organizations, error: orgError } = await supabase.from("oh_organizations").select("id,name,slug,created_at");
  if (orgError) throw orgError;
  const organization = (organizations ?? []).sort((a, b) => String(a.slug === "tucxa" ? 0 : 1).localeCompare(String(b.slug === "tucxa" ? 0 : 1))).find((item) => item.slug === "tucxa" || String(item.name ?? "").toLowerCase().includes("tucxa"));
  if (!organization?.id) throw new Error("Organização TUCXA não localizada.");
  console.log(`Organização: ${organization.name} (${organization.id})`);

  const { data: people, error: peopleError } = await supabase.from("oh_people").select("*").limit(5000);
  if (peopleError) throw peopleError;
  let person = (people ?? []).find((item) => phoneMatches(item.whatsapp));
  if (!person?.id) throw new Error("Patricia não localizada em oh_people. Execute primeiro o provisionamento anterior ou cadastre-a pela Recepção.");

  const personPatch = { organization_id: organization.id, full_name: person.full_name || FULL_NAME, whatsapp: PHONE, active: true, registration_source: "tucxa_agendamento_piloto_01" };
  const { data: updatedPerson, error: personUpdateError } = await supabase.from("oh_people").update(personPatch).eq("id", person.id).select("*").single();
  if (personUpdateError) throw personUpdateError;
  person = updatedPerson;
  console.log(`Pessoa OK: ${person.id}`);

  const { data: roles, error: roleError } = await supabase.from("oh_roles").select("*").eq("organization_id", organization.id).eq("active", true);
  if (roleError) throw roleError;
  const role = (roles ?? []).find((item) => ["filho-da-corrente", "filho-corrente"].includes(String(item.slug ?? ""))) || (roles ?? []).find((item) => String(item.name ?? "").toLowerCase().includes("filho"));
  if (!role?.id) throw new Error('Papel-base "Filho da Corrente" não localizado.');

  const { data: memberships, error: membershipError } = await supabase.from("oh_memberships").select("*").eq("person_id", person.id).limit(20);
  if (membershipError) throw membershipError;
  let membership = (memberships ?? []).find((item) => item.organization_id === organization.id) || (memberships ?? [])[0] || null;
  const previousProfile = membership?.agenda_viva_profile && typeof membership.agenda_viva_profile === "object" && !Array.isArray(membership.agenda_viva_profile) ? membership.agenda_viva_profile : {};
  const profile = {
    ...previousProfile,
    pilotAccessKind: "recepcao",
    source: "tucxa_agendamento_piloto_01",
    pilotFirstAccessRequired: true,
    pilotOnboardingCompletedAt: null,
    supportsReception: true,
    functionSlugs: Array.from(new Set([...(Array.isArray(previousProfile.functionSlugs) ? previousProfile.functionSlugs : []), "recepcao"])),
    selectedFunctions: Array.from(new Map([...(Array.isArray(previousProfile.selectedFunctions) ? previousProfile.selectedFunctions : []), { slug: "recepcao", label: "Recepção" }].map((item) => [String(item?.slug ?? item?.label ?? ""), item])).values()),
    functions: Array.from(new Map([...(Array.isArray(previousProfile.functions) ? previousProfile.functions : []), { slug: "recepcao", label: "Recepção" }].map((item) => [String(item?.slug ?? item?.label ?? ""), item])).values()),
  };

  if (membership?.id) {
    const { data, error } = await supabase.from("oh_memberships").update({ organization_id: organization.id, role_id: role.id, active: true, status: "ativo", agenda_viva_profile: profile, updated_at: new Date().toISOString() }).eq("id", membership.id).select("*").single();
    if (error) throw error;
    membership = data;
  } else {
    const { data, error } = await supabase.from("oh_memberships").insert({ organization_id: organization.id, person_id: person.id, role_id: role.id, active: true, status: "ativo", agenda_viva_profile: profile }).select("*").single();
    if (error) throw error;
    membership = data;
  }
  console.log(`Membership OK: ${membership.id} / status=${membership.status}`);

  let authUser = null;
  if (person.auth_user_id) {
    const { data: linkedAuth, error: linkedAuthError } = await supabase.auth.admin.getUserById(person.auth_user_id);
    if (!linkedAuthError) authUser = linkedAuth?.user ?? null;
  }
  if (!authUser) {
    for (let page = 1; page <= 20 && !authUser; page += 1) {
      const { data: authList, error: authListError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (authListError) throw authListError;
      authUser = (authList.users ?? []).find((item) => phoneMatches(item.phone) || String(item.email ?? "").toLowerCase() === SYNTHETIC_EMAIL) ?? null;
      if ((authList.users ?? []).length < 1000) break;
    }
  }
  if (authUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email: SYNTHETIC_EMAIL,
      email_confirm: true,
      phone: `+55${PHONE}`,
      phone_confirm: true,
      password,
      user_metadata: { ...(authUser.user_metadata ?? {}), person_id: person.id, full_name: person.full_name || FULL_NAME, must_change_password: true },
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SYNTHETIC_EMAIL,
      email_confirm: true,
      phone: `+55${PHONE}`,
      phone_confirm: true,
      password,
      user_metadata: { person_id: person.id, full_name: person.full_name || FULL_NAME, must_change_password: true },
    });
    if (error) throw error;
    authUser = data.user;
  }

  const { error: linkError } = await supabase.from("oh_people").update({ auth_user_id: authUser.id, organization_id: organization.id, active: true }).eq("id", person.id);
  if (linkError) throw linkError;

  console.log("\nCONFERÊNCIA FINAL");
  console.log(`Pessoa:       ${person.id}`);
  console.log(`Organização:  ${organization.id}`);
  console.log(`Membership:   ${membership.id}`);
  console.log(`Perfil:       ${membership.agenda_viva_profile?.pilotAccessKind}`);
  console.log(`Auth:         ${authUser.id}`);
  console.log(`Login:        ${PHONE}`);
  console.log("Senha:        redefinida pela variável TUCXA_PATRICIA_PASSWORD");
  console.log("OK - acesso da Patricia provisionado para Recepção e marcado para primeiro acesso.");
}

main().catch((error) => { console.error("\nERRO:", error instanceof Error ? error.message : error); process.exitCode = 1; });
