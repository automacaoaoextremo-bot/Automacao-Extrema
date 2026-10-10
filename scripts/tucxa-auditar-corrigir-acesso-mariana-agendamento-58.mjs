import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

/*
 * TUCXA - Agendamento Piloto - Ajuste 58
 * Auditoria e reparo controlado do acesso da Mariana pelo CELULAR.
 *
 * Alvo do reparo:
 *   Mariana Ferreira
 *   19 99153-2076 -> 19991532076
 *
 * Pessoa que DEVE permanecer separada e nunca pode ser fundida com o alvo:
 *   Mariana Mattano da Silva
 *   19 99321-3935 -> 19993213935
 *   marianamattanosilva@gmail.com
 *
 * Princípios:
 * - celular normalizado é a chave canônica de identificação;
 * - nomes nunca são usados para escolher a pessoa;
 * - a senha atual NÃO é lida, alterada ou redefinida;
 * - por padrão o script é somente AUDITORIA;
 * - APPLY exige correspondências não ambíguas da pessoa alvo, membership e Auth;
 * - Mariana Mattano é procurada por celular e pelo e-mail exato apenas para proteção;
 * - a ausência de Mariana Mattano não bloqueia a AUDITORIA do alvo;
 * - este script nunca cria nem altera o cadastro de Mariana Mattano;
 * - se houver qualquer conflito, o script interrompe sem tentar "adivinhar".
 *
 * Auditoria:
 *   node .\scripts\tucxa-auditar-corrigir-acesso-mariana-agendamento-58.mjs
 *
 * Aplicação, somente após conferir a auditoria:
 *
 *   $env:TUCXA_MARIANA_FIX_APPLY="YES"
 *   node .\scripts\tucxa-auditar-corrigir-acesso-mariana-agendamento-58.mjs
 *   Remove-Item Env:TUCXA_MARIANA_FIX_APPLY
 */

const ROOT = process.cwd();

const APPLY = /^(1|true|yes|sim)$/i.test(
  String(process.env.TUCXA_MARIANA_FIX_APPLY ?? ""),
);

const TARGET_PHONE = "19991532076";
const TARGET_NAME = "Mariana Ferreira";

const GUARD_PHONE = "19993213935";
const GUARD_EMAIL = "marianamattanosilva@gmail.com";

const DEFAULT_MODULE_SLUGS = [
  "agenda-viva",
  "atendimento-em-harmonia",
  "corrente-em-dia",
];

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

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL não encontrada.",
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY não encontrada.",
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
  },
);

function asText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function onlyDigits(value) {
  return String(value ?? "")
    .replace(/\D/g, "");
}

function normalizePhone(value) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "";
  }

  const withoutCountry =
    digits.startsWith("55") &&
    digits.length > 11
      ? digits.slice(2)
      : digits;

  return withoutCountry.length > 11
    ? withoutCountry.slice(-11)
    : withoutCountry;
}

function asRecord(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function maskPhone(value) {
  const phone = normalizePhone(value);

  if (phone.length < 8) {
    return phone || "(vazio)";
  }

  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

function maskEmail(value) {
  const email =
    asText(value).toLowerCase();

  if (!email.includes("@")) {
    return email || "(vazio)";
  }

  const [local, domain] =
    email.split("@");

  return `${local.slice(0, 2)}***@${domain}`;
}

async function getOrganization() {
  const { data, error } =
    await supabase
      .from("oh_organizations")
      .select("id, name, slug")
      .limit(500);

  if (error) {
    throw new Error(
      `Erro em oh_organizations: ${error.message}`,
    );
  }

  const org =
    (data ?? []).find(
      (row) =>
        normalizeText(row.slug) ===
        "tucxa",
    ) ??
    (data ?? []).find(
      (row) =>
        normalizeText(row.name)
          .includes("tucxa"),
    ) ??
    null;

  if (!org?.id) {
    throw new Error(
      "Organização TUCXA não encontrada.",
    );
  }

  return org;
}

async function listPeople(
  organizationId,
) {
  const { data, error } =
    await supabase
      .from("oh_people")
      .select("*")
      .eq(
        "organization_id",
        organizationId,
      )
      .limit(10000);

  if (error) {
    throw new Error(
      `Erro em oh_people: ${error.message}`,
    );
  }

  return data ?? [];
}

async function listMemberships(
  organizationId,
  personId,
) {
  const { data, error } =
    await supabase
      .from("oh_memberships")
      .select("*")
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "person_id",
        personId,
      )
      .order(
        "updated_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw new Error(
      `Erro em oh_memberships: ${error.message}`,
    );
  }

  return data ?? [];
}

