import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

/*
 * TUCXA - Agendamento Piloto
 * Correção/provisionamento do acesso da Patricia - Agendamento-27
 *
 * Objetivos:
 * - localizar Patricia pelo WhatsApp;
 * - criar oh_people caso ainda não exista;
 * - garantir membership ativo;
 * - manter papel-base Filho da Corrente;
 * - incluir a função operacional Recepção;
 * - habilitar os módulos necessários;
 * - criar/atualizar usuário do Supabase Auth;
 * - definir senha temporária informada por variável de ambiente.
 *
 * Execute SEMPRE a partir da raiz do projeto:
 *
 *   $env:TUCXA_PATRICIA_PASSWORD="12345678"
 *   node .\scripts\tucxa-corrigir-acesso-patricia-agendamento-27.mjs
 *
 * Depois:
 *
 *   Remove-Item Env:TUCXA_PATRICIA_PASSWORD
 */

const ROOT = process.cwd();

function loadEnvFile(filename) {
  const fullPath = path.join(ROOT, filename);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();

    if (process.env[key]) {
      continue;
    }

    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const PASSWORD =
  process.env.TUCXA_PATRICIA_PASSWORD;

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL não encontrada."
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY não encontrada."
  );
}

if (!PASSWORD) {
  throw new Error(
    'Defina antes: $env:TUCXA_PATRICIA_PASSWORD="12345678"'
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const TARGET = {
  fullName: "Patricia",
  whatsapp: "19993484065",
};

/*
 * Pessoas conhecidas da Recepção.
 *
 * Elas serão utilizadas SOMENTE como referência para descobrir
 * o organization_id correto. Não alteramos os cadastros delas.
 */
const RECEPTION_REFERENCE_PHONES = [
  "19993041785", // Mayara
  "19991427194", // Fatima
  "19971193917", // Sheila
  "19991670867", // Leandro
  "19991532076", // Mariana
  "19991311959", // Renata
];

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function uniqueStrings(values) {
  return [
    ...new Set(
      (values ?? [])
        .map((value) =>
          String(value ?? "").trim()
        )
        .filter(Boolean)
    ),
  ];
}

function normalizeFunction(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isRecepcao(value) {
  return normalizeFunction(value) === "recepcao";
}

async function findPersonByWhatsapp() {
  /*
   * Não fazemos eq() diretamente porque os cadastros antigos
   * podem ter telefone salvo com máscara, +55 etc.
   */
  const { data, error } = await supabase
    .from("oh_people")
    .select("*")
    .limit(5000);

  if (error) {
    throw new Error(
      `Erro consultando oh_people: ${error.message}`
    );
  }

  const targetDigits =
    onlyDigits(TARGET.whatsapp);

  return (
    (data ?? []).find((row) => {
      const digits =
        onlyDigits(row.whatsapp);

      return (
        digits === targetDigits ||
        digits === `55${targetDigits}` ||
        `55${digits}` === targetDigits
      );
    }) ?? null
  );
}

async function createPerson() {
  console.log("");
  console.log(
    "Patricia ainda não existe em oh_people."
  );
  console.log(
    "Criando cadastro..."
  );

  const payload = {
    full_name: TARGET.fullName,
    whatsapp: TARGET.whatsapp,
    active: true,
  };

  let result = await supabase
    .from("oh_people")
    .insert(payload)
    .select("*")
    .single();

  /*
   * Compatibilidade com versões em que oh_people
   * ainda não possui a coluna active.
   */
  if (
    result.error &&
    /active/i.test(result.error.message)
  ) {
    delete payload.active;

    result = await supabase
      .from("oh_people")
      .insert(payload)
      .select("*")
      .single();
  }

  if (result.error) {
    throw new Error(
      `Não foi possível criar Patricia em oh_people: ${result.error.message}`
    );
  }

  console.log(
    `OK - oh_people criado: ${result.data.id}`
  );

  return result.data;
}

async function ensurePerson() {
  let person =
    await findPersonByWhatsapp();

  if (!person?.id) {
    person =
      await createPerson();
  } else {
    console.log("");
    console.log(
      `OK - Patricia localizada em oh_people: ${person.id}`
    );

    const update = {};

    if (
      !String(
        person.full_name ?? ""
      ).trim()
    ) {
      update.full_name =
        TARGET.fullName;
    }

    if (
      onlyDigits(person.whatsapp) !==
      onlyDigits(TARGET.whatsapp)
    ) {
      update.whatsapp =
        TARGET.whatsapp;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        person,
        "active"
      ) &&
      person.active !== true
    ) {
      update.active = true;
    }

    if (
      Object.keys(update).length > 0
    ) {
      const { error } = await supabase
        .from("oh_people")
        .update(update)
        .eq("id", person.id);

      if (error) {
        throw new Error(
          `Erro atualizando Patricia: ${error.message}`
        );
      }

      person = {
        ...person,
        ...update,
      };
    }
  }

  return person;
}

async function findMembership(personId) {
  const { data, error } =
    await supabase
      .from("oh_memberships")
      .select("*")
      .eq("person_id", personId)
      .limit(20);

  if (error) {
    throw new Error(
      `Erro consultando oh_memberships: ${error.message}`
    );
  }

  return (
    (data ?? [])[0] ?? null
  );
}

async function getFilhoCorrenteRoleId() {
  const { data, error } =
    await supabase
      .from("oh_roles")
      .select("*");

  if (error) {
    throw new Error(
      `Erro consultando oh_roles: ${error.message}`
    );
  }

  const role =
    (data ?? []).find((row) => {
      const candidates = [
        row.slug,
        row.name,
        row.label,
        row.key,
      ];

      return candidates.some(
        (value) => {
          const normalized =
            normalizeFunction(value);

          return (
            normalized ===
              "filho da corrente" ||
            normalized ===
              "filho-da-corrente" ||
            normalized ===
              "filho_da_corrente" ||
            normalized ===
              "filhocorrente"
          );
        }
      );
    }) ?? null;

  if (!role?.id) {
    throw new Error(
      'Papel-base "Filho da Corrente" não encontrado em oh_roles.'
    );
  }

  return role.id;
}

/*
 * ============================================================
 * REFERÊNCIA DA RECEPÇÃO
 * ============================================================
 *
 * oh_memberships.organization_id é obrigatório.
 *
 * Em vez de colocar um UUID fixo ou inventar a organização,
 * procuramos uma pessoa da Recepção que já esteja funcionando
 * e usamos o organization_id do membership dela.
 */
async function findReceptionReferenceMembership() {
  console.log("");
  console.log(
    "Localizando uma pessoa da Recepção para obter a organização..."
  );

  const {
    data: people,
    error: peopleError,
  } = await supabase
    .from("oh_people")
    .select("*")
    .limit(5000);

  if (peopleError) {
    throw new Error(
      `Erro consultando pessoas da Recepção: ${peopleError.message}`
    );
  }

  for (
    const referencePhone
    of RECEPTION_REFERENCE_PHONES
  ) {
    const referenceDigits =
      onlyDigits(referencePhone);

    const referencePerson =
      (people ?? []).find(
        (row) => {
          const digits =
            onlyDigits(row.whatsapp);

          return (
            digits === referenceDigits ||
            digits ===
              `55${referenceDigits}` ||
            `55${digits}` ===
              referenceDigits
          );
        }
      );

    if (!referencePerson?.id) {
      continue;
    }

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("oh_memberships")
      .select("*")
      .eq(
        "person_id",
        referencePerson.id
      )
      .limit(20);

    if (membershipError) {
      throw new Error(
        `Erro consultando membership da referência ${referencePerson.full_name}: ${membershipError.message}`
      );
    }

    const membership =
      (memberships ?? []).find(
        (item) =>
          item.organization_id
      );

    if (!membership) {
      continue;
    }

    console.log(
      `OK - referência encontrada: ${referencePerson.full_name}`
    );

    console.log(
      `Organization ID: ${membership.organization_id}`
    );

    return {
      person: referencePerson,
      membership,
    };
  }

  throw new Error(
    "Nenhuma pessoa conhecida da Recepção com organization_id foi localizada. Não é seguro criar o membership da Patricia sem identificar a organização correta."
  );
}

async function ensureMembership(person) {
  const roleId =
    await getFilhoCorrenteRoleId();

  let membership =
    await findMembership(person.id);

  if (!membership) {
    console.log("");
    console.log(
      "Membership da Patricia ainda não existe."
    );

    /*
     * organization_id é obrigatório em oh_memberships.
     *
     * Para não assumir um UUID, utilizamos uma pessoa da
     * Recepção já provisionada como referência.
     */
    const reference =
      await findReceptionReferenceMembership();

    const organizationId =
      reference.membership.organization_id;

    console.log(
      "Criando membership da Patricia..."
    );

    const payload = {
      person_id: person.id,
      organization_id:
        organizationId,
      role_id: roleId,
      status: "active",
    };

    let result = await supabase
      .from("oh_memberships")
      .insert(payload)
      .select("*")
      .single();

    /*
     * Compatibilidade caso esta versão utilize
     * active em vez de status.
     */
    if (
      result.error &&
      /status/i.test(
        result.error.message
      )
    ) {
      delete payload.status;
      payload.active = true;

      result = await supabase
        .from("oh_memberships")
        .insert(payload)
        .select("*")
        .single();
    }

    if (result.error) {
      throw new Error(
        `Erro criando membership: ${result.error.message}`
      );
    }

    membership =
      result.data;

    console.log(
      `OK - membership criado: ${membership.id}`
    );

    console.log(
      `OK - organization_id: ${membership.organization_id}`
    );
  } else {
    console.log("");
    console.log(
      `OK - membership existente: ${membership.id}`
    );
  }

  const patch = {};

  if (
    Object.prototype.hasOwnProperty.call(
      membership,
      "role_id"
    ) &&
    membership.role_id !== roleId
  ) {
    patch.role_id = roleId;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      membership,
      "status"
    ) &&
    membership.status !== "active"
  ) {
    patch.status = "active";
  }

  if (
    Object.prototype.hasOwnProperty.call(
      membership,
      "active"
    ) &&
    membership.active !== true
  ) {
    patch.active = true;
  }

  /*
   * Se agenda_viva_profile estiver armazenado diretamente
   * no membership, acrescentamos Recepção sem retirar
   * funções que já estejam cadastradas.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      membership,
      "agenda_viva_profile"
    )
  ) {
    const current =
      membership.agenda_viva_profile;

    if (Array.isArray(current)) {
      if (
        !current.some(isRecepcao)
      ) {
        patch.agenda_viva_profile = [
          ...current,
          "Recepção",
        ];
      }
    } else if (
      typeof current === "string" &&
      current.trim()
    ) {
      if (!isRecepcao(current)) {
        console.warn(
          `ATENÇÃO: agenda_viva_profile atual é "${current}".`
        );

        console.warn(
          "O script não sobrescreverá esse perfil automaticamente."
        );
      }
    } else {
      patch.agenda_viva_profile = [
        "Recepção",
      ];
    }
  }

  /*
   * Compatibilidade com versões que armazenam módulos
   * diretamente no membership.
   */
  const desiredModules = [
    "agenda-viva",
    "atendimento-em-harmonia",
    "corrente-em-dia",
  ];

  for (const field of [
    "modules",
    "enabled_modules",
    "module_slugs",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        membership,
        field
      ) &&
      Array.isArray(
        membership[field]
      )
    ) {
      patch[field] =
        uniqueStrings([
          ...membership[field],
          ...desiredModules,
        ]);
    }
  }

  if (
    Object.keys(patch).length > 0
  ) {
    const { error } = await supabase
      .from("oh_memberships")
      .update(patch)
      .eq("id", membership.id);

    if (error) {
      throw new Error(
        `Erro atualizando membership: ${error.message}`
      );
    }

    membership = {
      ...membership,
      ...patch,
    };
  }

  console.log(
    `OK - membership final: ${membership.id}`
  );

  return membership;
}

async function ensureAgendaVivaProfile(
  personId
) {
  /*
   * Em algumas versões do OeH o perfil operacional fica
   * em tabela própria.
   *
   * Se ela não existir, simplesmente seguimos, pois o
   * membership pode ser a fonte vigente.
   */
  const { data, error } =
    await supabase
      .from(
        "oh_agenda_viva_profiles"
      )
      .select("*")
      .eq("person_id", personId)
      .limit(20);

  if (error) {
    const text =
      error.message.toLowerCase();

    if (
      text.includes(
        "does not exist"
      ) ||
      text.includes(
        "could not find"
      ) ||
      text.includes(
        "schema cache"
      )
    ) {
      return;
    }

    throw new Error(
      `Erro consultando perfil da Agenda Viva: ${error.message}`
    );
  }

  const rows =
    data ?? [];

  const alreadyRecepcao =
    rows.some((row) =>
      [
        row.profile,
        row.function,
        row.function_name,
        row.role,
        row.role_name,
        row.name,
        row.slug,
      ].some(isRecepcao)
    );

  if (alreadyRecepcao) {
    console.log(
      "OK - função Recepção já presente na Agenda Viva."
    );

    return;
  }

  /*
   * Não fazemos insert às cegas porque não sabemos qual
   * coluna identifica a função nesta instalação.
   *
   * Se a tabela existir e não houver Recepção,
   * mostramos isso claramente.
   */
  console.warn(
    "ATENÇÃO: tabela oh_agenda_viva_profiles existe, mas a função Recepção não foi localizada."
  );

  console.warn(
    "Confira o resultado final antes de considerar o provisionamento concluído."
  );
}