async function listRoles(
  organizationId,
) {
  const { data, error } =
    await supabase
      .from("oh_roles")
      .select(
        "id, slug, name",
      )
      .eq(
        "organization_id",
        organizationId,
      );

  if (error) {
    throw new Error(
      `Erro em oh_roles: ${error.message}`,
    );
  }

  return data ?? [];
}

async function listAuthUsers() {
  const users = [];

  for (
    let page = 1;
    page <= 100;
    page += 1
  ) {
    const { data, error } =
      await supabase
        .auth
        .admin
        .listUsers({
          page,
          perPage: 1000,
        });

    if (error) {
      throw new Error(
        `Erro listando Supabase Auth: ${error.message}`,
      );
    }

    const batch =
      data?.users ?? [];

    users.push(
      ...batch,
    );

    if (
      batch.length < 1000
    ) {
      break;
    }
  }

  return users;
}

function peopleByPhone(
  people,
  phone,
) {
  const wanted =
    normalizePhone(phone);

  return people.filter(
    (person) =>
      normalizePhone(
        person.whatsapp,
      ) === wanted,
  );
}

function peopleByEmail(
  people,
  email,
) {
  const wanted =
    asText(email)
      .toLowerCase();

  if (!wanted) {
    return [];
  }

  return people.filter(
    (person) => {
      const primary =
        asText(
          person.email,
        ).toLowerCase();

      const notification =
        asText(
          person.notification_email,
        ).toLowerCase();

      return (
        primary === wanted ||
        notification === wanted
      );
    },
  );
}

function uniquePeople(
  rows,
) {
  const byId =
    new Map();

  for (
    const row
    of rows ?? []
  ) {
    if (row?.id) {
      byId.set(
        String(row.id),
        row,
      );
    }
  }

  return [
    ...byId.values(),
  ];
}

function chooseCanonicalAuth({
  person,
  authUsers,
}) {
  /*
   * Prioridade:
   *
   * 1. auth_user_id já vinculado em oh_people;
   * 2. metadata.person_id do Auth;
   * 3. telefone do Auth;
   * 4. e-mail da pessoa.
   *
   * Em qualquer ambiguidade o script interrompe.
   */

  const byLinkedId =
    person.auth_user_id
      ? authUsers.filter(
          (user) =>
            user.id ===
            person.auth_user_id,
        )
      : [];

  const byPersonMetadata =
    authUsers.filter(
      (user) =>
        String(
          user
            ?.user_metadata
            ?.person_id ??
            "",
        ) ===
        String(
          person.id,
        ),
    );

  const byPhone =
    authUsers.filter(
      (user) =>
        normalizePhone(
          user.phone,
        ) ===
        TARGET_PHONE,
    );

  const personEmail =
    asText(
      person.email,
    ).toLowerCase();

  const byEmail =
    personEmail
      ? authUsers.filter(
          (user) =>
            asText(
              user.email,
            ).toLowerCase() ===
            personEmail,
        )
      : [];

  const groups = [
    [
      "auth_user_id",
      byLinkedId,
    ],
    [
      "metadata.person_id",
      byPersonMetadata,
    ],
    [
      "telefone",
      byPhone,
    ],
    [
      "e-mail",
      byEmail,
    ],
  ];

  for (
    const [
      source,
      matches,
    ]
    of groups
  ) {
    if (
      matches.length > 1
    ) {
      throw new Error(
        `Mais de um Auth encontrado por ${source}. ` +
          "Interrompido para evitar associação indevida.",
      );
    }

    if (
      matches.length === 1
    ) {
      const auth =
        matches[0];

      const metadataPersonId =
        String(
          auth
            ?.user_metadata
            ?.person_id ??
            "",
        );

      if (
        metadataPersonId &&
        metadataPersonId !==
          String(
            person.id,
          )
      ) {
        throw new Error(
          `O Auth escolhido por ${source} já aponta para outro ` +
            `person_id (${metadataPersonId}).`,
        );
      }

      return {
        auth,
        source,
      };
    }
  }

  return {
    auth: null,
    source: "nenhum",
  };
}

function chooseMembership(
  memberships,
  rolesById,
) {
  if (
    !memberships.length
  ) {
    return null;
  }

  const scored =
    memberships.map(
      (
        membership,
        index,
      ) => {
        const roleSlug =
          normalizeText(
            rolesById.get(
              String(
                membership.role_id,
              ),
            )?.slug,
          );

        const profile =
          asRecord(
            membership
              .agenda_viva_profile,
          );

        let score = 0;

        if (
          roleSlug ===
          "filho-da-corrente"
        ) {
          score += 100;
        }

        if (
          roleSlug ===
          "membro"
        ) {
          score += 50;
        }

        if (
          membership.active ===
          true
        ) {
          score += 20;
        }

        if (
          normalizeText(
            membership.status,
          ) === "ativo"
        ) {
          score += 20;
        }

        if (
          normalizeText(
            profile.source,
          ).includes(
            "primeiro_acesso",
          )
        ) {
          score += 10;
        }

        return {
          membership,
          score,
          index,
          roleSlug,
        };
      },
    );

  scored.sort(
    (a, b) =>
      b.score -
        a.score ||
      a.index -
        b.index,
  );

  return scored[0];
}

function printPerson(
  label,
  person,
) {
  console.log(
    `${label}:`,
  );

  console.log(
    `  id.............: ${
      person?.id ??
      "NÃO ENCONTRADO"
    }`,
  );

  console.log(
    `  nome...........: ${
      person
        ?.full_name ??
      ""
    }`,
  );

  console.log(
    `  whatsapp.......: ${
      person
        ? normalizePhone(
            person.whatsapp,
          )
        : ""
    }`,
  );

  console.log(
    `  email..........: ${
      person
        ? maskEmail(
            person.email,
          )
        : ""
    }`,
  );

  console.log(
    `  active.........: ${
      person
        ?.active ??
      ""
    }`,
  );

  console.log(
    `  auth_user_id...: ${
      person
        ?.auth_user_id ??
      ""
    }`,
  );
}