async function listAuthUsers() {
  const users = [];
  let page = 1;

  while (page <= 20) {
    const { data, error } =
      await supabase.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        }
      );

    if (error) {
      throw new Error(
        `Erro consultando Supabase Auth: ${error.message}`
      );
    }

    const batch =
      data?.users ?? [];

    users.push(...batch);

    if (batch.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

function authPhoneMatches(user) {
  const target =
    onlyDigits(TARGET.whatsapp);

  const phone =
    onlyDigits(user?.phone);

  return (
    phone === target ||
    phone === `55${target}` ||
    `55${phone}` === target
  );
}

async function ensureAuth(person) {
  const users =
    await listAuthUsers();

  let user =
    users.find(authPhoneMatches) ??
    users.find(
      (item) =>
        String(
          item?.user_metadata
            ?.person_id ?? ""
        ) ===
        String(person.id)
    ) ??
    null;

  const phone =
    `+55${onlyDigits(
      TARGET.whatsapp
    )}`;

  if (!user) {
    console.log(
      "Usuário Auth ainda não existe. Criando..."
    );

    const { data, error } =
      await supabase.auth.admin.createUser(
        {
          phone,
          password: PASSWORD,
          phone_confirm: true,
          user_metadata: {
            person_id: person.id,
            full_name:
              TARGET.fullName,
          },
        }
      );

    if (error) {
      throw new Error(
        `Erro criando usuário Auth: ${error.message}`
      );
    }

    user = data.user;

    console.log(
      `OK - usuário Auth criado: ${user.id}`
    );

    return user;
  }

  const metadata = {
    ...(user.user_metadata ?? {}),
    person_id: person.id,
    full_name:
      user.user_metadata
        ?.full_name ||
      TARGET.fullName,
  };

  const { data, error } =
    await supabase.auth.admin
      .updateUserById(
        user.id,
        {
          phone,
          password: PASSWORD,
          phone_confirm: true,
          user_metadata:
            metadata,
        }
      );

  if (error) {
    throw new Error(
      `Erro atualizando usuário Auth: ${error.message}`
    );
  }

  console.log(
    `OK - usuário Auth atualizado: ${data.user.id}`
  );

  return data.user;
}

async function main() {
  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    "TUCXA - Provisionamento Patricia - Agendamento 27"
  );

  console.log(
    "=============================================="
  );

  const person =
    await ensurePerson();

  console.log("");

  console.log(
    `Pessoa: ${person.full_name}`
  );

  console.log(
    `ID: ${person.id}`
  );

  console.log(
    `WhatsApp: ${onlyDigits(
      person.whatsapp
    )}`
  );

  const membership =
    await ensureMembership(person);

  await ensureAgendaVivaProfile(
    person.id
  );

  const authUser =
    await ensureAuth(person);

  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    "CONFERÊNCIA FINAL"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Pessoa........: ${person.full_name}`
  );

  console.log(
    `Person ID.....: ${person.id}`
  );

  console.log(
    `WhatsApp......: ${onlyDigits(
      person.whatsapp
    )}`
  );

  console.log(
    `Membership....: ${
      membership?.id ?? "NÃO"
    }`
  );

  console.log(
    `Organization..: ${
      membership?.organization_id ??
      "NÃO"
    }`
  );

  console.log(
    `Auth..........: ${
      authUser?.id ?? "NÃO"
    }`
  );

  console.log(
    "Senha.........: redefinida para TUCXA_PATRICIA_PASSWORD"
  );

  console.log("");

  console.log(
    "Provisionamento executado."
  );

  console.log(
    "Teste agora o login da Patricia no painel de Agendamento."
  );
}

main().catch((error) => {
  console.error("");

  console.error(
    "ERRO NO PROVISIONAMENTO DA PATRICIA"
  );

  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});