async function main() {
  console.log("");

  console.log(
    "============================================================",
  );

  console.log(
    "TUCXA - Ajuste 58 - Acesso Mariana por celular",
  );

  console.log(
    `Modo: ${
      APPLY
        ? "APLICAÇÃO"
        : "AUDITORIA - nenhuma alteração será feita"
    }`,
  );

  console.log(
    "============================================================",
  );

  const org =
    await getOrganization();

  const [
    people,
    roles,
    authUsers,
  ] =
    await Promise.all([
      listPeople(
        org.id,
      ),
      listRoles(
        org.id,
      ),
      listAuthUsers(),
    ]);

  console.log(
    `Organização.....: ${org.name} (${org.id})`,
  );

  console.log(
    `Nome alvo.......: ${TARGET_NAME}`,
  );

  console.log(
    `Celular alvo....: ${TARGET_PHONE}`,
  );

  console.log(
    `Celular protegido: ${GUARD_PHONE}`,
  );

  console.log("");

  /*
   * Mariana Ferreira:
   * exclusivamente pelo celular.
   */

  const targetMatches =
    peopleByPhone(
      people,
      TARGET_PHONE,
    );

  /*
   * Mariana Mattano:
   * apenas para proteção contra mistura de registros.
   */

  const guardPhoneMatches =
    peopleByPhone(
      people,
      GUARD_PHONE,
    );

  const guardEmailMatches =
    peopleByEmail(
      people,
      GUARD_EMAIL,
    );

  const guardCandidates =
    uniquePeople([
      ...guardPhoneMatches,
      ...guardEmailMatches,
    ]);

  console.log(
    `Cadastros para ${TARGET_PHONE}: ${targetMatches.length}`,
  );

  for (
    const person
    of targetMatches
  ) {
    printPerson(
      "  Alvo",
      person,
    );
  }

  console.log("");

  console.log(
    `Cadastros para ${GUARD_PHONE}: ${guardPhoneMatches.length}`,
  );

  for (
    const person
    of guardPhoneMatches
  ) {
    printPerson(
      "  Mariana Mattano por celular",
      person,
    );
  }

  console.log(
    `Cadastros para ${GUARD_EMAIL}: ${guardEmailMatches.length}`,
  );

  for (
    const person
    of guardEmailMatches
  ) {
    printPerson(
      "  Mariana Mattano por e-mail",
      person,
    );
  }

  /*
   * O alvo precisa ser inequívoco.
   */

  if (
    targetMatches.length !==
    1
  ) {
    throw new Error(
      `Esperado exatamente 1 cadastro para ${TARGET_PHONE}; ` +
        `encontrados ${targetMatches.length}.`,
    );
  }

  /*
   * Mariana Mattano pode estar ausente.
   * Mas, se houver mais de um cadastro associado aos dados informados,
   * interrompemos para não correr risco de mistura.
   */

  if (
    guardCandidates.length >
    1
  ) {
    throw new Error(
      "Mais de um cadastro diferente foi encontrado para Mariana Mattano " +
        "por celular/e-mail. Interrompido para evitar qualquer associação indevida.",
    );
  }

  const target =
    targetMatches[0];

  const guard =
    guardCandidates[0] ??
    null;

  /*
   * Nunca aceitar que alvo e pessoa protegida sejam a mesma linha.
   */

  if (
    guard &&
    String(
      target.id,
    ) ===
      String(
        guard.id,
      )
  ) {
    throw new Error(
      "O cadastro alvo e Mariana Mattano apontam para o mesmo person_id. " +
        "Não aplicar automaticamente.",
    );
  }

  /*
   * Também não aceitar dados conhecidos da Mariana Mattano na pessoa alvo.
   */

  if (
    asText(
      target.email,
    ).toLowerCase() ===
      GUARD_EMAIL ||
    asText(
      target.notification_email,
    ).toLowerCase() ===
      GUARD_EMAIL ||
    normalizePhone(
      target.whatsapp,
    ) ===
      GUARD_PHONE
  ) {
    throw new Error(
      "O cadastro alvo está misturado com os dados da Mariana Mattano.",
    );
  }

  if (!guard) {
    console.warn("");

    console.warn(
      "ATENÇÃO: Mariana Mattano não foi localizada nem pelo celular informado nem pelo e-mail exato.",
    );

    console.warn(
      "O reparo da Mariana Ferreira pode prosseguir separadamente. " +
        "Este script NÃO criará nem alterará cadastro da Mariana Mattano.",
    );
  } else {
    const guardPhone =
      normalizePhone(
        guard.whatsapp,
      );

    const guardPrimaryEmail =
      asText(
        guard.email,
      ).toLowerCase();

    const guardNotificationEmail =
      asText(
        guard.notification_email,
      ).toLowerCase();

    if (
      guardPhone &&
      guardPhone !==
        GUARD_PHONE
    ) {
      console.warn(
        `ATENÇÃO: Mariana Mattano foi localizada por e-mail, ` +
          `mas o celular atual é ${maskPhone(
            guard.whatsapp,
          )}.`,
      );
    }

    if (
      guardPrimaryEmail !==
        GUARD_EMAIL &&
      guardNotificationEmail !==
        GUARD_EMAIL
    ) {
      console.warn(
        "ATENÇÃO: o cadastro localizado por celular não possui " +
          "o e-mail informado em email/notification_email.",
      );
    }
  }

  /*
   * Membership da Mariana Ferreira.
   */

  const memberships =
    await listMemberships(
      org.id,
      target.id,
    );

  const rolesById =
    new Map(
      roles.map(
        (role) => [
          String(
            role.id,
          ),
          role,
        ],
      ),
    );

  const selectedMembership =
    chooseMembership(
      memberships,
      rolesById,
    );

  console.log("");

  console.log(
    `Memberships do alvo: ${memberships.length}`,
  );

  memberships.forEach(
    (
      membership,
      index,
    ) => {
      const role =
        rolesById.get(
          String(
            membership.role_id,
          ),
        );

      const profile =
        asRecord(
          membership
            .agenda_viva_profile,
        );

      console.log(
        `  [${index + 1}] id=${membership.id}`,
      );

      console.log(
        `      role=${
          role?.slug ??
          membership.role_id ??
          ""
        }`,
      );

      console.log(
        `      active=${membership.active}`,
      );

      console.log(
        `      status=${membership.status ?? ""}`,
      );

      console.log(
        `      validationStatus=${profile.validationStatus ?? ""}`,
      );

      console.log(
        `      source=${profile.source ?? ""}`,
      );

      console.log(
        `      updated_at=${membership.updated_at ?? ""}`,
      );
    },
  );

  if (
    !selectedMembership
      ?.membership
      ?.id
  ) {
    throw new Error(
      "Nenhum membership existente foi localizado para Mariana Ferreira. " +
        "O script não criará um membership do zero para preservar funções e histórico.",
    );
  }

  console.log(
    `Membership escolhido: ${selectedMembership.membership.id} ` +
      `(role=${selectedMembership.roleSlug || "?"}, ` +
      `score=${selectedMembership.score})`,
  );

  /*
   * Auth existente.
   *
   * Não criaremos novo Auth, pois ela já trocou a senha.
   */

  const {
    auth,
    source: authSource,
  } =
    chooseCanonicalAuth({
      person: target,
      authUsers,
    });

  if (!auth?.id) {
    throw new Error(
      "Nenhum Supabase Auth existente foi localizado com segurança. " +
        "Como a senha atual deve ser preservada, o script não criará outro usuário Auth.",
    );
  }

  console.log("");

  console.log(
    `Auth escolhido por: ${authSource}`,
  );

  console.log(
    `  id.............: ${auth.id}`,
  );

  console.log(
    `  email..........: ${maskEmail(auth.email)}`,
  );

  console.log(
    `  phone..........: ${maskPhone(auth.phone)}`,
  );

  console.log(
    `  metadata person: ${
      auth
        ?.user_metadata
        ?.person_id ??
      ""
    }`,
  );

  console.log(
    `  metadata nome..: ${
      auth
        ?.user_metadata
        ?.full_name ??
      ""
    }`,
  );

  console.log(
    `  access status..: ${
      auth
        ?.user_metadata
        ?.oh_access_status ??
      ""
    }`,
  );

  /*
   * Proteção adicional:
   * nunca usar o mesmo Auth da eventual Mariana Mattano.
   */

  if (
    guard
      ?.auth_user_id &&
    String(
      guard.auth_user_id,
    ) ===
      String(
        auth.id,
      )
  ) {
    throw new Error(
      "O mesmo Auth está vinculado também à Mariana Mattano protegida. " +
        "Interrompido.",
    );
  }

  const membership =
    selectedMembership
      .membership;

  const profile =
    asRecord(
      membership
        .agenda_viva_profile,
    );

  /*
   * O nome também passa a fazer parte do reparo da pessoa.
   */

  const needsPersonRepair =
    asText(
      target.full_name,
    ) !==
      TARGET_NAME ||
    normalizePhone(
      target.whatsapp,
    ) !==
      TARGET_PHONE ||
    target.active !==
      true ||
    String(
      target.auth_user_id ??
      "",
    ) !==
      String(
        auth.id,
      );

  const needsMembershipRepair =
    membership.active !==
      true ||
    normalizeText(
      membership.status,
    ) !==
      "ativo" ||
    normalizeText(
      profile.validationStatus,
    ) !==
      "ativo";

  /*
   * Incluímos também o nome completo nesta verificação.
   */

  const needsAuthMetadataRepair =
    String(
      auth
        ?.user_metadata
        ?.person_id ??
      "",
    ) !==
      String(
        target.id,
      ) ||
    asText(
      auth
        ?.user_metadata
        ?.full_name,
    ) !==
      TARGET_NAME ||
    normalizeText(
      auth
        ?.user_metadata
        ?.oh_profile,
    ) !==
      "filho-da-corrente" ||
    normalizeText(
      auth
        ?.user_metadata
        ?.oh_access_status,
    ) !==
      "ativo" ||
    normalizePhone(
      auth
        ?.user_metadata
        ?.whatsapp,
    ) !==
      TARGET_PHONE;

  console.log("");

  console.log(
    "Plano:",
  );

  console.log(
    `  pessoa.........: ${
      needsPersonRepair
        ? "CORRIGIR"
        : "OK"
    }`,
  );

  console.log(
    `  membership.....: ${
      needsMembershipRepair
        ? "CORRIGIR"
        : "OK"
    }`,
  );

  console.log(
    `  metadata Auth..: ${
      needsAuthMetadataRepair
        ? "CORRIGIR"
        : "OK"
    }`,
  );

  console.log(
    "  senha Auth.....: PRESERVAR - nenhuma alteração",
  );

  console.log(
    `  nome final.....: ${TARGET_NAME}`,
  );

  console.log(
    `  Mariana Mattano: ${
      guard
        ? "LOCALIZADA E PRESERVADA - nenhuma alteração"
        : "NÃO LOCALIZADA - tratar separadamente"
    }`,
  );

  /*
   * Modo padrão:
   * nenhuma alteração.
   */

  if (!APPLY) {
    console.log("");

    console.log(
      "============================================================",
    );

    console.log(
      "AUDITORIA CONCLUÍDA - NADA FOI ALTERADO",
    );

    console.log(
      'Após conferir os IDs, execute novamente com $env:TUCXA_MARIANA_FIX_APPLY="YES".',
    );

    console.log(
      "============================================================",
    );

    return;
  }

  /*
   * APLICAÇÃO
   */

  const now =
    new Date()
      .toISOString();

  /*
   * Pessoa:
   * - nome correto;
   * - celular canônico;
   * - ativa;
   * - Auth correto.
   */

  if (
    needsPersonRepair
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "oh_people",
        )
        .update({
          full_name:
            TARGET_NAME,
          whatsapp:
            TARGET_PHONE,
          active:
            true,
          auth_user_id:
            auth.id,
          updated_at:
            now,
        })
        .eq(
          "id",
          target.id,
        )
        .eq(
          "organization_id",
          org.id,
        );

    if (error) {
      throw new Error(
        `Falha corrigindo oh_people: ${error.message}`,
      );
    }
  }

  /*
   * Membership:
   * só será alterado se realmente estiver inconsistente.
   *
   * No diagnóstico atual ele já está OK.
   */

  if (
    needsMembershipRepair
  ) {
    const nextProfile = {
      ...profile,
      validationStatus:
        "ativo",
      accessRepairAt:
        now,
      accessRepairSource:
        "tucxa_agendamento_58_mariana_phone_key",
    };

    const {
      error,
    } =
      await supabase
        .from(
          "oh_memberships",
        )
        .update({
          active:
            true,
          status:
            "ativo",

          module_slugs:
            Array.isArray(
              membership.module_slugs,
            ) &&
            membership
              .module_slugs
              .length
              ? membership
                  .module_slugs
              : DEFAULT_MODULE_SLUGS,

          agenda_viva_profile:
            nextProfile,

          updated_at:
            now,
        })
        .eq(
          "id",
          membership.id,
        )
        .eq(
          "organization_id",
          org.id,
        )
        .eq(
          "person_id",
          target.id,
        );

    if (error) {
      throw new Error(
        `Falha corrigindo oh_memberships: ${error.message}`,
      );
    }
  }

  /*
   * Supabase Auth:
   *
   * IMPORTANTE:
   * - atualizamos SOMENTE user_metadata;
   * - NÃO enviamos password;
   * - NÃO alteramos e-mail;
   * - NÃO alteramos phone;
   *
   * Portanto a senha que Mariana já escolheu permanece intacta.
   */

  if (
    needsAuthMetadataRepair
  ) {
    const nextMetadata = {
      ...(
        auth.user_metadata ??
        {}
      ),

      person_id:
        target.id,

      full_name:
        TARGET_NAME,

      whatsapp:
        TARGET_PHONE,

      organization_id:
        org.id,

      oh_profile:
        "filho-da-corrente",

      oh_access_status:
        "ativo",

      access_repair_at:
        now,

      access_repair_source:
        "tucxa_agendamento_58_mariana_phone_key",
    };

    const {
      error,
    } =
      await supabase
        .auth
        .admin
        .updateUserById(
          auth.id,
          {
            user_metadata:
              nextMetadata,
          },
        );

    if (error) {
      throw new Error(
        `Falha corrigindo metadata Auth: ${error.message}`,
      );
    }
  }

  console.log("");

  console.log(
    "============================================================",
  );

  console.log(
    "AJUSTE 58 APLICADO COM SUCESSO",
  );

  console.log(
    `Person ID......: ${target.id}`,
  );

  console.log(
    `Membership.....: ${membership.id}`,
  );

  console.log(
    `Auth ID........: ${auth.id}`,
  );

  console.log(
    `Nome...........: ${TARGET_NAME}`,
  );

  console.log(
    `Celular........: ${TARGET_PHONE}`,
  );

  console.log(
    "Senha..........: PRESERVADA",
  );

  console.log(
    `Mariana Mattano: ${
      guard
        ? `${guard.id} - PRESERVADA`
        : "NÃO LOCALIZADA - nenhuma alteração feita"
    }`,
  );

  console.log(
    "============================================================",
  );
}

main().catch(
  (error) => {
    console.error("");

    console.error(
      "ERRO NO AJUSTE 58",
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode =
      1;
  },
);